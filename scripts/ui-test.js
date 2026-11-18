const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const { JSDOM, CookieJar, VirtualConsole } = require("jsdom");
const base = process.env.TEST_URL || "http://localhost:8080";
const root = path.join(__dirname, "..");
const cookieJar = new CookieJar();
let confirmations = 0;
const errors = [];
async function mount() {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => errors.push(error.message));
  const dom = new JSDOM(
    fs.readFileSync(path.join(root, "ui/index.html"), "utf8"),
    {
      url: base + "/#request",
      runScripts: "outside-only",
      pretendToBeVisual: true,
      cookieJar,
      virtualConsole,
    },
  );
  const { window } = dom;
  window.fetch = async (route, options = {}) => {
    const url = new URL(route, base);
    const headers = new Headers(options.headers);
    const cookie = cookieJar.getCookieStringSync(base);
    if (cookie) headers.set("Cookie", cookie);
    if (url.pathname.endsWith("/confirm") && options.method === "POST")
      confirmations++;
    const response = await fetch(url, {
      ...options,
      headers,
      signal: AbortSignal.timeout(12000),
    });
    const setCookie = response.headers.get("set-cookie");
    if (setCookie) cookieJar.setCookieSync(setCookie, base);
    return response;
  };
  // jsdom has no native dialog rendering. Only these display methods are shimmed;
  // the real app scripts, forms, handlers, and HTTP requests are exercised unchanged.
  if (!window.HTMLDialogElement.prototype.showModal)
    window.HTMLDialogElement.prototype.showModal = function () {
      this.open = true;
    };
  if (!window.HTMLDialogElement.prototype.close)
    window.HTMLDialogElement.prototype.close = function () {
      this.open = false;
    };
  if (!window.crypto.randomUUID) window.crypto.randomUUID = crypto.randomUUID;
  for (const file of ["shopping.js", "app.js"])
    new vm.Script(fs.readFileSync(path.join(root, "ui", file), "utf8"), {
      filename: file,
    }).runInContext(dom.getInternalVMContext());
  return dom;
}
async function waitFor(check, label) {
  const end = Date.now() + 8000;
  while (Date.now() < end) {
    if (check()) return;
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw Error("Timed out: " + label);
}
function fill(window, element, value) {
  assert.ok(element, "form control exists");
  element.value = value;
  element.dispatchEvent(new window.Event("input", { bubbles: true }));
}
async function main() {
  let dom = await mount();
  try {
    let w = dom.window;
    let d = w.document;
    await waitFor(
      () => d.querySelector("#shopping-request-form"),
      "request composer",
    );
    assert.equal(d.querySelector("h1").textContent, "Ask your shopping agent");
    fill(
      w,
      d.querySelector("#shopping-prompt"),
      "Buy 2 pairs of gloves and bread under €30",
    );
    d.querySelector("#shopping-request-form").requestSubmit();
    await waitFor(
      () => d.querySelectorAll(".shopping-line").length === 2,
      "proposed shopping list",
    );
    assert.equal(d.querySelector("#shopping-total").textContent, "€18.70");
    assert.equal(d.querySelector("#shopping-wallet").textContent, "€17.50");
    assert.equal(d.querySelector("#shopping-review").disabled, true);
    assert.equal(confirmations, 0);
    console.log(
      "PASS request form, proposed quantities, separate budget/wallet totals, approval blocked before setup",
    );

    d.querySelector('#shopping-plan-container [data-action="setup"]').click();
    await waitFor(() => d.querySelector("#setup-form"), "agent setup dialog");
    fill(w, d.querySelector('#setup-form [name="name"]'), "UI workflow test");
    fill(
      w,
      d.querySelector('#setup-form [name="owner"]'),
      "Local UI verification",
    );
    d.querySelector("#setup-form").requestSubmit();
    await waitFor(
      () =>
        d.querySelector("#shopping-review") &&
        !d.querySelector("#shopping-review").disabled &&
        !d.querySelector("dialog").open,
      "setup followed by shopping approval",
    );
    fill(w, d.querySelector('[data-shopping-key="tools:guantes"]'), "1");
    assert.equal(d.querySelector("#shopping-total").textContent, "€9.95");
    d.querySelector(
      '[data-shopping-action="remove"][data-key="bakery:barra"]',
    ).click();
    assert.equal(d.querySelectorAll(".shopping-line").length, 1);
    assert.equal(d.querySelector("#shopping-total").textContent, "€8.75");
    d.querySelector('[data-shopping-action="reset"]').click();
    assert.equal(d.querySelectorAll(".shopping-line").length, 2);
    fill(w, d.querySelector('[data-shopping-key="tools:guantes"]'), "1");
    d.querySelector("#shopping-review").click();
    assert.equal(d.querySelector("dialog").open, true);
    d.querySelector(
      '#shopping-confirm-form [data-action="close-dialog"]',
    ).click();
    assert.equal(d.querySelector("dialog").open, false);
    assert.equal(confirmations, 0, "Keep editing must not submit checkout");
    console.log(
      "PASS agent onboarding, quantity editing, removal/restoration, review dialog and safe cancellation",
    );

    d.querySelector("#shopping-review").click();
    const form = d.querySelector("#shopping-confirm-form");
    form.requestSubmit();
    form.dispatchEvent(
      new w.Event("submit", { bubbles: true, cancelable: true }),
    );
    await waitFor(
      () =>
        d.querySelector(".shopping-result-message") &&
        d.querySelector(".shopping-plan h2").textContent ===
          "Your shopping list is purchased.",
      "completed UI checkout",
    );
    assert.equal(confirmations, 1);
    assert.equal(d.querySelectorAll(".shopping-plan tbody tr").length, 2);
    let snapshot = await (await w.fetch("/api/dashboard")).json();
    assert.equal(snapshot.stats.completedPurchases, 2);
    assert.equal(snapshot.walletCents, 14125);
    assert.equal(snapshot.budget.spentCents, 995);
    console.log(
      "PASS explicit approval, double-submit protection, real signed checkout, receipts and refreshed balances",
    );

    dom.window.close();
    dom = await mount();
    w = dom.window;
    d = w.document;
    await waitFor(
      () =>
        d.querySelector(".shopping-plan h2")?.textContent ===
        "Your shopping list is purchased.",
      "saved request after reload",
    );
    assert.equal(confirmations, 1);
    fill(w, d.querySelector("#shopping-prompt"), "gloves and a helmet");
    d.querySelector("#shopping-request-form").requestSubmit();
    await waitFor(
      () => d.querySelector("#shopping-partial"),
      "unmatched-item clarification",
    );
    assert.equal(d.querySelector("#shopping-review").disabled, true);
    const checkbox = d.querySelector("#shopping-partial");
    checkbox.checked = true;
    checkbox.dispatchEvent(new w.Event("input", { bubbles: true }));
    assert.equal(d.querySelector("#shopping-review").disabled, false);
    assert.equal(confirmations, 1);
    assert.deepEqual(errors, []);
    console.log(
      "PASS reload persistence, unavailable-item warning, explicit matched-only choice, and no client runtime errors",
    );
    console.log(
      "\nDOM integration passed using isolated demo data. Browser layout was not tested by this script.",
    );
  } finally {
    dom.window.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
