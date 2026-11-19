## Browser dashboard

Run the complete local workspace from the repository root:

```sh
npm install
npm start
```

Open **http://localhost:8080**. Choose **Create agent** to register a new
identity and receive €150 in simulated wallet funds.

### Ask the agent to shop

Open **Ask your agent**, or use **What do you need?** on the overview. Try:

- "Buy 2 pairs of gloves and a box of screws under €50"
- "Get bread and a pack of croissants under €15"
- "I need a drill and gloves for a building project"

Click **Make a shopping plan**. Review the matched products, quantities, pack
sizes, total budget usage, and wallet charge. Change quantities or remove items,
then click **Review & buy** and **Approve & buy**. Nothing is purchased while
planning. You can also make a plan before creating an agent, then create the
agent from the review screen.

Matching runs locally against the six products in the connected shops. It
recognizes English and Spanish product names, common aliases, numeric and
written quantities, and total euro budgets. It does **not** use a language model
or need an AI API key. It cannot infer arbitrary project requirements or shop
on external websites. Unmatched items are shown explicitly; the user must
revise the request or choose to buy only the matched items. Alternatives,
exclusions, invalid quantities, and ambiguous requests require a revised request.

Quantities refer to catalog units: gloves are pairs, screws are boxes of 500,
and croissants are packs of six. Exact physical counts such as "12 croissants"
become two packs. Counts that cannot be filled exactly require clarification.
A request can contain at most 20 catalog units. Individual units create separate
receipts, while a product line's full cost is checked against the per-purchase
limit before starting. All selected items count toward the shared daily budget.
The request's total budget is also enforced separately.

Plans persist in the same browser workspace and appear in **Recent requests**.
Quotes expire after 20 minutes. The server checks current prices, limits, and
wallet funds before any purchase; a changed price requires a fresh plan.
Confirmation is saved before checkout and repeated confirmations return the
same result. If a purchase fails, remaining items are not attempted. Completed
purchases are not automatically reversed, and uncertain outcomes require review.
An interrupted checkout is marked for review after a dashboard restart.

The dashboard includes:

- An overview with the live wallet balance, today's spending, and recent activity.
- Both merchant catalogs, product search, and signed checkout with receipts.
- Per-purchase and shared daily spending limits in Agent settings.
- Demo wallet top-ups and the verifier's merchant billing totals.
- A persistent activity history and connection status for all four services.

The tool shop settles simulated wallet payments. The bakery only records
spending against the daily budget; it does not charge the wallet. The UI shows
this distinction before checkout and on receipts. Adding wallet funds does not
increase the spending limit. Changes to limits preserve spending already recorded.

`npm start` starts any missing services in order, then starts the dashboard.
It reuses services already listening on the expected endpoints. Stop it with
Ctrl+C to stop services it started. After updating service code, restart that
service to load the changes. To run just the dashboard with the existing four
services, use `npm run ui`. Set `UI_PORT` to choose a different dashboard port.

The browser talks to `ui-server.js` on port 8080. That server calls the original
services on ports 3000, 3001, 4000, and 4001, signs requests with the existing
signature helpers, and handles the 402 payment challenge. Prices come from
merchant catalogs. A read-only, merchant-key-protected verifier route,
`GET /agents/:agentId/summary`, supplies current spending and active holds.
Duplicate request IDs return the original operation instead of paying again.
Requests with uncertain outcomes are marked for review and are not retried
automatically.

Each browser session gets its own agent and activity history using an HttpOnly,
SameSite cookie. Signing keys and dashboard records persist locally under
`.data/`, which Git ignores. Clearing the cookie creates a new workspace.
Service ledgers remain in the original `.db` files. Merchant billing shows
shared totals across all demo agents. Keep using `localhost` rather than
switching between it and `127.0.0.1`, which have separate browser cookies.

This is a **local demo**, bound to the loopback interface. It has no production
sign-in or real payments. The original services retain their prototype APIs.
Do not publish or expose them as a production checkout application.

### Verify the integration

With `npm start` running, use a second terminal:

```sh
npm run test:integration
```

`npm test` runs the unit, service, request-flow, and DOM integration checks.
`npm run test:unit` runs the planner and checkout fault tests without needing
running services. `npm run test:ui` runs the actual UI scripts and forms in an
isolated jsdom document connected to the local services. Native dialog display
methods are shimmed there; it does not verify browser layout or screenshots.

The integration checks create isolated demo agents and check service availability, onboarding,
one-time funding, private-key isolation, signed payments, authoritative pricing,
per-purchase and cross-shop daily limits, duplicate-request handling, top-ups,
settings, history, billing, and browser-session isolation. It uses only simulated
funds and leaves its test records in the local demo ledgers.

---
AgentVault

Cryptographic identity and spending limits for AI agents at checkout, built
from scratch to understand the problem. Agents sign their requests, a hosted
verifier proves who they are and enforces the budget their owner set, and
payment settles over x402.

Read this first: this project is not a business, and the section at the
bottom explains why in detail. It's a working, reviewed implementation of an
architecture that Visa, Cloudflare, AWS and Coinbase are shipping with far
more behind them. It's worth reading for the failure modes, not as something
to adopt.

What's here


verifier-service.js (:4000), the core. Agent registry (KYA), RFC 9421
signature verification, replay protection, spending mandates enforced with
holds, idempotent capture, and exposure rebuilt from settled network events
rather than trusted from a local counter.
facilitator.js (:4001), the settlement layer. Holds balances, settles
payments, issues refunds, and answers "what settled for this payer" by ref
so a crashed merchant can recover.
agent-ready-sdk.js, the thin open half a merchant installs. No security
logic; it forwards signature material to the verifier and obeys the verdict.
Fails closed by default.
shop.js (:3000), a merchant (ferretería). Writes an intent row before
settling and runs its own reconciler that refunds settlements with no
delivery and commits deliveries that were never captured.
panaderia.js (:3001), a second merchant on the same verifier, to show
the cross-merchant budget in action.
agent.js, an AI agent buying supplies for a building job.
x402.js / httpsig.js — the payment handshake and the RFC 9421 signing.
reset.js, clears demo state between runs (see below).


Run (four terminals, in order)

npm install
node facilitator.js
node verifier-service.js
node shop.js
node panaderia.js
node agent.js        # in a sixth terminal, or reuse one

The agent buys at both shops on one identity. Watch the daily mandate deplete
across merchants, the unsigned bot get bounced, and /billing meter each
verification.

Re-running the demo

Every service is deliberately persistent — budgets that survive a restart are
the whole point of a spending mandate. That makes the demo a one-shot: the
agent spends most of its daily limit, so a second run is correctly denied.

To run again without restarting, start facilitator, verifier and shop with
ALLOW_DEV_RESET=1 set, then:

node reset.js && node agent.js

Never set that flag anywhere real, it exposes an endpoint that wipes the
ledger.

Testing the hard parts

The interesting behaviour is in the crash and retry seams. Two switches expose
them:


BREAK_RELEASE=1 node shop.js, disables the release-on-402 path, so the
retry has to supersede its own stale hold by intent id. Purchase should still
land at the right total.
CRASH_AFTER_SETTLE=1 node shop.js, kills the shop after settling, before
delivering. Within ~10s the verifier counts the orphaned spend from the
network and the shop refunds the undelivered goods. Two reconcilers in
different services, correcting off the same network record.


What this got right, and what it got wrong

This was built without knowing Visa's Trusted Agent Protocol existed, and
independently arrived at the same design: RFC 9421 signatures, a public-key
directory, merchant-side verification. That convergence says the reasoning was
sound.

But the central bet, that spending limits have to be enforced in the middle,
merchant-side, because no single merchant sees an agent's total spend — turned
out to be wrong. Visa, AWS and xpay all enforce the budget at the source: the
agent's runtime, proxy, or credential. Source-side enforcement is
cross-merchant by construction; it covers every shop, including ones that never
enrolled. Merchant-side enforcement only covers merchants who signed up.

So the architecture is correct and the market position isn't. See THESIS.md for
the full argument and COMPETITORS.md for what each incumbent actually ships.

Credit

The crash and retry handling exists because engineers on r/AI_Agents reviewed
the first version and pointed out where it broke. The correlation id, the
intent-before-settle pattern, and rebuilding exposure from network events are
all theirs.it, break it.
