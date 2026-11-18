const crypto = require("node:crypto");
const digest = (value) => crypto.createHash("sha256").update(value).digest();
function hostedAccess(app, { publicOrigin, username, password }) {
  if (!publicOrigin) return null;
  const url = new URL(publicOrigin);
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
      url.username || url.password || url.search || url.hash || url.pathname !== "/")
    throw Error("PUBLIC_ORIGIN must be an HTTPS origin without a path.");
  if (!username || username.includes(":")) throw Error("DEMO_USER is invalid.");
  if (typeof password !== "string" || password.length < 16)
    throw Error("Hosted demos require DEMO_PASSWORD with at least 16 characters.");
  const expectedUser = digest(username);
  const expectedPassword = digest(password);
  // A health probe never creates a session or exposes account data.
  app.get("/api/health", (_req, res) => res.json({ ok: true, app: "agent-stack-ui" }));
  app.use((req, res, next) => {
    if (req.get("Host")?.toLowerCase() !== url.host.toLowerCase())
      return res.status(403).json({ error: "Open the configured dashboard URL." });
    res.set("Cache-Control", "no-store");
    const header = req.get("Authorization") || "";
    const decoded = /^Basic /i.test(header)
      ? Buffer.from(header.slice(6), "base64").toString("utf8") : "";
    const separator = decoded.indexOf(":");
    const user = separator < 0 ? "" : decoded.slice(0, separator);
    const pass = separator < 0 ? "" : decoded.slice(separator + 1);
    const userMatches = crypto.timingSafeEqual(digest(user), expectedUser);
    const passwordMatches = crypto.timingSafeEqual(digest(pass), expectedPassword);
    if (!userMatches || !passwordMatches) {
      res.set("WWW-Authenticate", 'Basic realm="AgentVault demo", charset="UTF-8"');
      return res.status(401).send("Sign in to the AgentVault demo.");
    }
    next();
  });
  return { origin: url.origin, host: url.host, secure: url.protocol === "https:" };
}
module.exports = { hostedAccess };
