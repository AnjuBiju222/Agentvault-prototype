const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const express = require("express");
const http = require("node:http");
const Database = require("better-sqlite3");
const { createApp } = require("../ui-server");
const { hostedAccess } = require("../hosted-access");
const password = "hosted-verification-password-only";
const credentials = "Basic " + Buffer.from("agentvault:" + password).toString("base64");
async function fixture(t, dataDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "agentvault-hosted-"))) {
  const app = createApp({ dataDirectory, publicOrigin: "https://agentvault.example", username: "agentvault", password });
  const server = app.listen(0, "127.0.0.1");
  await new Promise(resolve => server.once("listening", resolve));
  t.after(() => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }));
  return { dataDirectory, request: (route, options = {}) => new Promise((resolve, reject) => {
    const req = http.request({ hostname: "127.0.0.1", port: server.address().port, path: route,
      method: options.method || "GET",
      headers: { Host: "agentvault.example", Authorization: credentials, ...options.headers }
    }, response => {
      const chunks = [];
      response.on("data", chunk => chunks.push(chunk));
      response.on("end", () => {
        const body = Buffer.concat(chunks).toString("utf8");
        const headers = new Headers();
        for (const [name, value] of Object.entries(response.headers))
          for (const part of Array.isArray(value) ? value : [value])
            if (part !== undefined) headers.append(name, part);
        resolve({ status: response.statusCode, headers, json: async () => JSON.parse(body), text: async () => body });
      });
    });
    req.on("error", reject);
    req.setTimeout(5000, () => req.destroy(Error("Request timed out")));
    req.end(options.body);
  }) };
}
test("hosted dashboard requires sign-in, while health probes disclose no session", async t => {
  const { request } = await fixture(t);
  const health = await request("/api/health", { headers: { Authorization: "", Host: "127.0.0.1" } });
  assert.equal(health.status, 200);
  assert.deepEqual(await health.json(), { ok: true, app: "agent-stack-ui" });
  assert.equal(health.headers.get("set-cookie"), null);
  for (const route of ["/", "/app.js", "/api/dashboard"]) {
    const blocked = await request(route, { headers: { Authorization: "" } });
    assert.equal(blocked.status, 401);
    assert.match(blocked.headers.get("www-authenticate"), /Basic/);
    assert.equal(blocked.headers.get("set-cookie"), null);
  }
  assert.equal((await request("/")).status, 200);
  assert.equal((await request("/app.js")).status, 200);
  assert.equal((await request("/", { headers: { Authorization: "Basic " + Buffer.from("agentvault:wrong").toString("base64") } })).status, 401);
});
test("hosted requests enforce the configured host and browser origin", async t => {
  const { request } = await fixture(t);
  assert.equal((await request("/", { headers: { Host: "attacker.example", "X-Forwarded-Host": "agentvault.example" } })).status, 403);
  const options = { method: "POST", body: "{}", headers: { "Content-Type": "application/json", "X-Requested-With": "AgentStack" } };
  assert.equal((await request("/api/missing", { ...options, headers: { ...options.headers, Origin: "https://attacker.example" } })).status, 403);
  assert.equal((await request("/api/missing", { ...options, headers: { ...options.headers, Origin: "https://agentvault.example" } })).status, 404);
});
test("hosted sessions use secure cookies and survive reopening their data directory", async t => {
  const first = await fixture(t);
  const response = await first.request("/api/missing");
  assert.equal(response.status, 404);
  const setCookie = response.headers.get("set-cookie");
  assert.match(setCookie, /HttpOnly/i);
  assert.match(setCookie, /Secure/i);
  assert.match(setCookie, /SameSite=Strict/i);
  const cookie = setCookie.split(";")[0];
  const db = new Database(path.join(first.dataDirectory, "dashboard.db"), { readonly: true });
  const original = db.prepare("SELECT agent_id FROM profiles").get().agent_id;
  const second = await fixture(t, first.dataDirectory);
  assert.equal((await second.request("/api/missing", { headers: { Cookie: cookie } })).status, 404);
  assert.deepEqual(db.prepare("SELECT agent_id FROM profiles").all(), [{ agent_id: original }]);
  db.close();
});
test("hosted configuration rejects missing credentials and invalid public URLs", () => {
  const app = express();
  assert.throws(() => hostedAccess(app, { publicOrigin: "https://agentvault.example", username: "agentvault" }), /DEMO_PASSWORD/);
  for (const publicOrigin of ["http://agentvault.example", "https://agentvault.example/path", "https://user:pass@agentvault.example"]) {
    assert.throws(() => hostedAccess(app, { publicOrigin, username: "agentvault", password }), /HTTPS origin/);
  }
});
