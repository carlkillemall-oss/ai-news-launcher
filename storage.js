const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "data");
const STATE_PATH = path.join(DATA_DIR, "state.json");

function ensure() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(STATE_PATH)) {
    fs.writeFileSync(STATE_PATH, JSON.stringify({ lastDropDate: null }, null, 2));
  }
}

function readState() {
  ensure();
  return JSON.parse(fs.readFileSync(STATE_PATH, "utf8"));
}

function writeState(next) {
  ensure();
  fs.writeFileSync(STATE_PATH, JSON.stringify(next, null, 2));
}

module.exports = { readState, writeState, STATE_PATH };
