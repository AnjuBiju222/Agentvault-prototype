const { spawn } = require("node:child_process");
const path = require("node:path");
const children = [];
let stopping = false;
const services = [
  ["facilitator.js", 4001, "/balances"],
  ["verifier-service.js", 4000, "/billing"],
  ["shop.js", 3000, "/catalog"],
  ["panaderia.js", 3001, "/catalog"],
  ["ui-server.js", Number(process.env.UI_PORT || 8080), "/api/health"],
];
async function healthy(port, route) {
  try {
    const response = await fetch(`http://127.0.0.1:${port}${route}`, {
      signal: AbortSignal.timeout(1000),
    });
    const body = await response.json();
    return (
      response.ok &&
      (route === "/api/health"
        ? body.app === "agent-stack-ui"
        : route === "/catalog"
          ? !!Object.keys(body).length
          : Array.isArray(body))
    );
  } catch {
    return false;
  }
}
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill();
  process.exitCode = code;
}
async function main() {
  for (const [file, port, route] of services) {
    if (await healthy(port, route)) {
      if (process.env.AGENTVAULT_HOSTED === "1")
        throw Error(`Port ${port} is already occupied. Hosted startup requires its own services.`);
      console.log(`Using running ${file} on :${port}`);
      continue;
    }
    const child = spawn(process.execPath, [path.join(__dirname, "..", file)], {
      cwd: path.join(__dirname, ".."),
      stdio: "inherit",
      windowsHide: true,
    });
    children.push(child);
    child.on("exit", (code) => {
      if (!stopping) {
        console.error(`${file} exited (${code}). Stopping this stack.`);
        stop(code || 1);
      }
    });
    let ready = false;
    for (let i = 0; i < 40 && !stopping; i++) {
      if (await healthy(port, route)) {
        ready = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    if (!ready)
      throw new Error(
        `${file} could not start on port ${port}. Check for another app using that port.`,
      );
  }
  if (!stopping)
    console.log(
      `\nOpen http://localhost:${process.env.UI_PORT || 8080}\nPress Ctrl+C to stop services started by this command.`,
    );
}
process.on("SIGINT", () => stop());
process.on("SIGTERM", () => stop());
main().catch((error) => {
  console.error(error.message);
  stop(1);
});
