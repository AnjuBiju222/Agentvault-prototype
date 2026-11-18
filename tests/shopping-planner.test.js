const test = require("node:test");
const assert = require("node:assert/strict");
const { planShoppingRequest: plan } = require("../shopping-planner");
const shops = [
  {
    id: "tools",
    name: "Tools",
    payment: true,
    products: [
      { sku: "taladro", name: "Taladro percutor", priceCents: 8990 },
      { sku: "tornillos", name: "Caja tornillos 500u", priceCents: 1250 },
      { sku: "guantes", name: "Guantes de trabajo", priceCents: 875 },
    ],
  },
  {
    id: "bakery",
    name: "Bakery",
    payment: false,
    products: [
      { sku: "barra", name: "Barra de pan", priceCents: 120 },
      { sku: "croissants", name: "Croissants x6", priceCents: 780 },
      { sku: "tarta", name: "Tarta de manzana", priceCents: 1850 },
    ],
  },
];
test("matches English requests, quantities, catalog pack sizes and a euro budget", () => {
  const p = plan(
    "Please buy two pairs of gloves and a box of screws under €50",
    shops,
  );
  assert.deepEqual(
    p.items.map((i) => [i.sku, i.quantity]),
    [
      ["guantes", 2],
      ["tornillos", 1],
    ],
  );
  assert.equal(p.budgetCapCents, 5000);
  assert.deepEqual(p.unmatched, []);
  assert.deepEqual(p.questions, []);
  assert.equal(p.items[1].unit, "box of 500 screws");
});
test("matches Spanish names and accented products", () => {
  const p = plan(
    "Necesito dos guantes y una tarta de manzana hasta 50 euros",
    shops,
  );
  assert.deepEqual(
    p.items.map((i) => [i.sku, i.quantity]),
    [
      ["guantes", 2],
      ["tarta", 1],
    ],
  );
  assert.equal(p.budgetCapCents, 5000);
  assert.deepEqual(p.unmatched, []);
  assert.deepEqual(p.questions, []);
});
test("supports context, quantity suffixes and decimal budgets", () => {
  const p = plan(
    "I need gloves x2 and screws for a building project under €40.50",
    shops,
  );
  assert.deepEqual(
    p.items.map((i) => [i.sku, i.quantity]),
    [
      ["guantes", 2],
      ["tornillos", 1],
    ],
  );
  assert.equal(p.budgetCapCents, 4050);
  assert.deepEqual(p.unmatched, []);
});
test("does not invent products or silently discard unknown requested items", () => {
  const p = plan("Buy gloves and a helmet", shops);
  assert.equal(p.items.length, 1);
  assert.ok(p.unmatched.includes("helmet"));
  assert.equal(plan("Get a screwdriver", shops).items.length, 0);
  const bits = plan("Get drill bits", shops);
  assert.ok(bits.unmatched.includes("bits"));
});
test("alternatives, exclusions, unsupported currencies and bad quantities require clarification", () => {
  for (const prompt of [
    "gloves or screws",
    "do not buy gloves",
    "gloves without screws",
    "gloves under $20",
    "0 gloves",
    "1.5 gloves",
    "21 gloves",
  ]) {
    assert.ok(plan(prompt, shops).questions.length, prompt);
  }
});
test("repeated products add quantities and total units are bounded", () => {
  assert.equal(plan("gloves and gloves", shops).items[0].quantity, 2);
  assert.ok(plan("20 gloves and 2 boxes of screws", shops).questions.length);
});
test("returns clarification for vague requests and validates input size", () => {
  assert.equal(plan("Buy supplies for my project", shops).items.length, 0);
  assert.throws(() => plan("", shops));
  assert.throws(() => plan("x".repeat(1201), shops));
});

test("converts physical item counts into catalog packs without silently rounding up", () => {
  const p = plan("Buy 12 croissants and 1000 screws under €50", shops);
  assert.deepEqual(
    p.items.map((i) => [i.sku, i.quantity]),
    [
      ["croissants", 2],
      ["tornillos", 2],
    ],
  );
  assert.deepEqual(p.questions, []);
  assert.match(p.items[0].quantityNote, /12 requested items = 2 shop units/);
  for (const prompt of ["2 croissants", "3 screws", "1,5 gloves", "-2 gloves"])
    assert.ok(plan(prompt, shops).questions.length, prompt);
  const packs = plan("Buy two packs of croissants and a box of screws", shops);
  assert.deepEqual(
    packs.items.map((i) => [i.sku, i.quantity]),
    [
      ["croissants", 2],
      ["tornillos", 1],
    ],
  );
  assert.deepEqual(packs.questions, []);
});
