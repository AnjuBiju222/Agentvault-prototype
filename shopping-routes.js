"use strict";
const crypto = require("node:crypto");
const { planShoppingRequest } = require("./shopping-planner");

function installShoppingRoutes({
  app,
  db,
  shops,
  verifier,
  facilitator,
  upstream,
  performPurchase,
  publicOrder,
}) {
  db.exec(`CREATE TABLE IF NOT EXISTS shopping_plans (
    id TEXT PRIMARY KEY, session_id TEXT NOT NULL, content TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft', approval TEXT, selection TEXT,
    message TEXT, created_at INTEGER NOT NULL, expires_at INTEGER NOT NULL
  )`);
  db.prepare(
    "UPDATE shopping_plans SET status = 'review', message = 'The app restarted during checkout. Review completed receipts before making another request.' WHERE status = 'executing'",
  ).run();
  const owned = (id, profile) =>
    db
      .prepare("SELECT * FROM shopping_plans WHERE id = ? AND session_id = ?")
      .get(id, profile.session_id);
  function publicPlan(row) {
    const content = JSON.parse(row.content);
    const selectedItems = row.selection
      ? JSON.parse(row.selection)
      : content.items;
    const orders = db
      .prepare(
        "SELECT * FROM operations WHERE session_id = ? AND request_key GLOB ? ORDER BY created_at, rowid",
      )
      .all(row.session_id, row.id + ":*")
      .map(publicOrder);
    return {
      ...content,
      id: row.id,
      status: row.status,
      message: row.message,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      selectedItems,
      orders,
      totalCents: selectedItems.reduce(
        (sum, item) => sum + item.priceCents * item.quantity,
        0,
      ),
      walletChargeCents: selectedItems.reduce(
        (sum, item) =>
          sum + (item.payment ? item.priceCents * item.quantity : 0),
        0,
      ),
    };
  }
  function listPlans(profile) {
    return db
      .prepare(
        "SELECT * FROM shopping_plans WHERE session_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 10",
      )
      .all(profile.session_id)
      .map(publicPlan);
  }
  async function catalogs() {
    const results = await Promise.allSettled(
      shops.map((shop) => upstream(shop, "/catalog")),
    );
    return shops.map((shop, i) => ({
      id: shop.id,
      name: shop.name,
      payment: shop.payment,
      online: results[i].status === "fulfilled",
      products:
        results[i].status === "fulfilled"
          ? Object.entries(results[i].value).map(([sku, product]) => ({
              ...product,
              sku,
            }))
          : [],
    }));
  }
  app.get("/api/shopping/plans", (req, res) =>
    res.json({ plans: listPlans(req.profile) }),
  );
  app.get("/api/shopping/plans/:id", (req, res) => {
    const row = owned(req.params.id, req.profile);
    if (!row)
      return res.status(404).json({ error: "Shopping request not found." });
    res.json({ plan: publicPlan(row) });
  });
  app.post("/api/shopping/plans", async (req, res) => {
    const prompt = req.body?.prompt;
    if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 1200)
      return res
        .status(400)
        .json({ error: "Describe what you need in 1 to 1,200 characters." });
    const merchants = await catalogs();
    const content = planShoppingRequest(prompt, merchants);
    content.offlineShops = merchants
      .filter((m) => !m.online)
      .map((m) => m.name);
    if (!merchants.some((m) => m.online))
      return res
        .status(503)
        .json({
          error: "Both shops are offline. Reconnect them before making a plan.",
        });
    const id = "plan_" + crypto.randomBytes(16).toString("hex");
    const now = Date.now();
    db.prepare(
      "INSERT INTO shopping_plans (id, session_id, content, created_at, expires_at) VALUES (?, ?, ?, ?, ?)",
    ).run(
      id,
      req.profile.session_id,
      JSON.stringify(content),
      now,
      now + 20 * 60_000,
    );
    res.status(201).json({ plan: publicPlan(owned(id, req.profile)) });
  });
  app.post("/api/shopping/plans/:id/cancel", (req, res) => {
    const row = owned(req.params.id, req.profile);
    if (!row)
      return res.status(404).json({ error: "Shopping request not found." });
    if (row.status !== "draft")
      return res
        .status(409)
        .json({
          error: "A request that started checkout cannot be discarded.",
          plan: publicPlan(row),
        });
    db.prepare(
      "UPDATE shopping_plans SET status = 'cancelled', message = 'Discarded before checkout. No purchases were made.' WHERE id = ?",
    ).run(row.id);
    res.json({ plan: publicPlan(owned(row.id, req.profile)) });
  });
  app.post("/api/shopping/plans/:id/confirm", async (req, res) => {
    const p = req.profile;
    let row = owned(req.params.id, p);
    if (!row)
      return res.status(404).json({ error: "Shopping request not found." });
    const content = JSON.parse(row.content);
    const fail = (status, error) =>
      res.status(status).json({ error, plan: publicPlan(owned(row.id, p)) });
    if (!p.active)
      return fail(409, "Create your agent before confirming purchases.");
    if (req.body?.confirmed !== true)
      return fail(
        400,
        "Review the shopping list and explicitly confirm it before checkout.",
      );
    const input = req.body.items;
    if (
      !Array.isArray(input) ||
      !input.length ||
      input.length > content.items.length
    )
      return fail(400, "Select at least one of the matched products.");
    const seen = new Set();
    const selection = [];
    for (const value of input) {
      if (!value || typeof value !== "object")
        return fail(400, "Invalid shopping-list item.");
      const match = content.items.find(
        (item) =>
          item.merchantId === value.merchantId && item.sku === value.sku,
      );
      const key = `${value.merchantId}:${value.sku}`;
      if (
        !match ||
        seen.has(key) ||
        !Number.isSafeInteger(value.quantity) ||
        value.quantity < 1 ||
        value.quantity > 20
      )
        return fail(
          400,
          "Use matched products once each, with whole-number quantities from 1 to 20.",
        );
      seen.add(key);
      selection.push({ ...match, quantity: value.quantity });
    }
    selection.sort((a, b) =>
      `${a.merchantId}:${a.sku}`.localeCompare(`${b.merchantId}:${b.sku}`),
    );
    const units = selection.reduce((sum, item) => sum + item.quantity, 0);
    if (units > 20)
      return fail(400, "A request can contain at most 20 catalog units.");
    const approval = crypto
      .createHash("sha256")
      .update(
        JSON.stringify({
          items: selection.map(({ merchantId, sku, quantity }) => ({
            merchantId,
            sku,
            quantity,
          })),
          acceptMatchedOnly: req.body.acceptMatchedOnly === true,
        }),
      )
      .digest("hex");
    if (row.status !== "draft") {
      if (row.approval !== approval)
        return fail(
          409,
          "This request is already closed or was confirmed with a different selection.",
        );
      return res
        .status(row.status === "executing" ? 202 : 200)
        .json({ plan: publicPlan(row) });
    }
    if (Date.now() >= row.expires_at)
      return fail(
        409,
        "This quote expired. Make a new plan to check current prices.",
      );
    if (content.questions.length) return fail(422, content.questions.join(" "));
    if (content.unmatched.length && req.body.acceptMatchedOnly !== true)
      return fail(
        422,
        "Some requested items could not be matched. Revise the request or explicitly choose to buy only the matched items.",
      );
    const totalCents = selection.reduce(
      (sum, item) => sum + item.priceCents * item.quantity,
      0,
    );
    const walletCents = selection.reduce(
      (sum, item) => sum + (item.payment ? item.priceCents * item.quantity : 0),
      0,
    );
    if (content.budgetCapCents !== null && totalCents > content.budgetCapCents)
      return fail(
        422,
        "This shopping list exceeds the budget in your request. Reduce quantities or make a new request.",
      );
    // Check the complete basket before any payment. A price change requires a new review.
    const shopIds = [...new Set(selection.map((item) => item.merchantId))];
    const liveCatalogs = new Map(
      await Promise.all(
        shopIds.map(async (id) => [
          id,
          await upstream(
            shops.find((s) => s.id === id),
            "/catalog",
          ),
        ]),
      ),
    );
    for (const item of selection) {
      const live = liveCatalogs.get(item.merchantId)?.[item.sku];
      if (!live || live.priceCents !== item.priceCents)
        return fail(
          409,
          "A product or price changed. Create a new plan before approving checkout.",
        );
    }
    const [budget, balances] = await Promise.all([
      upstream(verifier, `/agents/${encodeURIComponent(p.agent_id)}/summary`, {
        headers: { "X-Api-Key": "mk_test_ferreteria" },
      }),
      upstream(facilitator, "/balances"),
    ]);
    // An overlapping confirmation may have completed while the preflight reads ran.
    row = owned(row.id, p);
    if (row.status !== "draft") {
      if (row.approval !== approval)
        return fail(
          409,
          "Another confirmation used a different shopping list.",
        );
      return res
        .status(row.status === "executing" ? 202 : 200)
        .json({ plan: publicPlan(row) });
    }
    if (totalCents > budget.remainingCents)
      return fail(
        422,
        "The complete shopping list exceeds your remaining daily budget. No items were purchased.",
      );
    if (
      selection.some(
        (item) => item.priceCents * item.quantity > budget.maxPerTxCents,
      )
    )
      return fail(
        422,
        "A product line exceeds your per-purchase limit. Reduce its quantity or update Agent settings.",
      );
    const balance = balances.find(
      (account) => account.address === p.agent_id,
    )?.balance;
    const available = balance ? Math.round(parseFloat(balance) * 100) : 0;
    if (walletCents > available)
      return fail(
        422,
        "Your wallet does not have enough demo funds for the complete shopping list. No items were purchased.",
      );
    // The atomic claim closes the race between simultaneous confirmation requests.
    if (
      !db
        .prepare(
          "UPDATE shopping_plans SET status = 'executing', approval = ?, selection = ?, message = 'Your agent is checking out.' WHERE id = ? AND status = 'draft'",
        )
        .run(approval, JSON.stringify(selection), row.id).changes
    ) {
      row = owned(row.id, p);
      if (row.approval !== approval)
        return fail(
          409,
          "Another confirmation used a different shopping list.",
        );
      return res
        .status(row.status === "executing" ? 202 : 200)
        .json({ plan: publicPlan(row) });
    }
    let done = 0;
    let status = "completed";
    let message = `All ${units} catalog units were purchased. View the receipts below.`;
    try {
      outer: for (let line = 0; line < selection.length; line++) {
        const item = selection[line];
        const shop = shops.find((s) => s.id === item.merchantId);
        for (let unit = 0; unit < item.quantity; unit++) {
          const orderId = "ord_" + crypto.randomBytes(10).toString("hex");
          db.prepare(
            `INSERT INTO operations (id, session_id, request_key, kind, merchant_id, merchant, sku, product, amount_cents, status, payment, created_at)
            VALUES (?, ?, ?, 'purchase', ?, ?, ?, ?, ?, 'pending', ?, ?)`,
          ).run(
            orderId,
            p.session_id,
            `${row.id}:${line}:${unit}`,
            shop.id,
            shop.name,
            item.sku,
            item.name,
            item.priceCents,
            Number(item.payment),
            Date.now(),
          );
          const result = await performPurchase(p, orderId, shop, item.sku, {
            name: item.name,
            priceCents: item.priceCents,
          });
          if (result.order.status !== "completed") {
            status =
              result.order.status === "review"
                ? "review"
                : done
                  ? "partial"
                  : result.order.status;
            message = `Completed ${done} of ${units} catalog units. Checkout stopped: ${result.order.message} No further items were attempted. Completed purchases were not reversed.`;
            break outer;
          }
          done++;
        }
      }
    } catch {
      status = "review";
      message = `Completed ${done} of ${units} catalog units before losing confirmation. Review receipts and wallet balances before making another request. No further items were attempted.`;
      db.prepare(
        "UPDATE operations SET status = 'review', message = 'Checkout could not be confirmed. Check settlement before retrying.' WHERE session_id = ? AND request_key GLOB ? AND status = 'pending'",
      ).run(p.session_id, row.id + ":*");
    }
    db.prepare(
      "UPDATE shopping_plans SET status = ?, message = ? WHERE id = ?",
    ).run(status, message, row.id);
    res.json({ plan: publicPlan(owned(row.id, p)) });
  });
  return { listPlans };
}
module.exports = { installShoppingRoutes };
