const express = require("express");
const crypto = require("node:crypto");
const path = require("node:path");
const fs = require("node:fs");
const Database = require("better-sqlite3");
const { signRequest } = require("./httpsig");
const { buildPayment } = require("./x402");
const { installShoppingRoutes } = require("./shopping-routes");
const { dataPath } = require("./storage");
const { hostedAccess } = require("./hosted-access");

const SERVICES = [
  {
    id: "verifier",
    name: "Identity & budgets",
    port: 4000,
    url: "http://127.0.0.1:4000",
    health: "/billing",
  },
  {
    id: "facilitator",
    name: "Payment settlement",
    port: 4001,
    url: "http://127.0.0.1:4001",
    health: "/balances",
  },
  {
    id: "tools",
    name: "Ferretería Online",
    port: 3000,
    url: "http://127.0.0.1:3000",
    health: "/catalog",
    category: "Tools",
    payTo: "ferreteria-online",
    payment: true,
  },
  {
    id: "bakery",
    name: "Panadería La Espiga",
    port: 3001,
    url: "http://127.0.0.1:3001",
    health: "/catalog",
    category: "Bakery",
    payment: false,
  },
];
const shops = SERVICES.filter((s) => s.category);
const verifier = SERVICES[0];
const facilitator = SERVICES[1];

async function upstream(service, route, options = {}) {
  const response = await fetch(service.url + route, {
    ...options,
    signal: AbortSignal.timeout(8000),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.error || `${service.name} returned ${response.status}`,
    );
    error.status = response.status;
    throw error;
  }
  return data;
}
const jsonOptions = (body) => ({
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});
const validMoney = (value) =>
  Number.isSafeInteger(value) && value >= 1 && value <= 1000000;
const publicProfile = (profile) =>
  profile?.active
    ? {
        id: profile.agent_id,
        name: profile.label,
        owner: profile.owner,
        maxPerTxCents: profile.tx_limit,
        maxPerDayCents: profile.day_limit,
        funding: profile.funding,
      }
    : null;
const publicOrder = (row) => ({
  id: row.id,
  kind: row.kind,
  merchantId: row.merchant_id,
  merchant: row.merchant,
  sku: row.sku,
  product: row.product,
  amountCents: row.amount_cents,
  status: row.status,
  message: row.message,
  transaction: row.transaction_id,
  createdAt: row.created_at,
  payment: Boolean(row.payment),
});

function createApp({
  dataDirectory = dataPath(".data"),
  publicOrigin = process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL,
  username = process.env.DEMO_USER || "agentvault",
  password = process.env.DEMO_PASSWORD,
} = {}) {
  fs.mkdirSync(dataDirectory, { recursive: true });
  const db = new Database(path.join(dataDirectory, "dashboard.db"));
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      session_id TEXT PRIMARY KEY, agent_id TEXT UNIQUE NOT NULL,
      private_key TEXT NOT NULL, public_key TEXT NOT NULL,
      label TEXT NOT NULL DEFAULT 'My shopping agent', owner TEXT NOT NULL DEFAULT 'Demo user',
      tx_limit INTEGER NOT NULL DEFAULT 10000, day_limit INTEGER NOT NULL DEFAULT 15000,
      active INTEGER NOT NULL DEFAULT 0, funding TEXT NOT NULL DEFAULT 'unfunded', created_at INTEGER NOT NULL
    );
    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY, session_id TEXT NOT NULL, request_key TEXT NOT NULL,
      kind TEXT NOT NULL, merchant_id TEXT, merchant TEXT, sku TEXT, product TEXT NOT NULL,
      amount_cents INTEGER NOT NULL, status TEXT NOT NULL, message TEXT,
      transaction_id TEXT, payment INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL,
      UNIQUE(session_id, request_key)
    );
  `);
  // A pending operation after a restart has an unknown outcome. Never replay a payment automatically.
  db.prepare(
    "UPDATE operations SET status = 'review', message = 'The app restarted during this request. Check settlement before trying again.' WHERE status = 'pending'",
  ).run();
  const app = express();
  app.disable("x-powered-by");
  const hosted = hostedAccess(app, { publicOrigin, username, password });
  app.use((req, res, next) => {
    if (!hosted && !["localhost", "127.0.0.1", "[::1]"].includes(req.hostname))
      return res
        .status(403)
        .json({ error: "This demo is available on localhost." });
    res.set({
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "same-origin",
    });
    if (req.path.startsWith("/api/")) res.set("Cache-Control", "no-store");
    if (req.method !== "GET" && req.method !== "HEAD") {
      const origin = req.get("Origin");
      if (
        (origin && origin !== (hosted?.origin || `${req.protocol}://${req.get("Host")}`)) ||
        req.get("X-Requested-With") !== "AgentStack"
      ) {
        return res
          .status(403)
          .json({ error: "Open the dashboard to make changes." });
      }
    }
    next();
  });
  app.use(express.json({ limit: "16kb" }));
  app.get("/api/health", (_req, res) =>
    res.json({ ok: true, app: "agent-stack-ui" }),
  );
  app.use("/api", (req, res, next) => {
    const raw = req.headers.cookie
      ?.split(";")
      .map((c) => c.trim())
      .find((c) => c.startsWith("agent_stack_session="))
      ?.slice(20);
    const token =
      raw && /^[a-f0-9]{64}$/.test(raw)
        ? raw
        : crypto.randomBytes(32).toString("hex");
    const sessionId = crypto.createHash("sha256").update(token).digest("hex");
    let profile = db
      .prepare("SELECT * FROM profiles WHERE session_id = ?")
      .get(sessionId);
    if (!profile) {
      const keys = crypto.generateKeyPairSync("ed25519");
      db.prepare(
        "INSERT INTO profiles (session_id, agent_id, private_key, public_key, created_at) VALUES (?, ?, ?, ?, ?)",
      ).run(
        sessionId,
        `web-agent-${crypto.randomBytes(8).toString("hex")}`,
        keys.privateKey.export({ type: "pkcs8", format: "pem" }),
        keys.publicKey.export({ type: "spki", format: "pem" }),
        Date.now(),
      );
      profile = db
        .prepare("SELECT * FROM profiles WHERE session_id = ?")
        .get(sessionId);
    }
    res.cookie("agent_stack_session", token, {
      httpOnly: true,
      secure: Boolean(hosted?.secure),
      sameSite: "strict",
      maxAge: 30 * 86400000,
      path: "/",
    });
    req.profile = profile;
    next();
  });

  app.get("/api/dashboard", async (req, res) => {
    const checks = await Promise.allSettled(
      SERVICES.map((s) => upstream(s, s.health)),
    );
    const byId = Object.fromEntries(
      SERVICES.map((s, i) => [
        s.id,
        checks[i].status === "fulfilled" ? checks[i].value : null,
      ]),
    );
    let budget = null;
    let budgetError = null;
    if (req.profile.active) {
      try {
        budget = await upstream(
          verifier,
          `/agents/${encodeURIComponent(req.profile.agent_id)}/summary`,
          { headers: { "X-Api-Key": "mk_test_ferreteria" } },
        );
      } catch (error) {
        budgetError = error.message;
      }
    }
    const balance = byId.facilitator?.find(
      (a) => a.address === req.profile.agent_id,
    )?.balance;
    const walletCents = byId.facilitator
      ? balance
        ? Math.round(parseFloat(balance) * 100)
        : 0
      : null;
    const orders = db
      .prepare(
        "SELECT * FROM operations WHERE session_id = ? ORDER BY created_at DESC, rowid DESC LIMIT 200",
      )
      .all(req.profile.session_id);
    const stats = db
      .prepare(
        `SELECT
      COUNT(CASE WHEN kind = 'purchase' AND status = 'completed' THEN 1 END) completedPurchases,
      COUNT(DISTINCT CASE WHEN kind = 'purchase' AND status = 'completed' THEN merchant_id END) merchants,
      COALESCE(SUM(CASE WHEN kind = 'purchase' AND status = 'completed' AND payment = 1 THEN amount_cents ELSE 0 END), 0) walletPaymentsCents
      FROM operations WHERE session_id = ?`,
      )
      .get(req.profile.session_id);
    res.json({
      stats,
      shoppingPlans: shopping.listPlans(req.profile),
      agent: publicProfile(req.profile),
      budget,
      budgetError,
      walletCents,
      services: SERVICES.map((s, i) => ({
        id: s.id,
        name: s.name,
        port: s.port,
        online: checks[i].status === "fulfilled",
      })),
      merchants: shops.map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        payment: s.payment,
        online: byId[s.id] !== null,
        products: Object.entries(byId[s.id] || {}).map(([sku, p]) => ({
          sku,
          ...p,
        })),
      })),
      billing: byId.verifier,
      activity: orders.map(publicOrder),
      updatedAt: Date.now(),
    });
  });

  app.post("/api/agent", async (req, res) => {
    const {
      name,
      owner,
      maxPerTxCents = 10000,
      maxPerDayCents = 15000,
    } = req.body;
    if (
      typeof name !== "string" ||
      !name.trim() ||
      name.length > 60 ||
      typeof owner !== "string" ||
      !owner.trim() ||
      owner.length > 60 ||
      !validMoney(maxPerTxCents) ||
      !validMoney(maxPerDayCents) ||
      maxPerTxCents > maxPerDayCents
    ) {
      return res.status(400).json({
        error:
          "Enter a name and owner, with positive limits. The purchase limit cannot exceed the daily limit.",
      });
    }
    const p = req.profile;
    await upstream(
      verifier,
      "/agents/register",
      jsonOptions({
        agentId: p.agent_id,
        publicKeyPem: p.public_key,
        ownerName: owner.trim(),
        maxPerTxCents,
        maxPerDayCents,
      }),
    );
    db.prepare(
      "UPDATE profiles SET active = 1, label = ?, owner = ?, tx_limit = ?, day_limit = ? WHERE session_id = ?",
    ).run(
      name.trim(),
      owner.trim(),
      maxPerTxCents,
      maxPerDayCents,
      p.session_id,
    );
    // Mark before calling the non-idempotent faucet so a lost response cannot fund twice.
    if (
      db
        .prepare(
          "UPDATE profiles SET funding = 'pending' WHERE session_id = ? AND funding = 'unfunded'",
        )
        .run(p.session_id).changes
    ) {
      try {
        await upstream(
          facilitator,
          "/faucet",
          jsonOptions({
            address: p.agent_id,
            publicKeyPem: p.public_key,
            amountCents: 15000,
          }),
        );
        db.prepare(
          "UPDATE profiles SET funding = 'funded' WHERE session_id = ?",
        ).run(p.session_id);
      } catch {
        db.prepare(
          "UPDATE profiles SET funding = 'review' WHERE session_id = ?",
        ).run(p.session_id);
      }
    }
    res.json({
      agent: publicProfile(
        db
          .prepare("SELECT * FROM profiles WHERE session_id = ?")
          .get(p.session_id),
      ),
    });
  });

  function beginOperation(req, res, operation) {
    const requestKey = req.body.requestId;
    if (
      typeof requestKey !== "string" ||
      !/^[a-zA-Z0-9_-]{16,80}$/.test(requestKey)
    ) {
      res.status(400).json({ error: "A valid requestId is required." });
      return null;
    }
    const prior = db
      .prepare(
        "SELECT * FROM operations WHERE session_id = ? AND request_key = ?",
      )
      .get(req.profile.session_id, requestKey);
    if (prior) {
      if (
        prior.kind !== operation.kind ||
        prior.merchant_id !== (operation.merchantId ?? null) ||
        prior.sku !== (operation.sku ?? null) ||
        (operation.kind === "topup" &&
          prior.amount_cents !== operation.amountCents)
      ) {
        res.status(409).json({
          error: "This request ID was already used for a different operation.",
        });
      } else {
        res.status(prior.status === "completed" ? 200 : 409).json({
          order: publicOrder(prior),
          error:
            prior.status === "completed"
              ? undefined
              : prior.message || "This request is already being processed.",
        });
      }
      return null;
    }
    const id = `ord_${crypto.randomBytes(10).toString("hex")}`;
    db.prepare(
      `INSERT INTO operations (id, session_id, request_key, kind, merchant_id, merchant, sku, product, amount_cents, status, payment, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    ).run(
      id,
      req.profile.session_id,
      requestKey,
      operation.kind,
      operation.merchantId ?? null,
      operation.merchant ?? null,
      operation.sku ?? null,
      operation.product,
      operation.amountCents,
      Number(operation.payment || false),
      Date.now(),
    );
    return id;
  }
  function completeOperation(id, status, message, transaction = null) {
    db.prepare(
      "UPDATE operations SET status = ?, message = ?, transaction_id = ? WHERE id = ?",
    ).run(status, message, transaction, id);
    return publicOrder(
      db.prepare("SELECT * FROM operations WHERE id = ?").get(id),
    );
  }
  app.use(["/api/checkout", "/api/wallet/topup"], (req, res, next) => {
    if (!req.profile.active)
      return res.status(409).json({ error: "Create your agent first." });
    next();
  });

  app.post("/api/wallet/topup", async (req, res) => {
    const amountCents = req.body.amountCents;
    if (![2500, 5000, 10000].includes(amountCents))
      return res
        .status(400)
        .json({ error: "Choose €25, €50, or €100 in demo funds." });
    const id = beginOperation(req, res, {
      kind: "topup",
      product: "Demo wallet top-up",
      amountCents,
    });
    if (!id) return;
    try {
      await upstream(
        facilitator,
        "/faucet",
        jsonOptions({
          address: req.profile.agent_id,
          publicKeyPem: req.profile.public_key,
          amountCents,
        }),
      );
      res.json({
        order: completeOperation(
          id,
          "completed",
          "Demo funds added to your wallet.",
        ),
      });
    } catch {
      res.status(502).json({
        order: completeOperation(
          id,
          "review",
          "The funding response was lost. Check your balance before adding funds again.",
        ),
        error: "Funding could not be confirmed.",
      });
    }
  });

  app.post("/api/checkout", async (req, res) => {
    const shop = shops.find((s) => s.id === req.body.merchantId);
    if (!shop || typeof req.body.sku !== "string")
      return res
        .status(400)
        .json({ error: "Choose a product from one of the shops." });
    const catalog = await upstream(shop, "/catalog");
    const product = Object.hasOwn(catalog, req.body.sku)
      ? catalog[req.body.sku]
      : null;
    if (!product || !validMoney(product.priceCents))
      return res.status(404).json({ error: "This product is unavailable." });
    const id = beginOperation(req, res, {
      kind: "purchase",
      merchantId: shop.id,
      merchant: shop.name,
      sku: req.body.sku,
      product: product.name,
      amountCents: product.priceCents,
      payment: shop.payment,
    });
    if (!id) return;
    const result = await performPurchase(
      req.profile,
      id,
      shop,
      req.body.sku,
      product,
    );
    res.status(result.httpStatus).json(result);
  });

  async function performPurchase(p, id, shop, sku, product) {
    const privateKey = crypto.createPrivateKey(p.private_key);
    const body = JSON.stringify({
      sku,
      amountCents: product.priceCents,
      intentId: id,
    });
    const attempt = (extra) =>
      fetch(shop.url + "/checkout", {
        method: "POST",
        signal: AbortSignal.timeout(8000),
        headers: {
          "Content-Type": "application/json",
          ...signRequest({
            method: "POST",
            path: "/checkout",
            bodyString: body,
            keyid: p.agent_id,
            privateKey,
          }),
          ...extra,
        },
        body,
      });
    try {
      let response = await attempt({});
      let result = await response.json();
      if (response.status === 402 && result.accepts?.[0] && !result.error) {
        const requirements = result.accepts[0];
        if (
          requirements.network !== "local-ledger" ||
          requirements.scheme !== "mock-exact" ||
          requirements.payTo !== shop.payTo ||
          requirements.maxAmountRequiredCents !== product.priceCents
        ) {
          throw new Error(
            "Unexpected payment terms. No payment was authorized.",
          );
        }
        const payment = buildPayment({
          requirements,
          from: p.agent_id,
          privateKey,
          intentRef: id,
        });
        response = await attempt({ "X-PAYMENT": payment });
        result = await response.json();
      }
      if (!response.ok || !result.ok) {
        const message = result.error || `Checkout returned ${response.status}.`;
        const status =
          response.status === 401
            ? "blocked"
            : response.status >= 500
              ? "review"
              : "failed";
        return {
          httpStatus: 422,
          order: completeOperation(id, status, message),
          error: message,
        };
      }
      return {
        httpStatus: 201,
        order: completeOperation(
          id,
          "completed",
          shop.payment
            ? "Identity verified. Payment settled and purchase delivered."
            : "Identity verified. Purchase recorded against your budget. This shop does not charge the wallet.",
          result.paid?.transaction || null,
        ),
      };
    } catch (error) {
      const message =
        error.message === "Unexpected payment terms. No payment was authorized."
          ? error.message
          : "Checkout could not be confirmed. Check your wallet and activity before trying again.";
      return {
        httpStatus: 502,
        order: completeOperation(id, "review", message),
        error: message,
      };
    }
  }

  const shopping = installShoppingRoutes({
    app,
    db,
    shops,
    verifier,
    facilitator,
    upstream,
    performPurchase,
    publicOrder,
  });

  app.use("/api", (_req, res) =>
    res.status(404).json({ error: "Unknown API route." }),
  );
  app.use(express.static(path.join(__dirname, "ui")));
  app.use((err, _req, res, _next) => {
    console.error("[dashboard]", err.message);
    res.status(err.type === "entity.parse.failed" ? 400 : 502).json({
      error:
        err.type === "entity.parse.failed"
          ? "Invalid JSON request."
          : "A service is unavailable. Check service status and try again.",
    });
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.UI_PORT || 8080);
  createApp().listen(port, process.env.AGENTVAULT_HOSTED === "1" ? "0.0.0.0" : "127.0.0.1", () =>
    console.log(`AgentVault dashboard: http://127.0.0.1:${port}`),
  );
}
module.exports = { createApp };
