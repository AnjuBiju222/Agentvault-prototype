const fetch = require("./test-fetch");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const base = process.env.TEST_URL || "http://localhost:8080";
let cookie;
async function request(route, body, options = {}) {
  const response = await fetch(base + "/api/" + route, {
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "AgentStack",
      ...(cookie ? { Cookie: cookie } : {}),
      ...options.headers,
    },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(15000),
  });
  const setCookie = response.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  return { status: response.status, body: await response.json() };
}
const checkout = (
  merchantId,
  sku,
  requestId = crypto.randomUUID(),
  extra = {},
) => request("checkout", { merchantId, sku, requestId, ...extra });
async function main() {
  const page = await fetch(base);
  assert.equal(page.status, 200);
  assert.match(await page.text(), /AgentVault.*For payment agents/);
  for (const asset of ["/app.js", "/styles.css", "/favicon.svg"])
    assert.equal((await fetch(base + asset)).status, 200);
  const initial = await request("dashboard");
  assert.equal(initial.status, 200);
  assert.equal(initial.body.agent, null);
  assert.equal(initial.body.services.filter((s) => s.online).length, 4);
  assert.equal(initial.body.merchants.flatMap((s) => s.products).length, 6);
  console.log(
    "PASS dashboard, static assets, four live services, six products",
  );

  const unauthenticated = await checkout("tools", "guantes");
  assert.equal(unauthenticated.status, 409);
  const blockedOrigin = await request(
    "agent",
    {},
    { headers: { Origin: "https://example.org" } },
  );
  assert.equal(blockedOrigin.status, 403);
  const invalid = await request("agent", {
    name: "Test",
    owner: "Tester",
    maxPerDayCents: -100,
    maxPerTxCents: 100,
  });
  assert.equal(invalid.status, 400);
  console.log(
    "PASS setup requirement, cross-origin protection, limit validation",
  );

  const profile = {
    name: "Integration test agent",
    owner: "Local verification",
    maxPerDayCents: 1000,
    maxPerTxCents: 1000,
  };
  assert.equal((await request("agent", profile)).status, 200);
  assert.equal((await request("agent", profile)).status, 200);
  let dashboard = (await request("dashboard")).body;
  assert.equal(
    dashboard.walletCents,
    15000,
    "repeat setup must not fund twice",
  );
  assert.equal(dashboard.budget.remainingCents, 1000);
  assert.ok(!JSON.stringify(dashboard).includes("PRIVATE KEY"));
  console.log(
    "PASS agent registration, one-time funding, live budget, private key isolation",
  );

  const tooLarge = await checkout("tools", "tornillos");
  assert.equal(tooLarge.status, 422);
  assert.equal(tooLarge.body.order.status, "blocked");
  const requestId = crypto.randomUUID();
  const purchase = await checkout("tools", "guantes", requestId, {
    amountCents: 1,
  });
  assert.equal(purchase.status, 201);
  assert.equal(
    purchase.body.order.amountCents,
    875,
    "price must come from shop, not client",
  );
  assert.ok(purchase.body.order.transaction);
  const replay = await checkout("tools", "guantes", requestId);
  assert.equal(replay.status, 200);
  assert.equal(replay.body.order.id, purchase.body.order.id);
  assert.equal((await checkout("bakery", "barra", requestId)).status, 409);
  dashboard = (await request("dashboard")).body;
  assert.equal(
    dashboard.walletCents,
    14125,
    "repeat checkout must not settle twice",
  );
  assert.equal(dashboard.budget.spentCents, 875);
  console.log(
    "PASS per-purchase denial, signed paid checkout, server pricing, idempotency",
  );

  const bread = await checkout("bakery", "barra");
  assert.equal(bread.status, 201);
  const overBudget = await checkout("bakery", "barra");
  assert.equal(overBudget.status, 422);
  assert.equal(overBudget.body.order.status, "blocked");
  dashboard = (await request("dashboard")).body;
  assert.equal(dashboard.budget.spentCents, 995);
  assert.equal(dashboard.budget.remainingCents, 5);
  assert.equal(dashboard.walletCents, 14125, "bakery must not charge wallet");
  console.log(
    "PASS bakery checkout, cross-shop daily limit, budget versus wallet accounting",
  );

  const topup = { amountCents: 2500, requestId: crypto.randomUUID() };
  assert.equal((await request("wallet/topup", topup)).status, 200);
  assert.equal((await request("wallet/topup", topup)).status, 200);
  assert.equal(
    (await request("wallet/topup", { ...topup, amountCents: 5000 })).status,
    409,
  );
  assert.equal(
    (await request("agent", { ...profile, maxPerDayCents: 2000 })).status,
    200,
  );
  dashboard = (await request("dashboard")).body;
  assert.equal(dashboard.walletCents, 16625);
  assert.equal(dashboard.budget.remainingCents, 1005);
  assert.equal(dashboard.activity.length, 5);
  assert.equal(dashboard.billing.length, 2);
  console.log(
    "PASS idempotent top-up, saved limits, activity and merchant billing",
  );

  cookie = undefined;
  const otherSession = await request("dashboard");
  assert.equal(otherSession.body.agent, null);
  assert.equal(otherSession.body.activity.length, 0);
  assert.equal(otherSession.body.walletCents, 0);
  console.log("PASS browser-session isolation");
  console.log(
    "\nAll integration checks passed against the running services. Only simulated funds were used.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
