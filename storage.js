const fs = require("node:fs");
const path = require("node:path");
function dataPath(name) {
  const directory = process.env.AGENTVAULT_DATA_DIR || __dirname;
  fs.mkdirSync(directory, { recursive: true });
  return path.join(directory, name);
}
module.exports = { dataPath };
