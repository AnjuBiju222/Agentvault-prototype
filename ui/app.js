"use strict";
const paths = {
  overview:
    '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  shop: '<path d="m3 9 2-6h14l2 6M3 9c0 4 6 4 6 0 0 4 6 4 6 0 0 4 6 4 6 0M5 12v9h14v-9M9 21v-6h6v6"/>',
  activity: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  wallet:
    '<path d="M20 7V4H5a2 2 0 0 0 0 4h16v12H5a2 2 0 0 1-2-2V6m18 6h-6v4h6"/><path d="M17 14h.01"/>',
  settings:
    '<path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor" stroke="none"/><circle cx="15" cy="17" r="3" fill="currentColor" stroke="none"/>',
  refresh: '<path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M4 12h15m-6-6 6 6-6 6"/>',
  chevron: '<path d="m9 5 7 7-7 7"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  shield:
    '<path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  flask:
    '<path d="M9 3h6M10 3v6l-6 10a1.5 1.5 0 0 0 1.3 2h13.4a1.5 1.5 0 0 0 1.3-2L14 9V3M7 15h10"/>',
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  agent:
    '<rect x="4" y="7" width="16" height="13" rx="4"/><path d="M12 3v4M1 12v4m22-4v4M8 16h8"/><circle cx="8" cy="12" r="1" fill="currentColor"/><circle cx="16" cy="12" r="1" fill="currentColor"/>',
  package:
    '<path d="m3 7 9-4 9 4v11l-9 4-9-4V7Zm0 0 9 4 9-4m-9 4v11M7 5l9 4v5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  alert: '<path d="m12 3 10 18H2L12 3Zm0 6v5m0 3h.01"/>',
  bread:
    '<path d="M5 11a5 5 0 0 1 0-9h14a5 5 0 0 1 0 9v10H5V11Zm4-5h.01M14 5l-1 3"/>',
  card: '<rect x="2" y="4" width="20" height="16" rx="3"/><path d="M2 10h20M6 16h4"/>',
};
const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${paths[name] || paths.package}</svg>`;
document
  .querySelectorAll("[data-icon]")
  .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
const art = (sku) => {
  const shapes = {
    taladro:
      '<path d="m40 34 58-6 14 13-9 22-66-3-8-13Z" fill="#687e61"/><path d="m49 57 24 1-5 38-24-2Z" fill="#3c5341"/><path d="m45 89 26 2 3 9-34-1Z" fill="#839174"/><path d="m101 37 20 2v14l-20 2Z" fill="#a3ad99"/><path d="m121 42 30 1v6l-30 1Z" fill="#5c695b"/><path d="M43 38h23m-25 7h24m-23 7h23" stroke="#b1bca6" stroke-width="3"/><path d="m80 39 12-1-1 15-13 1Z" fill="#d9bd74"/><path d="m70 65 10 1-4 14h-9" fill="none" stroke="#889779" stroke-width="4"/>',
    tornillos:
      '<path d="m36 54 45-18 48 18-45 22Z" fill="#d6c7a2"/><path d="m36 54 48 22v28L36 82Z" fill="#b6a882"/><path d="m84 76 45-22v29l-45 21Z" fill="#c8bb97"/><path d="m71 57 6-33 7 1-6 34m20 1 9-29 6 2-9 30m-47-2-8-30 6-2 9 30" stroke="#70806a" stroke-width="5"/><path d="m69 24 17 3m17 5 15 5M44 32l15-4" stroke="#65785e" stroke-width="6" stroke-linecap="round"/><path d="m71 35 12 3m-14 6 12 3m23-3 11 4m-14 5 10 4M51 43l11-3m-8 11 10-3" stroke="#e0e3d9" stroke-width="2"/>',
    guantes:
      '<path d="m40 69-13-19c-5-10 4-14 10-5l6 8-8-31c-2-9 7-12 10-3l9 28-4-34c-1-8 9-9 10-1l5 33 2-29c1-8 10-7 9 2l-1 34 7-19c3-7 11-3 8 5L77 85l-29 4Z" fill="#c9b884" stroke="#ad9e73" stroke-width="1"/><path d="m48 84 30-5 4 18-30 6Z" fill="#667f64"/><path d="m95 69 13-23c4-7 12-2 9 5l-7 17 18-19c5-6 12 0 7 6l-16 21 20-11c7-4 12 4 5 8l-21 15-26 9-13-13Z" fill="#ddcfa6"/><path d="m84 83 17 13-13 15-18-15Z" fill="#7c906c"/>',
    barra:
      '<path d="M30 82C8 63 75 15 123 25c24 5 4 31-24 47S45 94 30 82Z" fill="#dcb77b"/><path d="M32 76c16 9 51-4 75-22" fill="none" stroke="#ebca96" stroke-width="6" stroke-linecap="round"/><path d="m52 48 8 12m11-25 9 12m11-20 9 11m11-13 8 8" stroke="#ad8852" stroke-width="4" stroke-linecap="round"/>',
    croissants:
      '<path d="M35 86C5 67 40 24 79 30c39-6 75 37 45 56l-19-11-27 5-25-6Z" fill="#d2a566"/><path d="M79 30c-15 8-22 25-26 44l25 6 27-5C100 54 94 36 79 30Z" fill="#e7bd7e"/><path d="M51 37c-8 10-10 25-7 36m63-35c9 11 11 24 8 36M70 34c-8 12-10 28-8 39m26-38c8 12 10 27 7 39" fill="none" stroke="#bd8b4b" stroke-width="3"/><path d="m29 57 8 21-12 5c-11-6-9-17 4-26Zm99-1-7 22 12 5c11-6 8-17-5-27Z" fill="#e1b477"/>',
    tarta:
      '<ellipse cx="83" cy="88" rx="63" ry="12" fill="#d4d3be"/><path d="m25 49 116 2-7 34c-25 15-69 14-101 0Z" fill="#cfaa6b"/><ellipse cx="83" cy="50" rx="58" ry="24" fill="#ecd5a1" stroke="#d0ac6b" stroke-width="5"/><path d="M34 49c17-21 78-24 100 0-25 26-76 24-100 0Z" fill="#b9b17a"/><path d="m42 38 62 29m-43-37 63 27m-48-29 55 23M43 64l64-31M30 53l63-28m-28 45 66-32" stroke="#e8cb8f" stroke-width="7"/><path d="M30 48c12-23 89-29 107 1" fill="none" stroke="#e7c183" stroke-width="4"/>',
  };
  return `<svg viewBox="0 0 170 120" aria-hidden="true">${shapes[sku] || shapes.tornillos}</svg>`;
};
const $ = (selector) => document.querySelector(selector);
const escape = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const money = (cents) =>
  cents === null || cents === undefined
    ? "—"
    : new Intl.NumberFormat("en-IE", {
        style: "currency",
        currency: "EUR",
      }).format(cents / 100);
const dateTime = (timestamp) =>
  new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(timestamp);
const titles = {
  overview: "Overview",
  request: "Ask your agent",
  marketplace: "Marketplace",
  activity: "Activity",
  wallet: "Wallet & billing",
  settings: "Agent settings",
};
const state = {
  data: null,
  page: "overview",
  category: "all",
  activityFilter: "all",
  search: "",
  busy: false,
  loading: false,
  settingsDirty: false,
  shoppingPlan: null,
  shoppingQuantities: {},
  shoppingText: "",
  shoppingAcceptPartial: false,
  shoppingDirty: false,
  shoppingPlanning: false,
  shoppingNew: false,
  shoppingError: null,
  shoppingApproval: null,
};
let toastTimer;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => $("#toast").classList.remove("visible"), 4500);
}
async function api(route, body) {
  const response = await fetch("/api/" + route, {
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "AgentStack",
    },
    ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
  });
  const data = await response.json();
  if (!response.ok) {
    const error = new Error(
      data.error || "The request could not be completed.",
    );
    error.data = data;
    throw error;
  }
  return data;
}
const button = (text, action, type = "btn", iconName = "") =>
  `<button type="button" class="${type}" data-action="${action}">${iconName ? icon(iconName) : ""}${text}</button>`;
function heading(title, subtitle, action = "") {
  return `<div class="page-heading"><div><div class="eyebrow">YOUR WORKSPACE, CONNECTED</div><h1>${title}</h1><p class="subtitle">${subtitle}</p></div>${action}</div>`;
}
function welcome() {
  return state.data.agent
    ? ""
    : `<div class="welcome-strip"><div class="welcome-intro"><span>${icon("agent")}</span><div><h2>Create your shopping agent.</h2><p>Create an agent and start with €150 in demo funds.</p></div></div>${button("Create agent", "setup", "btn btn-primary", "plus")}</div>`;
}
function alertBanner() {
  const down = state.data.services.filter((s) => !s.online);
  let alerts = down.length
    ? `<div class="alert error">${icon("alert")}<span>${escape(down.map((s) => s.name).join(", "))} ${down.length === 1 ? "is" : "are"} offline. Some actions are unavailable.</span>${button("Retry", "refresh", "btn")}</div>`
    : "";
  if (
    state.data.agent &&
    !state.data.budget &&
    !down.find((s) => s.id === "verifier")
  )
    alerts += `<div class="alert">${icon("alert")}Your spending limit could not be loaded. Refresh before making a purchase.</div>`;
  if (["pending", "review"].includes(state.data.agent?.funding))
    alerts += `<div class="alert">${icon("alert")}Initial funding needs review. Check the wallet balance before adding more demo funds.</div>`;
  if (state.data.activity.some((o) => o.status === "review"))
    alerts += `<div class="alert">${icon("alert")}A request needs review. Check Activity and your wallet before repeating it.</div>`;
  return alerts;
}
const purchases = () =>
  state.data.activity.filter((o) => o.kind === "purchase");
const completed = () => purchases().filter((o) => o.status === "completed");
function metrics() {
  const d = state.data;
  return `<div class="metrics"><section class="panel metric metric-featured"><div class="metric-label">${icon("wallet")}Available balance</div><strong class="metric-value">${d.agent ? money(d.walletCents) : money(0)}</strong><div class="metric-footer"><span class="dot"></span> Simulated funds <strong>${d.agent ? (d.walletCents === null ? "Service unavailable" : "Your demo wallet") : "Create an agent to begin"}</strong></div><button class="metric-action" data-action="${d.agent ? "topup" : "setup"}" aria-label="Add demo funds">${icon("plus")}</button></section><section class="panel metric"><div class="metric-label">${icon("activity")}Spent today</div><strong class="metric-value">${d.agent ? money(d.budget?.spentCents) : money(0)}</strong><div class="metric-footer"><strong>${d.agent ? money(d.budget?.remainingCents) : money(15000)}</strong> left in your daily budget</div></section><section class="panel metric"><div class="metric-label">${icon("package")}Completed purchases</div><strong class="metric-value">${state.data.stats.completedPurchases.toString().padStart(2, "0")}</strong><div class="metric-footer"><strong>Across ${state.data.stats.merchants} shops</strong> in this workspace</div></section></div>`;
}
function productCard(merchant, product, expanded = false) {
  return `<article class="product-card"><div class="product-art ${merchant.id}"><span class="product-category">${escape(merchant.category)}</span>${art(product.sku)}</div><div class="product-info"><h3>${escape(product.name)}</h3><p class="merchant-label">${escape(merchant.name)}</p><div class="product-bottom"><strong class="product-price">${money(product.priceCents)}</strong><button class="buy-button" data-action="buy" data-merchant="${escape(merchant.id)}" data-sku="${escape(product.sku)}" aria-label="Buy ${escape(product.name)}" ${!merchant.online ? "disabled" : ""}>${expanded ? "Buy item" : ""}${icon(expanded ? "arrow" : "plus")}</button></div>${expanded ? `<p class="shop-note">${icon(merchant.payment ? "shield" : "activity")}${merchant.payment ? "Verified checkout · wallet payment" : "Budget tracked · no wallet charge"}</p>` : ""}</div></article>`;
}
function budgetPanel() {
  const b = state.data.budget;
  return `<section class="panel budget-panel"><div class="budget-head"><h2>Spending limits</h2><span class="badge">${icon("shield")}${state.data.agent ? (b ? "Protected" : "Unavailable") : "Not configured"}</span></div><div class="budget-caption">Daily spending limit</div><div class="budget-value">${state.data.agent ? money(b?.spentCents) : money(0)} <span>/ ${state.data.agent ? money(b?.maxPerDayCents) : money(15000)}</span></div><progress class="budget-progress" max="${b?.maxPerDayCents || 15000}" value="${Math.min(b?.spentCents || 0, b?.maxPerDayCents || 15000)}" aria-label="Daily budget used"></progress><div class="budget-legend"><span>${b ? Math.round((100 * b.spentCents) / b.maxPerDayCents) : 0}% used</span><span>Resets at local midnight</span></div><div class="budget-detail"><span>Per-purchase limit</span><strong>${state.data.agent ? money(b?.maxPerTxCents) : money(10000)}</strong></div><div class="budget-detail"><span>Reserved for checkout</span><strong>${state.data.agent ? money(b?.heldCents) : money(0)}</strong></div><div class="budget-note">${icon("shield")}<span>One spending limit follows your agent across both shops.</span></div></section>`;
}
function statusBadge(order) {
  const labels = {
    completed: order.kind === "topup" ? "Funds added" : "Completed",
    blocked: "Blocked",
    failed: "Failed",
    review: "Needs review",
    pending: "Processing",
  };
  return `<span class="badge ${order.status === "blocked" || order.status === "review" ? "warn" : order.status === "failed" ? "danger" : order.status === "pending" ? "neutral" : ""}">${order.status === "completed" ? icon("check") : ""}${labels[order.status] || escape(order.status)}</span>`;
}
function activityTable(orders, emptyTitle = "Your first purchase starts here") {
  if (!orders.length)
    return `<div class="empty-state"><div class="empty-icon">${icon("package")}</div><h3>${emptyTitle}</h3><p>Every purchase, payment, and blocked request will appear here.</p><a class="btn btn-soft" href="#marketplace">Explore the marketplace ${icon("arrow")}</a></div>`;
  return `<div class="table-wrapper"><table class="activity-table"><thead><tr><th>Purchase</th><th>Amount</th><th>Status</th><th>Date</th><th><span class="compact-label">Receipt</span></th></tr></thead><tbody>${orders.map((o) => `<tr><td><div class="item-cell"><span class="item-icon ${escape(o.merchantId || "")}">${icon(o.kind === "topup" ? "wallet" : o.merchantId === "bakery" ? "bread" : "package")}</span><div>${escape(o.product)}<small>${escape(o.merchant || "Demo wallet")}</small></div></div></td><td class="amount">${o.kind === "topup" ? "+" : ""}${money(o.amountCents)}</td><td>${statusBadge(o)}</td><td class="date">${dateTime(o.createdAt)}</td><td><button class="row-detail" data-action="receipt" data-id="${escape(o.id)}" aria-label="View receipt for ${escape(o.product)}">${icon("chevron")}</button></td></tr>`).join("")}</tbody></table></div>`;
}
function overview() {
  const d = state.data;
  const products = [
    d.merchants[0]?.products[0],
    d.merchants[1]?.products[1],
    d.merchants[0]?.products[2],
  ].filter(Boolean);
  return (
    heading(
      "Your agent workspace",
      "Your agent, your budget, and every purchase. All in one place.",
      `<a href="#marketplace" class="btn btn-primary">${icon("shop")}Explore shops</a>`,
    ) +
    welcome() +
    shoppingComposer(true) +
    metrics() +
    `<div class="overview-grid"><section class="panel shop-preview"><div class="panel-heading"><div><h2>Around the marketplace</h2><p>Everyday essentials. Agent-ready shops.</p></div><a href="#marketplace" class="btn btn-text">View all ${icon("arrow")}</a></div><div class="products">${products
      .map((p) =>
        productCard(
          d.merchants.find((m) => m.products.some((v) => v.sku === p.sku)),
          p,
        ),
      )
      .join(
        "",
      )}</div>${!products.length ? '<div class="empty-state">Shops are offline. Products will appear when they reconnect.</div>' : ""}</section>${budgetPanel()}</div><section class="panel activity-panel"><div class="panel-heading"><div><h2>Recent activity</h2><p>A clear record of what your agent has been up to.</p></div><a href="#activity" class="btn btn-text">View activity ${icon("arrow")}</a></div>${activityTable(d.activity.slice(0, 5))}</section>`
  );
}
function marketplace() {
  return (
    heading(
      "Shop with your agent",
      "Browse live catalogs and let your agent take care of checkout.",
    ) +
    welcome() +
    `<div class="filters"><div class="tabs" role="group" aria-label="Filter shops">${[
      ["all", "All products"],
      ["tools", "Tools"],
      ["bakery", "Bakery"],
    ]
      .map(
        ([id, label]) =>
          `<button class="tab ${state.category === id ? "active" : ""}" aria-pressed="${state.category === id}" data-action="category" data-category="${id}">${label}</button>`,
      )
      .join(
        "",
      )}</div><label class="search">${icon("search")}<input type="search" id="product-search" aria-label="Search products" placeholder="Find something you need…" value="${escape(state.search)}"></label></div><div id="product-grid" class="marketplace-grid">${filteredProducts()}</div>`
  );
}
function filteredProducts() {
  const cards = state.data.merchants
    .filter((m) => state.category === "all" || state.category === m.id)
    .flatMap((m) =>
      m.products
        .filter((p) =>
          `${p.name} ${p.sku} ${m.name} ${m.category}`
            .toLowerCase()
            .includes(state.search.toLowerCase()),
        )
        .map((p) => productCard(m, p, true)),
    );
  return cards.length
    ? cards.join("")
    : '<div class="empty-state"><h3>No products found</h3><p>Try another search or check that the shop is connected.</p></div>';
}
function activity() {
  const orders = state.data.activity.filter(
    (o) =>
      state.activityFilter === "all" ||
      (state.activityFilter === "blocked"
        ? ["blocked", "failed", "review"].includes(o.status)
        : o.status === "completed"),
  );
  return (
    heading(
      "Purchase activity",
      "Follow purchases, wallet top-ups, and spending-limit decisions.",
    ) +
    `<section class="panel activity-panel"><div class="activity-filters"><div class="tabs" role="group" aria-label="Filter activity">${[
      ["all", "All activity"],
      ["completed", "Completed"],
      ["blocked", "Needs attention"],
    ]
      .map(
        ([id, label]) =>
          `<button class="tab ${state.activityFilter === id ? "active" : ""}" aria-pressed="${state.activityFilter === id}" data-action="activity-filter" data-filter="${id}">${label}</button>`,
      )
      .join(
        "",
      )}</div><span class="activity-count">${orders.length} ${orders.length === 1 ? "record" : "records"} · latest 200</span></div>${activityTable(orders, "Nothing to show yet")}</section>`
  );
}
function wallet() {
  const d = state.data;
  const paid = d.stats.walletPaymentsCents;
  return (
    heading(
      "Wallet & billing",
      "Follow your balance, settled payments, and merchant verification fees.",
    ) +
    welcome() +
    `<div class="wallet-grid"><section class="panel wallet-card"><div class="eyebrow">YOUR DEMO WALLET</div><div class="wallet-big">${d.agent ? money(d.walletCents) : money(0)}</div>${button("Add demo funds", d.agent ? "topup" : "setup", "btn btn-lime", "plus")}<p>Simulated euros. No card or bank account required.</p></section><section class="panel wallet-details"><h2>Wallet at a glance</h2><p class="subtitle">Payments recorded by the settlement service.</p><dl><div><dt>Total wallet payments</dt><dd>${money(paid)}</dd></div><div><dt>Daily budget remaining</dt><dd>${d.agent ? money(d.budget?.remainingCents) : "Create an agent"}</dd></div><div><dt>Payment environment</dt><dd><span class="badge">Local demo</span></dd></div></dl></section></div><section class="panel activity-panel"><div class="panel-heading"><div><h2>Merchant billing</h2><p>Shared demo totals across all agents. These fees are billed to shops.</p></div><span class="badge neutral">€0.005 / verification</span></div><div class="billing-grid">${d.billing ? d.billing.map((b) => `<article class="billing-card"><h3>${escape(b.merchant)}</h3><div class="billing-metric">${escape(b.invoice)}</div><small>Verification fees accrued</small><div class="billing-footer"><span>Identity verifications</span><strong>${b.verifications}</strong></div></article>`).join("") : '<div class="empty-state">Billing is unavailable while the verifier is offline.</div>'}</div><p class="dialog-note">Bakery purchases count toward the spending limit without deducting wallet funds.</p></section>`
  );
}
function agentFields(agent) {
  return `<div class="form-grid"><label class="field">Agent name<input name="name" required maxlength="60" value="${escape(agent?.name || "My shopping agent")}" autocomplete="off"></label><label class="field">Your name<input name="owner" required maxlength="60" value="${escape(agent?.owner || "Demo user")}" autocomplete="name"></label></div><h3 class="form-section-title">Spending limits</h3><div class="form-grid"><label class="field">Daily budget (€)<input type="number" name="dailyLimit" required min="0.01" max="10000" step="0.01" value="${((agent?.maxPerDayCents || 15000) / 100).toFixed(2)}"><small>Shared across both shops. Resets at local midnight.</small></label><label class="field">Per-purchase limit (€)<input type="number" name="transactionLimit" required min="0.01" max="10000" step="0.01" value="${((agent?.maxPerTxCents || 10000) / 100).toFixed(2)}"><small>The maximum your agent can spend in one checkout.</small></label></div>`;
}
function settings() {
  const a = state.data.agent;
  return (
    heading(
      "Agent settings",
      "Give your agent an identity and decide how much it can spend.",
    ) +
    `<div class="settings-grid"><section class="panel settings-panel"><div class="panel-heading"><div><h2>${a ? "Your shopping agent" : "Create your first agent"}</h2><p>${a ? "Changes apply to the same identity at every connected shop." : "A fresh identity, with €150 in simulated starting funds."}</p></div><span class="badge">${a ? "Active" : "Ready to create"}</span></div><form id="settings-form">${agentFields(a)}<div class="form-error" role="alert"></div><div class="form-footer"><p>Limits are enforced before a purchase goes through.</p><button class="btn btn-primary" type="submit">${icon(a ? "check" : "plus")}${a ? "Save changes" : "Create agent"}</button></div></form></section><aside class="panel info-panel"><h3>How this workspace works</h3><div class="info-row">${icon("shield")}<div><strong>Verified at every checkout</strong><p>Your agent signs each request. Shops verify its identity before approving a purchase.</p></div></div><div class="info-row">${icon("wallet")}<div><strong>Funds and budget are separate</strong><p>Adding demo funds increases the wallet balance. Your spending limits stay the same.</p></div></div><div class="info-row">${icon("agent")}<div><strong>Your browser, your workspace</strong><p>This local demo remembers your agent in this browser. Private signing keys stay on the server.</p></div></div>${a ? `<div class="agent-id">${escape(a.id)}</div>` : ""}<p class="dialog-note">This is a local prototype. User sign-in and production payments are not configured.</p></aside></div>`
  );
}
function render() {
  if (!state.data) return;
  $("#breadcrumb").textContent = titles[state.page];
  document.title = `${titles[state.page]} · AgentVault`;
  document.querySelectorAll("[data-page]").forEach((a) => {
    a.classList.toggle("active", a.dataset.page === state.page);
    if (a.dataset.page === state.page) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  const agent = state.data.agent;
  const initials = (agent?.owner || "You")
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
  $("#user-initials").textContent = initials;
  $("#topbar-initials").textContent = initials;
  $("#user-name").innerHTML =
    `${escape(agent?.owner || "Your workspace")}<small>${agent ? escape(agent.name) : "Personal account"}</small>`;
  $("#service-count").textContent =
    `${state.data.services.filter((s) => s.online).length} / 4`;
  $("#service-list").innerHTML = state.data.services
    .map(
      (s) =>
        `<div class="service-item"><span class="service-dot ${s.online ? "" : "offline"}"></span><span>${escape(s.name)}</span><small>${s.online ? "Online" : "Offline"}</small></div>`,
    )
    .join("");
  const views = {
    overview,
    request: requestPage,
    marketplace,
    activity,
    wallet,
    settings,
  };
  $("#main").innerHTML =
    `<div class="animate-in">${alertBanner()}${views[state.page]()}</div>`;
  $("#last-updated").textContent =
    "Last synced " +
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    }).format(state.data.updatedAt);
}
async function load({ quiet = false } = {}) {
  if (state.loading) return;
  state.loading = true;
  $("#refresh").classList.add("loading-text");
  try {
    state.data = await api("dashboard");
    syncShoppingState();
    if (
      !quiet ||
      (!$("#action-dialog").open &&
        !state.settingsDirty &&
        !state.shoppingDirty &&
        !state.shoppingPlanning &&
        !document.activeElement?.closest("#shopping-request-form") &&
        document.activeElement?.id !== "product-search")
    )
      render();
  } catch (error) {
    if (!state.data)
      $("#main").innerHTML =
        `<div class="initial-loading"><h1>We couldn’t connect.</h1><p>Check that the dashboard server is running, then try again.</p><br>${button("Try again", "refresh", "btn btn-primary")}</div>`;
    if (!quiet) toast(error.message);
  } finally {
    state.loading = false;
    $("#refresh").classList.remove("loading-text");
  }
}
function navigate() {
  const next = location.hash.slice(1);
  state.page = Object.hasOwn(titles, next) ? next : "overview";
  state.settingsDirty = false;
  render();
}
function showDialog(html) {
  const dialog = $("#action-dialog");
  dialog.innerHTML = html;
  if (!dialog.open) dialog.showModal();
}
function dialogHeader(title, subtitle = "") {
  return `<div class="dialog-header"><div><h2 id="dialog-title">${title}</h2>${subtitle ? `<p>${subtitle}</p>` : ""}</div><button class="icon-button" data-action="close-dialog" aria-label="Close dialog">${icon("close")}</button></div>`;
}
function setupDialog() {
  showDialog(
    dialogHeader(
      "Create your shopping agent",
      "Start shopping with €150 in simulated funds.",
    ) +
      `<form id="setup-form">${agentFields(null)}<div class="form-error" role="alert"></div><div class="dialog-footer">${button("Maybe later", "close-dialog", "btn")}<button type="submit" class="btn btn-primary">${icon("plus")}Create agent</button></div><p class="dialog-note">Your signing key stays on this computer. No real money is involved.</p></form>`,
  );
}
function buyDialog(merchantId, sku) {
  if (!state.data.agent) return setupDialog();
  const merchant = state.data.merchants.find((m) => m.id === merchantId);
  const product = merchant?.products.find((p) => p.sku === sku);
  if (!product)
    return toast("This product is no longer available. Refresh the catalog.");
  const b = state.data.budget;
  const warning =
    b &&
    (product.priceCents > b.remainingCents ||
      product.priceCents > b.maxPerTxCents)
      ? "This purchase exceeds your spending limit. Update your agent settings or choose another item."
      : merchant.payment &&
          state.data.walletCents !== null &&
          product.priceCents > state.data.walletCents
        ? "Your wallet needs more demo funds for this purchase."
        : "";
  showDialog(
    dialogHeader(
      "Review your purchase",
      "Review this purchase before your agent checks out.",
    ) +
      `<div class="dialog-product">${art(sku)}<div><h3>${escape(product.name)}</h3><p>${escape(merchant.name)}</p><div class="dialog-price">${money(product.priceCents)}</div></div></div><dl class="receipt-details"><div><dt>Shopping agent</dt><dd>${escape(state.data.agent.name)}</dd></div><div><dt>Budget after purchase</dt><dd>${b ? money(Math.max(0, b.remainingCents - product.priceCents)) : "Unavailable"}</dd></div><div><dt>Wallet charge</dt><dd>${merchant.payment ? money(product.priceCents) : "No wallet charge"}</dd></div></dl>${warning ? `<div class="alert">${icon("alert")}${warning}</div>` : ""}<form id="checkout-form" data-merchant="${escape(merchantId)}" data-sku="${escape(sku)}" data-request="${crypto.randomUUID()}"><div class="form-error" role="alert"></div><div class="dialog-footer">${button("Cancel", "close-dialog", "btn")}<button type="submit" class="btn btn-primary" ${!merchant.online || !b ? "disabled" : ""}>${icon("shield")}${merchant.payment ? "Confirm & pay" : "Confirm purchase"} ${money(product.priceCents)}</button></div></form><p class="dialog-note">${merchant.payment ? "Your agent verifies its identity and authorizes a simulated payment." : "This shop records the purchase against your budget without charging the wallet."}</p>`,
  );
}
function receipt(order) {
  const ok = order.status === "completed";
  const title =
    order.kind === "topup"
      ? ok
        ? "Demo funds added"
        : "Funding needs review"
      : ok
        ? "Purchase complete"
        : order.status === "blocked"
          ? "Purchase blocked"
          : "Purchase needs review";
  showDialog(
    dialogHeader(
      order.kind === "topup" ? "Wallet details" : "Purchase details",
    ) +
      `<div class="receipt-icon ${ok ? "" : "blocked"}">${icon(ok ? "check" : "alert")}</div><h2>${title}</h2><p class="receipt-summary">${escape(order.message)}</p><dl class="receipt-details"><div><dt>${order.kind === "topup" ? "Operation" : "Product"}</dt><dd>${escape(order.product)}</dd></div><div><dt>Amount</dt><dd>${money(order.amountCents)}</dd></div><div><dt>Status</dt><dd>${statusBadge(order)}</dd></div>${order.merchant ? `<div><dt>Shop</dt><dd>${escape(order.merchant)}</dd></div>` : ""}<div><dt>Time</dt><dd>${dateTime(order.createdAt)}</dd></div>${order.transaction ? `<div><dt>Payment reference</dt><dd>${escape(order.transaction)}</dd></div>` : ""}<div><dt>Receipt ID</dt><dd>${escape(order.id)}</dd></div></dl>${ok && order.kind === "purchase" ? `<div class="receipt-steps"><div class="receipt-step">${icon("check")}Agent identity verified</div><div class="receipt-step">${icon("check")}Spending limit approved</div><div class="receipt-step">${icon("check")}${order.payment ? "Payment settled · goods delivered" : "Purchase recorded · wallet unchanged"}</div></div>` : ""}<div class="dialog-footer">${button("Back to workspace", "close-dialog", "btn btn-primary")}</div>`,
  );
}
function topupDialog() {
  if (!state.data.agent) return setupDialog();
  showDialog(
    dialogHeader(
      "Add demo funds",
      "Add simulated euros to your agent’s wallet.",
    ) +
      `<form id="topup-form" data-request="${crypto.randomUUID()}"><label class="field">Demo funds to add<select name="amount"><option value="2500">€25.00</option><option value="5000" selected>€50.00</option><option value="10000">€100.00</option></select></label><dl class="receipt-details"><div><dt>Current wallet balance</dt><dd>${money(state.data.walletCents)}</dd></div><div><dt>Daily spending limit</dt><dd>${money(state.data.agent.maxPerDayCents)}</dd></div></dl><div class="form-error" role="alert"></div><div class="dialog-footer">${button("Cancel", "close-dialog", "btn")}<button type="submit" class="btn btn-primary">${icon("plus")}Add demo funds</button></div><p class="dialog-note">This adds test funds only. Your spending limits stay the same.</p></form>`,
  );
}
document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-action]");
  if (!target || state.busy) return;
  const action = target.dataset.action;
  if (action === "refresh") load();
  if (action === "setup") setupDialog();
  if (action === "close-dialog") $("#action-dialog").close();
  if (action === "buy") buyDialog(target.dataset.merchant, target.dataset.sku);
  if (action === "receipt") {
    const order =
      state.data.activity.find((o) => o.id === target.dataset.id) ||
      state.shoppingPlan?.orders.find((o) => o.id === target.dataset.id);
    if (order) receipt(order);
  }
  if (action === "topup") topupDialog();
  if (action === "category") {
    state.category = target.dataset.category;
    render();
  }
  if (action === "activity-filter") {
    state.activityFilter = target.dataset.filter;
    render();
  }
});
$("#refresh").addEventListener("click", () => {
  if (!state.busy) load();
});
document.addEventListener("input", (event) => {
  if (event.target.id === "product-search") {
    state.search = event.target.value;
    $("#product-grid").innerHTML = filteredProducts();
  }
  if (event.target.closest("#settings-form")) state.settingsDirty = true;
});
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (
    !["checkout-form", "topup-form", "settings-form", "setup-form"].includes(
      form.id,
    )
  )
    return;
  event.preventDefault();
  if (state.busy) return;
  const fields = new FormData(form);
  const submit = form.querySelector('[type="submit"]');
  const originalText = submit.innerHTML;
  form.querySelector(".form-error").textContent = "";
  state.busy = true;
  $("#action-dialog")
    .querySelectorAll("button")
    .forEach((b) => (b.disabled = true));
  submit.disabled = true;
  submit.textContent =
    form.id === "checkout-form" ? "Verifying & checking out…" : "Saving…";
  try {
    if (form.id === "checkout-form") {
      const result = await api("checkout", {
        merchantId: form.dataset.merchant,
        sku: form.dataset.sku,
        requestId: form.dataset.request,
      });
      await load();
      receipt(result.order);
    } else if (form.id === "topup-form") {
      const result = await api("wallet/topup", {
        amountCents: Number(fields.get("amount")),
        requestId: form.dataset.request,
      });
      await load();
      receipt(result.order);
    } else {
      const daily = Math.round(Number(fields.get("dailyLimit")) * 100);
      const transaction = Math.round(
        Number(fields.get("transactionLimit")) * 100,
      );
      if (transaction > daily)
        throw new Error(
          "The per-purchase limit cannot exceed the daily budget.",
        );
      const wasActive = Boolean(state.data.agent);
      const saved = await api("agent", {
        name: fields.get("name"),
        owner: fields.get("owner"),
        maxPerDayCents: daily,
        maxPerTxCents: transaction,
      });
      state.settingsDirty = false;
      $("#action-dialog").close();
      await load();
      toast(
        wasActive
          ? "Your agent settings have been saved."
          : saved.agent.funding === "funded"
            ? "Your agent is ready with €150 in demo funds."
            : "Your agent is ready. Check wallet funding status.",
      );
    }
  } catch (error) {
    if (error.data?.order) {
      await load();
      receipt(error.data.order);
    } else if (form.isConnected)
      form.querySelector(".form-error").textContent = error.message;
    else toast(error.message);
  } finally {
    state.busy = false;
    $("#action-dialog")
      .querySelectorAll("button")
      .forEach((b) => (b.disabled = false));
    if (submit.isConnected) {
      submit.disabled = false;
      submit.innerHTML = originalText;
    }
  }
});
$("#action-dialog").addEventListener("cancel", (event) => {
  if (state.busy) event.preventDefault();
});
window.addEventListener("hashchange", navigate);
navigate();
load();
setInterval(() => {
  if (!state.busy && !document.hidden) load({ quiet: true });
}, 12000);
