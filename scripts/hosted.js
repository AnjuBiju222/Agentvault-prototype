const path = require("node:path");
const origin = process.env.PUBLIC_ORIGIN || process.env.RENDER_EXTERNAL_URL;
if (!origin || !process.env.DEMO_PASSWORD || !process.env.AGENTVAULT_DATA_DIR)
  throw Error("Set PUBLIC_ORIGIN (or RENDER_EXTERNAL_URL), DEMO_PASSWORD and AGENTVAULT_DATA_DIR before hosted startup.");
if (!path.isAbsolute(process.env.AGENTVAULT_DATA_DIR))
  throw Error("AGENTVAULT_DATA_DIR must be an absolute path.");
const port = Number(process.env.PORT || process.env.UI_PORT || 10000);
if (!Number.isInteger(port) || port < 1 || port > 65535 || [3000,3001,4000,4001].includes(port))
  throw Error("PORT must be a valid port outside the internal service ports.");
process.env.AGENTVAULT_HOSTED = "1";
process.env.PUBLIC_ORIGIN = origin;
process.env.UI_PORT = String(port);
process.env.NODE_ENV = "production";
delete process.env.ALLOW_DEV_RESET;
require("./start");
