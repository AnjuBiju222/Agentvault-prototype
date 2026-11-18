// Authentication is optional so the same integration checks work locally and when hosted.
module.exports = function testFetch(input, options = {}) {
  const base = new URL(process.env.TEST_URL || "http://localhost:8080");
  const url = new URL(input, base);
  const headers = new Headers(options.headers);
  if (url.origin === base.origin && process.env.TEST_PASSWORD) {
    headers.set("Authorization", "Basic " + Buffer.from(
      `${process.env.TEST_USER || "agentvault"}:${process.env.TEST_PASSWORD}`
    ).toString("base64"));
    if (process.env.TEST_ORIGIN && !headers.has("Origin"))
      headers.set("Origin", process.env.TEST_ORIGIN);
  }
  return globalThis.fetch(input, { ...options, headers });
};
