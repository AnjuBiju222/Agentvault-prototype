const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const Database = require("better-sqlite3");
const { installShoppingRoutes } = require("../shopping-routes");

async function fixture(t) {
  const db = new Database(":memory:");
  db.exec(
    `CREATE TABLE operations (id TEXT PRIMARY KEY, session_id TEXT, request_key TEXT, kind TEXT, merchant_id TEXT, merchant TEXT, sku TEXT, product TEXT, amount_cents INTEGER, status TEXT, message TEXT, transaction_id TEXT, payment INTEGER, created_at INTEGER)`,
  );
  const context = {
    calls: 0,
    failOn: 0,
    failStatus: "failed",
    remaining: 50000,
    wallet: 50000,
    txLimit: 10000,
  };
  const shops = [
    { id: "tools", name: "Tools", payment: true },
    { id: "bakery", name: "Bakery", payment: false },
  ];
  const catalog = {
    tools: {
      guantes: { name: "Guantes de trabajo", priceCents: 875 },
      tornillos: { name: "Caja tornillos 500u", priceCents: 1250 },
    },
    bakery: { barra: { name: "Barra de pan", priceCents: 120 } },
  };
  const profile = {
    session_id: "fixture",
    agent_id: "fixture-agent",
    active: 1,
  };
  const app = express();
  app.use(express.json());
  app.use((req, _res, next) => {
    req.profile = { ...profile, session_id: req.get("X-Session") || "fixture" };
    next();
  });
  const publicOrder = (row) => ({
    id: row.id,
    status: row.status,
    message: row.message,
    amountCents: row.amount_cents,
    product: row.product,
  });
  const options = {
    app,
    db,
    shops,
    verifier: { id: "verifier" },
    facilitator: { id: "facilitator" },
    publicOrder,
    upstream: async (service, route) => {
      if (route === "/catalog") return structuredClone(catalog[service.id]);
      if (route.endsWith("/summary"))
        return {
          remainingCents: context.remaining,
          maxPerTxCents: context.txLimit,
        };
      if (route === "/balances")
        return [
          {
            address: profile.agent_id,
            balance: (context.wallet / 100).toFixed(2) + "€",
          },
        ];
      throw Error("Unexpected fixture route");
    },
    performPurchase: async (p, id, shop, sku, product) => {
      context.calls++;
      await new Promise((resolve) => setTimeout(resolve, 20));
      const status =
        context.calls === context.failOn ? context.failStatus : "completed";
      if (status === "completed") {
        context.remaining -= product.priceCents;
        if (shop.payment) context.wallet -= product.priceCents;
      }
      db.prepare(
        "UPDATE operations SET status = ?, message = ? WHERE id = ?",
      ).run(
        status,
        status === "completed" ? "Purchased" : "Injected checkout failure",
        id,
      );
      return {
        order: publicOrder(
          db.prepare("SELECT * FROM operations WHERE id = ?").get(id),
        ),
      };
    },
  };
  installShoppingRoutes(options);
  app.use((error, _req, res, _next) =>
    res.status(503).json({ error: error.message }),
  );
  const server = await new Promise((resolve) => {
    const s = app.listen(0, "127.0.0.1", () => resolve(s));
  });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    db.close();
  });
  async function request(route, body, headers = {}) {
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/api/shopping/plans${route}`,
      {
        headers: { "Content-Type": "application/json", ...headers },
        ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
      },
    );
    return { status: response.status, body: await response.json() };
  }
  async function make(prompt) {
    const r = await request("", { prompt });
    assert.equal(r.status, 201);
    return r.body.plan;
  }
  const approval = (plan) => ({
    confirmed: true,
    items: plan.items.map(({ merchantId, sku, quantity }) => ({
      merchantId,
      sku,
      quantity,
    })),
  });
  return { db, context, catalog, options, request, make, approval };
}

test("planning is read-only and explicit approval is mandatory", async (t) => {
  const f = await fixture(t);
  const plan = await f.make("gloves and bread");
  assert.equal(f.context.calls, 0);
  assert.equal(
    (await f.request("/" + plan.id + "/confirm", { items: plan.items })).status,
    400,
  );
  assert.equal(f.context.calls, 0);
});
test("full-list budgets, wallet funds and line limits are checked before any purchase", async (t) => {
  const f = await fixture(t);
  const p = await f.make("2 gloves and screws");
  for (const override of [
    { remaining: 2999, wallet: 50000, txLimit: 10000 },
    { remaining: 50000, wallet: 2999, txLimit: 10000 },
    { remaining: 50000, wallet: 50000, txLimit: 1000 },
  ]) {
    Object.assign(f.context, override);
    assert.equal(
      (await f.request("/" + p.id + "/confirm", f.approval(p))).status,
      422,
    );
    assert.equal(f.context.calls, 0);
  }
});
test("request budget cannot be overridden by client-supplied totals or prices", async (t) => {
  const f = await fixture(t);
  const p = await f.make("gloves under €5");
  const r = await f.request("/" + p.id + "/confirm", {
    ...f.approval(p),
    totalCents: 1,
    budgetCapCents: 99999,
    items: [{ ...p.items[0], priceCents: 1 }],
  });
  assert.equal(r.status, 422);
  assert.equal(f.context.calls, 0);
});
test("changed prices and expired quotes require a new plan", async (t) => {
  const f = await fixture(t);
  let p = await f.make("gloves");
  f.catalog.tools.guantes.priceCents = 900;
  assert.equal(
    (await f.request("/" + p.id + "/confirm", f.approval(p))).status,
    409,
  );
  p = await f.make("gloves");
  f.db.prepare("UPDATE shopping_plans SET expires_at=0 WHERE id=?").run(p.id);
  assert.equal(
    (await f.request("/" + p.id + "/confirm", f.approval(p))).status,
    409,
  );
  assert.equal(f.context.calls, 0);
});
test("confirmation race and replay cannot duplicate purchases", async (t) => {
  const f = await fixture(t);
  const p = await f.make("2 gloves and bread");
  const approval = f.approval(p);
  const results = await Promise.all([
    f.request("/" + p.id + "/confirm", approval),
    f.request("/" + p.id + "/confirm", approval),
  ]);
  assert.ok(results.every((r) => [200, 202].includes(r.status)));
  assert.equal(f.context.calls, 3);
  assert.equal(
    (await f.request("/" + p.id + "/confirm", approval)).body.plan.status,
    "completed",
  );
  assert.equal(f.context.calls, 3);
  const changed = {
    ...approval,
    items: [{ ...approval.items[0], quantity: 1 }],
  };
  assert.equal((await f.request("/" + p.id + "/confirm", changed)).status, 409);
});
test("stops remaining units after failure and reports partial completion", async (t) => {
  const f = await fixture(t);
  f.context.failOn = 2;
  const p = await f.make("3 gloves");
  const r = await f.request("/" + p.id + "/confirm", f.approval(p));
  assert.equal(r.body.plan.status, "partial");
  assert.deepEqual(
    r.body.plan.orders.map((o) => o.status),
    ["completed", "failed"],
  );
  assert.equal(f.context.calls, 2);
  assert.equal(f.context.wallet, 50000 - 875);
  await f.request("/" + p.id + "/confirm", f.approval(p));
  assert.equal(f.context.calls, 2);
});
test("uncertain payment outcomes require review and are not automatically retried", async (t) => {
  const f = await fixture(t);
  f.context.failOn = 1;
  f.context.failStatus = "review";
  const p = await f.make("2 gloves");
  const r = await f.request("/" + p.id + "/confirm", f.approval(p));
  assert.equal(r.body.plan.status, "review");
  assert.equal(f.context.calls, 1);
  await f.request("/" + p.id + "/confirm", f.approval(p));
  assert.equal(f.context.calls, 1);
});
test("unmatched items require an explicit choice and clarifications cannot be bypassed", async (t) => {
  const f = await fixture(t);
  const p = await f.make("gloves and helmet");
  assert.equal(
    (await f.request("/" + p.id + "/confirm", f.approval(p))).status,
    422,
  );
  assert.equal(
    (
      await f.request("/" + p.id + "/confirm", {
        ...f.approval(p),
        acceptMatchedOnly: true,
      })
    ).body.plan.status,
    "completed",
  );
  const ambiguous = await f.make("gloves or screws");
  assert.equal(
    (
      await f.request("/" + ambiguous.id + "/confirm", {
        ...f.approval(ambiguous),
        acceptMatchedOnly: true,
      })
    ).status,
    422,
  );
  assert.equal(f.context.calls, 1);
});
test("users can remove products and edit quantities but cannot add unquoted products", async (t) => {
  const f = await fixture(t);
  const p = await f.make("gloves and bread");
  assert.equal(
    (
      await f.request("/" + p.id + "/confirm", {
        confirmed: true,
        items: [{ merchantId: "tools", sku: "tornillos", quantity: 1 }],
      })
    ).status,
    400,
  );
  const r = await f.request("/" + p.id + "/confirm", {
    confirmed: true,
    items: [{ merchantId: "tools", sku: "guantes", quantity: 2 }],
  });
  assert.equal(r.body.plan.totalCents, 1750);
  assert.equal(f.context.calls, 2);
});
test("plans are scoped to the browser session and remain reviewable after restart", async (t) => {
  const f = await fixture(t);
  const p = await f.make("gloves");
  assert.equal(
    (await f.request("/" + p.id, undefined, { "X-Session": "other" })).status,
    404,
  );
  f.db
    .prepare("UPDATE shopping_plans SET status='executing' WHERE id=?")
    .run(p.id);
  installShoppingRoutes({ ...f.options, app: express() });
  const r = await f.request("/" + p.id);
  assert.equal(r.body.plan.status, "review");
  assert.match(r.body.plan.message, /restarted/);
  assert.equal(f.context.calls, 0);
});
