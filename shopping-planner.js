"use strict";

// This small catalog uses explicit aliases, not a hosted language model.
// Unknown items and ambiguous instructions always require review.
const META = {
  taladro: {
    aliases: [
      "hammer drill",
      "power drill",
      "percussion drill",
      "drill",
      "taladro percutor",
      "taladro",
    ],
    label: "Hammer drill",
    unit: "drill",
  },
  tornillos: {
    aliases: [
      "boxes of screws",
      "box of screws",
      "screws",
      "screw",
      "tornillos",
      "tornillo",
    ],
    label: "Screws, box of 500",
    unit: "box of 500 screws",
    packSize: 500,
  },
  guantes: {
    aliases: [
      "work gloves",
      "working gloves",
      "safety gloves",
      "gloves",
      "glove",
      "guantes de trabajo",
      "guantes",
    ],
    label: "Work gloves",
    unit: "pair of gloves",
  },
  barra: {
    aliases: [
      "loaves of bread",
      "loaf of bread",
      "bread loaf",
      "bread",
      "barra de pan",
      "pan",
    ],
    label: "Bread loaf",
    unit: "loaf",
  },
  croissants: {
    aliases: ["croissants x6", "croissants", "croissant"],
    label: "Croissants, pack of 6",
    unit: "pack of 6 croissants",
    packSize: 6,
  },
  tarta: {
    aliases: [
      "apple tart",
      "apple pie",
      "tart",
      "pie",
      "cake",
      "tarta de manzana",
      "tarta",
    ],
    label: "Apple tart",
    unit: "tart",
  },
};
const numberWords = {
  a: 1,
  an: 1,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
  un: 1,
  una: 1,
  uno: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
};
const normalize = (text) =>
  text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[’‘]/g, "'");
const regexEscape = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const quantityPattern = new RegExp(
  `(?:^|\\s)(-?\\d+(?:[.,]\\d+)?|${Object.keys(numberWords).join("|")})\\s*(?:x\\s*)?(?:(?:pairs?|boxes|box|packs?|packets?|bags?|units?|pieces?|loaves|loaf|pares?|cajas?|paquetes?)\\s*(?:of\\s*|de\\s*)?)?$`,
);

function planShoppingRequest(prompt, merchants) {
  if (typeof prompt !== "string" || !prompt.trim() || prompt.length > 1200)
    throw new Error("Describe what you need in 1 to 1,200 characters.");
  const questions = [];
  const unmatched = [];
  const items = new Map();
  let text = normalize(prompt.trim());
  let budgetCapCents = null;
  const amounts = [];
  const number = "(\\d+(?:[.,]\\d{1,2})?)";
  const constraint = new RegExp(
    `\\b(?:under|below|within|up to|less than|budget(?: of| is|:)?|no more than|not over|hasta|menos de|presupuesto(?: de)?)\\s*(?:€|eur(?:os?)?)?\\s*${number}\\s*(?:€|eur(?:os?)?)?`,
    "g",
  );
  text = text.replace(constraint, (_match, value) => {
    amounts.push(value);
    return " ";
  });
  text = text.replace(
    new RegExp(
      `(?:€\\s*${number}|${number}\\s*(?:euros?|eur|€))\\s*(?:max(?:imum)?|budget|total)?`,
      "g",
    ),
    (_match, a, b) => {
      amounts.push(a || b);
      return " ";
    },
  );
  if (amounts.length) {
    budgetCapCents = Math.min(
      ...amounts.map((value) =>
        Math.round(Number(value.replace(",", ".")) * 100),
      ),
    );
    if (
      !Number.isSafeInteger(budgetCapCents) ||
      budgetCapCents < 1 ||
      budgetCapCents > 1000000
    )
      questions.push("Set a request budget between €0.01 and €10,000.");
  }
  if (/[$£]|\b(?:usd|gbp|dollars?|pounds?)\b/.test(text))
    questions.push(
      "The connected shops use euros. Please write the request budget in euros.",
    );
  if (
    /\b(?:or|either|instead|don't|do not|without|except|not|never|sin|no)\b/.test(
      text,
    )
  )
    questions.push(
      "Please list only the items you want to buy. Choose one alternative and remove exclusions before planning.",
    );
  if (/\bper (?:item|purchase|unit)\b/.test(text))
    questions.push(
      "Use a total request budget here. Set the per-purchase limit in Agent settings.",
    );
  const available = merchants.flatMap((merchant) =>
    merchant.products.map((product) => ({
      ...product,
      merchantId: merchant.id,
      merchant: merchant.name,
      payment: merchant.payment,
    })),
  );
  text = text.replace(/(\d),(\d)/g, "$1.$2");
  const clauses = text
    .split(/\b(?:and|with|plus|also|y)\b|[,;\n+]/)
    .map((c) => c.trim())
    .filter(Boolean);
  for (const clause of clauses) {
    const spans = [];
    for (const product of available) {
      const meta = META[product.sku] || {
        aliases: [product.sku, product.name],
        label: product.name,
        unit: "item",
      };
      const aliases = [
        ...new Set([...meta.aliases, normalize(product.name)]),
      ].sort((a, b) => b.length - a.length);
      const matcher = new RegExp(
        `\\b(?:${aliases.map((a) => regexEscape(a)).join("|")})\\b`,
        "g",
      );
      let match;
      while ((match = matcher.exec(clause))) {
        let start = match.index;
        let end = match.index + match[0].length;
        const before = clause.slice(0, start);
        const quantityMatch = before.match(quantityPattern);
        const after = clause.slice(end).match(/^\s*x\s*(\d+(?:[.,]\d+)?)/);
        let quantity = 1;
        if (quantityMatch) {
          quantity =
            numberWords[quantityMatch[1]] ??
            Number(quantityMatch[1].replace(",", "."));
          start = quantityMatch.index;
        }
        if (after) {
          quantity = Number(after[1].replace(",", "."));
          end += after[0].length;
        }
        spans.push([start, end]);
        let quantityNote = null;
        if (
          meta.packSize &&
          quantityMatch &&
          !after &&
          !/\b(?:boxes|box|packs?|packets?|cajas?|paquetes?)\b/.test(
            clause.slice(start, end),
          )
        ) {
          if (
            !Number.isSafeInteger(quantity) ||
            quantity <= 0 ||
            quantity % meta.packSize !== 0
          ) {
            questions.push(
              `${meta.label} are sold by the pack. Ask for packs/boxes, or a multiple of ${meta.packSize} individual items.`,
            );
            continue;
          }
          quantityNote = `${quantity} requested items = ${quantity / meta.packSize} shop units.`;
          quantity /= meta.packSize;
        }
        if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 20) {
          questions.push(
            `Use a whole-number quantity from 1 to 20 for ${meta.label.toLowerCase()}.`,
          );
          continue;
        }
        const key = `${product.merchantId}:${product.sku}`;
        const previous = items.get(key);
        if (previous) previous.quantity += quantity;
        else
          items.set(key, {
            merchantId: product.merchantId,
            merchant: product.merchant,
            sku: product.sku,
            name: product.name,
            label: meta.label,
            unit: meta.unit,
            priceCents: product.priceCents,
            payment: Boolean(product.payment),
            quantity,
            quantityNote,
          });
      }
    }
    let remainder = clause;
    for (const [start, end] of spans.sort((a, b) => b[0] - a[0]))
      remainder = remainder.slice(0, start) + " " + remainder.slice(end);
    remainder = remainder
      .replace(/\bfor\b.*$/, "")
      .replace(/\bpara\b.*$/, "")
      .replace(
        /\b(?:please|i|need|want|would|like|buy|get|order|purchase|me|my|can|you|find|the|some|a|an|of|pick|up|bring|add|to|cart|shopping|list|quiero|necesito|comprar|por|favor|unos|unas|de|un|una)\b/g,
        " ",
      )
      .replace(/[^a-z0-9\s'-]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (remainder) unmatched.push(remainder);
  }
  const matched = [...items.values()];
  if (matched.reduce((sum, item) => sum + item.quantity, 0) > 20)
    questions.push(
      "A request can contain at most 20 catalog units. Split this into smaller requests.",
    );
  if (!matched.length && !unmatched.length)
    questions.push(
      "Which items do you need? Try gloves, screws, a drill, bread, croissants, or an apple tart.",
    );
  return {
    prompt: prompt.trim(),
    items: matched,
    unmatched: [...new Set(unmatched)],
    questions: [...new Set(questions)],
    budgetCapCents,
    method: "local-catalog",
  };
}
module.exports = { planShoppingRequest };
