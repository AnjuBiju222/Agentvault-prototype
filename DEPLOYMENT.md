# Hosted AgentVault demo

This deployment runs the dashboard and all four original services on one Node 24 instance. Only the dashboard binds to the external interface. Payments remain simulated.

## Render

Use `render.yaml` for a free demonstration. All data resets whenever Render restarts or redeploys the instance. Use `render.persistent.yaml` only after approving the current paid service and disk costs. It keeps all service ledgers and dashboard keys on a 1 GB disk. Run one instance with one disk.

Connect Render to the source repository containing this deployment version, choose the selected Blueprint file and branch, then deploy. Automatic deploys are disabled. Render provides `RENDER_EXTERNAL_URL`; the application uses it as its expected browser origin. For another host, set `PUBLIC_ORIGIN` to the dashboard's HTTPS origin.

The browser asks for a username and password. The username is `agentvault`. Render generates `DEMO_PASSWORD`; retrieve it from the service's Environment settings and share it only with demo viewers. Each browser retains its own agent and purchase history. Merchant billing totals cover all agents in the demonstration.

`AGENTVAULT_DATA_DIR` must be an absolute path on the chosen disk. `PORT` chooses the public dashboard port. Ports 3000, 3001, 4000 and 4001 are loopback-only. `/api/health` is available without a password and returns no account data. Hosted startup disables the development-reset endpoints.

## Other Node or Docker hosts

Install production dependencies using `npm ci --omit=dev`. Set `PUBLIC_ORIGIN`, `DEMO_USER`, a generated `DEMO_PASSWORD` of at least 16 characters and `AGENTVAULT_DATA_DIR`. Start with `npm run start:hosted`. For Docker, build the provided Dockerfile, publish only port 10000 and mount persistent storage at `/home/node/agentvault-data` writable by UID 1000.

## Verification

Use `npm run test:unit`. Against a hosted instance, set `TEST_URL`, `TEST_USER` and `TEST_PASSWORD` before `npm test`. Set `TEST_ORIGIN` when testing through an HTTP proxy for the configured HTTPS origin. Integration checks create synthetic records and use simulated funds.

Local development continues to use `npm start` on localhost without hosted credentials.
