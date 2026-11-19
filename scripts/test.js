const { spawnSync } = require("node:child_process");
for (const args of [
  ["--test", "tests/shopping-planner.test.js", "tests/shopping-routes.test.js"],
  ["scripts/smoke-test.js"],
  ["scripts/shopping-test.js"],
  ["scripts/ui-test.js"],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: require("node:path").join(__dirname, ".."),
    stdio: "inherit",
    windowsHide: true,
  });
  if (result.error) {
    console.error(result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) process.exit(result.status || 1);
}
