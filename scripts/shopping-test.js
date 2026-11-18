const fetch = require("./test-fetch");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const base = process.env.TEST_URL || "http://localhost:8080";
function client() {
  let cookie;
  return async function request(route, body) {
    const response = await fetch(base + "/api/" + route, {
      headers: {
        "Content-Type": "application/json",
        "X-Requested-With": "AgentStack",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(20000),
    });
    if (response.headers.get("set-cookie"))
      cookie = response.headers.get("set-cookie").split(";")[0];
    return { status: response.status, body: await response.json() };
  };
}
async function main() {
  const request = client();
  const profile = {
    name: "Request workflow test",
    owner: "Local verification",
    maxPerDayCents: 5000,
    maxPerTxCents: 5000,
  };
  assert.equal((await fetch(base + "/shopping.js")).status, 200);
  await request("dashboard");
  const proposal = await request("shopping/plans", {
    prompt: "Buy two pairs of gloves and bread under €30",
  });
  assert.equal(proposal.status, 201);
  const plan = proposal.body.plan;
  assert.equal(plan.totalCents, 1870);
  assert.equal(plan.walletChargeCents, 1750);
  assert.equal(plan.status, "draft");
  assert.equal(plan.budgetCapCents, 3000);
  let dashboard = (await request("dashboard")).body;
  assert.equal(dashboard.agent, null);
  assert.equal(dashboard.activity.length, 0);
  assert.equal(dashboard.walletCents, 0);
  const approval = {
    confirmed: true,
    items: plan.items.map(({ merchantId, sku, quantity }) => ({
      merchantId,
      sku,
      quantity,
    })),
  };
  assert.equal(
    (await request(`shopping/plans/${plan.id}/confirm`, approval)).status,
    409,
  );
  assert.equal((await request("agent", profile)).status, 200);
  assert.equal(
    (
      await request(`shopping/plans/${plan.id}/confirm`, {
        items: approval.items,
      })
    ).status,
    400,
  );
  console.log(
    "PASS natural-language proposal, quantities, totals, read-only planning and explicit approval",
  );

  const confirmations = await Promise.all([
    request(`shopping/plans/${plan.id}/confirm`, approval),
    request(`shopping/plans/${plan.id}/confirm`, approval),
  ]);
  assert.ok(confirmations.every((r) => [200, 202].includes(r.status)));
  const finished = (await request(`shopping/plans/${plan.id}`)).body.plan;
  assert.equal(finished.status, "completed");
  assert.equal(finished.orders.length, 3);
  assert.equal(finished.orders.filter((o) => o.transaction).length, 2);
  dashboard = (await request("dashboard")).body;
  assert.equal(dashboard.walletCents, 13250);
  assert.equal(dashboard.budget.spentCents, 1870);
  assert.equal(dashboard.activity.length, 3);
  assert.equal(
    (await request(`shopping/plans/${plan.id}/confirm`, approval)).status,
    200,
  );
  assert.equal((await request("dashboard")).body.activity.length, 3);
  console.log(
    "PASS real signed multi-shop checkout, pack quantities, payments, receipts and duplicate-safe confirmation",
  );

  const capped = (
    await request("shopping/plans", { prompt: "gloves under €5" })
  ).body.plan;
  assert.equal(
    (
      await request(`shopping/plans/${capped.id}/confirm`, {
        confirmed: true,
        budgetCapCents: 99999,
        items: capped.items,
      })
    ).status,
    422,
  );
  assert.equal(
    (
      await request("agent", {
        ...profile,
        maxPerDayCents: 1900,
        maxPerTxCents: 1900,
      })
    ).status,
    200,
  );
  const bread = (await request("shopping/plans", { prompt: "bread" })).body
    .plan;
  assert.equal(
    (
      await request(`shopping/plans/${bread.id}/confirm`, {
        confirmed: true,
        items: bread.items,
      })
    ).status,
    422,
  );
  assert.equal((await request("dashboard")).body.activity.length, 3);
  await request("agent", profile);
  console.log(
    "PASS request budget and whole-list daily-budget checks prevent any partial purchase",
  );

  const unknown = (
    await request("shopping/plans", { prompt: "gloves and a helmet" })
  ).body.plan;
  assert.ok(unknown.unmatched.includes("helmet"));
  const unknownApproval = { confirmed: true, items: unknown.items };
  assert.equal(
    (await request(`shopping/plans/${unknown.id}/confirm`, unknownApproval))
      .status,
    422,
  );
  assert.equal(
    (
      await request(`shopping/plans/${unknown.id}/confirm`, {
        ...unknownApproval,
        acceptMatchedOnly: true,
      })
    ).body.plan.status,
    "completed",
  );
  dashboard = (await request("dashboard")).body;
  assert.equal(dashboard.activity.length, 4);
  assert.equal(dashboard.budget.spentCents, 2745);
  const other = client();
  await other("dashboard");
  assert.equal((await other(`shopping/plans/${plan.id}`)).status, 404);
  assert.equal((await other("dashboard")).body.shoppingPlans.length, 0);
  assert.ok(dashboard.shoppingPlans.some((p) => p.id === plan.id));
  console.log(
    "PASS explicit handling of unavailable items, saved requests, and browser-session isolation",
  );
  console.log(
    "\nShopping-request integration passed. Only simulated funds were used.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
