"use strict";

const shoppingExamples = [
  "Buy 2 pairs of gloves and a box of screws under €50",
  "Get bread and a pack of croissants under €15",
  "I need a drill and gloves for a building project",
];
function shoppingComposer(compact = false) {
  return `<section class="panel shopping-composer ${compact ? "compact" : ""}"><div class="shopping-intro"><span class="shopping-agent-icon">${icon("agent")}</span><div><h2>What do you need?</h2><p>Describe your shopping list. Your agent will find matches for you to review.</p></div><span class="badge neutral">Local catalog matching</span></div><form id="shopping-request-form"><label class="sr-only" for="shopping-prompt">Describe the items you need</label><textarea id="shopping-prompt" name="prompt" required maxlength="1200" rows="${compact ? 2 : 3}" placeholder="Buy 2 pairs of gloves and a box of screws under €50" ${state.shoppingPlanning ? "disabled" : ""}>${escape(state.shoppingText)}</textarea><div class="shopping-composer-footer"><span>${icon("shield")}Nothing is purchased until you approve.</span><button class="btn btn-primary" type="submit" ${state.shoppingPlanning ? "disabled" : ""}>${icon("search")}${state.shoppingPlanning ? "Finding products…" : "Make a shopping plan"}</button></div></form><div class="shopping-examples"><span>Try asking</span>${shoppingExamples.map((example, index) => `<button type="button" data-shopping-action="example" data-index="${index}">${escape(example)}</button>`).join("")}</div>${compact ? "" : '<p class="shopping-scope">Matches the six products in the connected shops, using English or Spanish product names. This demo uses local matching, not an AI language model.</p>'}</section>`;
}
function setShoppingPlan(plan, preserve = false) {
  state.shoppingPlan = plan;
  state.shoppingNew = false;
  if (!preserve) {
    state.shoppingQuantities = Object.fromEntries(
      (plan.selectedItems || plan.items).map((item) => [
        `${item.merchantId}:${item.sku}`,
        item.quantity,
      ]),
    );
    state.shoppingAcceptPartial = false;
    state.shoppingText = plan.prompt;
  }
}
function syncShoppingState() {
  const saved = state.data?.shoppingPlans || [];
  if (!state.shoppingPlan && !state.shoppingNew && saved.length)
    setShoppingPlan(
      saved.find((plan) => plan.status !== "cancelled") || saved[0],
    );
  else if (state.shoppingPlan) {
    const current = saved.find((plan) => plan.id === state.shoppingPlan.id);
    if (current && current.status !== state.shoppingPlan.status)
      setShoppingPlan(current, current.status === "draft");
  }
}
function selectedShoppingItems() {
  return (state.shoppingPlan?.items || [])
    .map((item) => ({
      ...item,
      quantity:
        state.shoppingQuantities[`${item.merchantId}:${item.sku}`] ??
        item.quantity,
    }))
    .filter((item) => item.quantity !== 0);
}
function shoppingTotals() {
  const items = selectedShoppingItems();
  const valid = items.every(
    (item) =>
      Number.isSafeInteger(item.quantity) &&
      item.quantity >= 1 &&
      item.quantity <= 20,
  );
  return {
    items,
    valid,
    units: valid ? items.reduce((sum, item) => sum + item.quantity, 0) : 0,
    total: valid
      ? items.reduce((sum, item) => sum + item.priceCents * item.quantity, 0)
      : 0,
    wallet: valid
      ? items.reduce(
          (sum, item) =>
            sum + (item.payment ? item.priceCents * item.quantity : 0),
          0,
        )
      : 0,
  };
}
function shoppingBlockers() {
  const plan = state.shoppingPlan;
  const totals = shoppingTotals();
  const budget = state.data.budget;
  const blockers = [];
  if (!plan || plan.status !== "draft")
    return ["This request is not awaiting approval."];
  if (plan.questions.length)
    blockers.push("Revise your request to answer the questions above.");
  if (!totals.items.length) blockers.push("Select at least one product.");
  if (!totals.valid || totals.units > 20)
    blockers.push(
      "Use whole-number quantities, up to 20 catalog units in total.",
    );
  if (plan.unmatched.length && !state.shoppingAcceptPartial)
    blockers.push(
      "Revise the request or choose to buy only the matched items.",
    );
  if (Date.now() >= plan.expiresAt)
    blockers.push("This quote expired. Make a new plan for current prices.");
  if (plan.budgetCapCents !== null && totals.total > plan.budgetCapCents)
    blockers.push(
      "The list exceeds the budget in your request. Reduce quantities or revise the request.",
    );
  if (!state.data.agent)
    blockers.push("Create your agent to approve purchases.");
  else if (!budget)
    blockers.push(
      "Spending limits are unavailable. Refresh before checking out.",
    );
  else {
    if (totals.total > budget.remainingCents)
      blockers.push("This list exceeds your remaining daily budget.");
    if (
      totals.items.some(
        (item) => item.priceCents * item.quantity > budget.maxPerTxCents,
      )
    )
      blockers.push("A product line exceeds your per-purchase limit.");
  }
  if (
    totals.wallet &&
    (state.data.walletCents === null || totals.wallet > state.data.walletCents)
  )
    blockers.push(
      "Add demo funds or reconnect the wallet before paying for this list.",
    );
  if (
    totals.items.some(
      (item) =>
        !state.data.merchants.find((m) => m.id === item.merchantId)?.online,
    )
  )
    blockers.push("A selected shop is offline. Reconnect it before checkout.");
  return blockers;
}
function shoppingPlanPanel() {
  const plan = state.shoppingPlan;
  if (state.shoppingPlanning)
    return '<section class="panel shopping-loading" role="status"><span class="loading-ring"></span><h2>Finding your items</h2><p>Reading the live shop catalogs and checking your request.</p></section>';
  if (!plan)
    return `<section class="panel shopping-empty"><span class="shopping-agent-icon">${icon("agent")}</span><h2>Describe it. Review it. Let your agent buy it.</h2><p>Use the request box above. You can change quantities and remove products before approving checkout.</p><div class="shopping-steps"><span>1. Tell us what you need</span><span>2. Review matches and cost</span><span>3. Approve purchases</span></div></section>`;
  if (plan.status !== "draft") {
    const titles = {
      completed: "Your shopping list is purchased.",
      partial: "Some purchases completed.",
      executing: "Your agent is checking out.",
      review: "This request needs review.",
      blocked: "Checkout was blocked.",
      failed: "Checkout stopped.",
      cancelled: "Request discarded.",
    };
    return `<section class="panel shopping-plan"><div class="panel-heading"><div><div class="eyebrow">SHOPPING REQUEST</div><h2>${titles[plan.status] || "Shopping request"}</h2></div><span class="badge ${["review", "partial", "blocked", "failed"].includes(plan.status) ? "warn" : ""}">${escape(plan.status)}</span></div><p class="shopping-result-message" role="status">${escape(plan.message)}</p><p class="shopping-original">${escape(plan.prompt)}</p>${plan.orders.length ? activityTable(plan.orders) : '<p class="dialog-note">No completed purchase receipts are recorded for this request.</p>'}<div class="shopping-result-actions"><button class="btn" type="button" data-shopping-action="refresh">${icon("refresh")}Refresh request status</button><button class="btn btn-primary" type="button" data-shopping-action="new">Make another request ${icon("arrow")}</button></div></section>`;
  }
  const totals = shoppingTotals();
  const blockers = shoppingBlockers();
  return `<section class="panel shopping-plan"><div class="panel-heading"><div><div class="eyebrow">PROPOSED SHOPPING LIST</div><h2>Here’s what your agent found</h2><p>Check products, pack sizes, and quantities before approving.</p></div><span class="badge">Awaiting your approval</span></div>${plan.offlineShops.length ? `<div class="alert">${icon("alert")}Could not search ${escape(plan.offlineShops.join(", "))}. Their products may be missing.</div>` : ""}${plan.questions.length ? `<div class="shopping-questions"><h3>A little more detail is needed</h3><ul>${plan.questions.map((question) => `<li>${escape(question)}</li>`).join("")}</ul><p>Revise the request above and make a new plan.</p></div>` : ""}${plan.unmatched.length ? `<div class="shopping-questions"><h3>Items we couldn’t match</h3><p>${escape(plan.unmatched.join("; "))}</p><p>Revise your request, or explicitly leave those items out.</p><label class="shopping-checkbox"><input id="shopping-partial" type="checkbox" ${state.shoppingAcceptPartial ? "checked" : ""}>Buy only the matched items; leave the unmatched items out.</label></div>` : ""}<div class="shopping-plan-layout"><div><div class="shopping-lines">${totals.items.map((item) => `<article class="shopping-line"><div class="shopping-product-art">${art(item.sku)}</div><div class="shopping-line-name"><h3>${escape(item.label)}</h3><p>${escape(item.name)} · ${escape(item.merchant)}</p><small>One unit = ${escape(item.unit)} · ${money(item.priceCents)}</small>${item.quantityNote ? `<small>${escape(item.quantityNote)}</small>` : ""}</div><label class="shopping-quantity">Quantity<input type="number" min="1" max="20" step="1" required data-shopping-key="${escape(item.merchantId + ":" + item.sku)}" aria-label="Quantity of ${escape(item.label)}" value="${Number.isFinite(item.quantity) ? item.quantity : ""}"></label><button class="icon-button" type="button" data-shopping-action="remove" data-key="${escape(item.merchantId + ":" + item.sku)}" aria-label="Remove ${escape(item.label)}">${icon("close")}</button></article>`).join("")}</div>${!totals.items.length ? '<div class="empty-state">Your list is empty. Restore the selection or make a new plan.</div>' : ""}<button type="button" class="btn btn-text" data-shopping-action="reset">Restore original selection</button><p class="shopping-unit-note">Quantities refer to shop units. Screws come in boxes of 500; croissants come in packs of 6. Each unit creates a receipt.</p></div><aside class="shopping-summary"><h3>Your request, at a glance</h3><dl class="receipt-details"><div><dt>Shopping-list total</dt><dd id="shopping-total">${totals.valid ? money(totals.total) : "—"}</dd></div><div><dt>Wallet charge</dt><dd id="shopping-wallet">${totals.valid ? money(totals.wallet) : "—"}</dd></div><div><dt>Your request budget</dt><dd>${plan.budgetCapCents === null ? "Not specified" : money(plan.budgetCapCents)}</dd></div><div><dt>Daily budget left</dt><dd>${state.data.agent ? money(state.data.budget?.remainingCents) : "Create agent"}</dd></div></dl><p class="shopping-summary-note">Bakery items count toward your spending limit without charging the wallet.</p><div id="shopping-blockers" class="shopping-blockers" role="status">${blockers.map((b) => `<p>${escape(b)}</p>`).join("")}</div>${!state.data.agent ? '<button class="btn btn-primary full-width" type="button" data-action="setup">Create agent</button>' : ""}<button class="btn btn-primary full-width" id="shopping-review" type="button" data-shopping-action="review" ${blockers.length ? "disabled" : ""}>Review & buy ${icon("arrow")}</button><small class="shopping-expiry">Quote valid until ${new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(plan.expiresAt)}</small></aside></div></section>`;
}
function shoppingHistory() {
  const plans = state.data.shoppingPlans || [];
  if (!plans.length) return "";
  return `<section class="panel shopping-history"><div class="panel-heading"><h2>Recent requests</h2><span class="compact-label">Saved in this workspace</span></div>${plans.map((plan) => `<button type="button" class="shopping-history-item" data-shopping-action="history" data-id="${escape(plan.id)}"><span>${icon("agent")}</span><span class="shopping-history-text">${escape(plan.prompt)}<small>${dateTime(plan.createdAt)}</small></span><span class="badge ${["review", "partial", "failed"].includes(plan.status) ? "warn" : "neutral"}">${escape(plan.status)}</span>${icon("chevron")}</button>`).join("")}</section>`;
}
function requestPage() {
  return (
    heading(
      "Ask your shopping agent",
      "Tell your agent what you need. You stay in control of what it buys.",
    ) +
    shoppingComposer() +
    (state.shoppingError
      ? `<div class="alert error" role="alert">${icon("alert")}${escape(state.shoppingError)}</div>`
      : "") +
    `<div id="shopping-plan-container">${shoppingPlanPanel()}</div>` +
    shoppingHistory()
  );
}
function updateShoppingTotals() {
  const totals = shoppingTotals();
  if ($("#shopping-total"))
    $("#shopping-total").textContent = totals.valid ? money(totals.total) : "—";
  if ($("#shopping-wallet"))
    $("#shopping-wallet").textContent = totals.valid
      ? money(totals.wallet)
      : "—";
  const blockers = shoppingBlockers();
  if ($("#shopping-blockers"))
    $("#shopping-blockers").innerHTML = blockers
      .map((b) => `<p>${escape(b)}</p>`)
      .join("");
  if ($("#shopping-review"))
    $("#shopping-review").disabled = blockers.length > 0;
}
function reviewShoppingPlan() {
  const blockers = shoppingBlockers();
  if (blockers.length) return toast(blockers[0]);
  const totals = shoppingTotals();
  state.shoppingApproval = {
    confirmed: true,
    acceptMatchedOnly: state.shoppingAcceptPartial,
    items: totals.items.map(({ merchantId, sku, quantity }) => ({
      merchantId,
      sku,
      quantity,
    })),
  };
  showDialog(
    dialogHeader(
      "Approve this shopping list",
      "Your agent will purchase only these products and quantities.",
    ) +
      `<div class="shopping-confirm-lines">${totals.items.map((item) => `<div><span>${item.quantity} × ${escape(item.label)}</span><strong>${money(item.quantity * item.priceCents)}</strong></div>`).join("")}</div><dl class="receipt-details"><div><dt>Total against your budget</dt><dd>${money(totals.total)}</dd></div><div><dt>Simulated wallet charge</dt><dd>${money(totals.wallet)}</dd></div></dl>${state.shoppingPlan.unmatched.length ? '<p class="dialog-note">You chose to leave unmatched items out of this purchase.</p>' : ""}<form id="shopping-confirm-form"><div class="form-error" role="alert"></div><div class="dialog-footer">${button("Keep editing", "close-dialog", "btn")}<button type="submit" class="btn btn-primary">${icon("shield")}Approve & buy ${money(totals.total)}</button></div></form><p class="dialog-note">Prices and your spending limits are checked again before checkout. If a purchase fails, the agent stops the remaining purchases. Completed purchases are not automatically reversed.</p>`,
  );
}

document.addEventListener("input", (event) => {
  if (event.target.id === "shopping-prompt") {
    state.shoppingText = event.target.value;
    state.shoppingDirty = true;
  }
  if (event.target.dataset.shoppingKey) {
    const raw = event.target.value;
    state.shoppingQuantities[event.target.dataset.shoppingKey] =
      raw === "" ? NaN : Number(raw);
    state.shoppingDirty = true;
    updateShoppingTotals();
  }
  if (event.target.id === "shopping-partial") {
    state.shoppingAcceptPartial = event.target.checked;
    state.shoppingDirty = true;
    updateShoppingTotals();
  }
});
document.addEventListener("click", async (event) => {
  const target = event.target.closest("[data-shopping-action]");
  if (!target || state.busy) return;
  const action = target.dataset.shoppingAction;
  if (action === "example") {
    state.shoppingText = shoppingExamples[Number(target.dataset.index)];
    state.shoppingDirty = true;
    $("#shopping-prompt").value = state.shoppingText;
    $("#shopping-prompt").focus();
  }
  if (action === "remove") {
    state.shoppingQuantities[target.dataset.key] = 0;
    state.shoppingDirty = true;
    $("#shopping-plan-container").innerHTML = shoppingPlanPanel();
  }
  if (action === "reset") {
    state.shoppingQuantities = Object.fromEntries(
      state.shoppingPlan.items.map((item) => [
        `${item.merchantId}:${item.sku}`,
        item.quantity,
      ]),
    );
    state.shoppingDirty = true;
    $("#shopping-plan-container").innerHTML = shoppingPlanPanel();
  }
  if (action === "review") reviewShoppingPlan();
  if (action === "new") {
    state.shoppingPlan = null;
    state.shoppingNew = true;
    state.shoppingText = "";
    state.shoppingError = null;
    state.shoppingDirty = false;
    render();
    $("#shopping-prompt").focus();
  }
  if (action === "history") {
    const plan = state.data.shoppingPlans.find(
      (plan) => plan.id === target.dataset.id,
    );
    if (plan) {
      setShoppingPlan(plan);
      state.shoppingDirty = false;
      state.shoppingError = null;
      render();
    }
  }
  if (action === "refresh") {
    state.busy = true;
    try {
      const result = await api(`shopping/plans/${state.shoppingPlan.id}`);
      setShoppingPlan(result.plan, result.plan.status === "draft");
      state.shoppingError = null;
      state.shoppingDirty = false;
      await load();
      render();
    } catch (error) {
      toast(error.message);
    } finally {
      state.busy = false;
    }
  }
});
document.addEventListener("submit", async (event) => {
  const form = event.target;
  if (!["shopping-request-form", "shopping-confirm-form"].includes(form.id))
    return;
  event.preventDefault();
  if (state.busy) return;
  state.busy = true;
  state.shoppingError = null;
  if (form.id === "shopping-request-form") {
    const prompt = new FormData(form).get("prompt");
    state.shoppingText = prompt;
    state.shoppingPlanning = true;
    state.shoppingDirty = false;
    state.page = "request";
    if (location.hash !== "#request") location.hash = "#request";
    render();
    try {
      const result = await api("shopping/plans", { prompt });
      setShoppingPlan(result.plan);
      await load({ quiet: true });
    } catch (error) {
      state.shoppingError = error.message;
    } finally {
      state.shoppingPlanning = false;
      state.busy = false;
      render();
    }
    return;
  }
  const planId = state.shoppingPlan.id;
  const buttons = [...$("#action-dialog").querySelectorAll("button")];
  buttons.forEach((button) => (button.disabled = true));
  form.querySelector('[type="submit"]').textContent =
    "Your agent is checking out…";
  try {
    const result = await api(
      `shopping/plans/${planId}/confirm`,
      state.shoppingApproval,
    );
    setShoppingPlan(result.plan);
    state.shoppingDirty = false;
    $("#action-dialog").close();
    await load();
    render();
  } catch (error) {
    if (error.data?.plan)
      setShoppingPlan(error.data.plan, error.data.plan.status === "draft");
    else {
      // Reading status is safe. Never repeat a payment when a response is lost.
      try {
        const result = await api(`shopping/plans/${planId}`);
        setShoppingPlan(result.plan, result.plan.status === "draft");
      } catch {
        state.shoppingPlan.status = "review";
        state.shoppingPlan.message =
          "The connection was lost during confirmation. Refresh request status before making another purchase.";
      }
    }
    state.shoppingError = error.message;
    $("#action-dialog").close();
    await load();
    render();
  } finally {
    state.busy = false;
    buttons.forEach((button) => (button.disabled = false));
  }
});
