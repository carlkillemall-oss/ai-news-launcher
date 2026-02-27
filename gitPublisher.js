const { execSync } = require("child_process");

function safeExec(cmd) {
  return execSync(cmd, { stdio: "pipe" }).toString("utf8").trim();
}

function hasGitRemote() {
  try {
    const out = safeExec("git remote -v");
    return out.length > 0;
  } catch {
    return false;
  }
}

function publishDrop({ dropDirRel, message }) {
  try {
    if (!hasGitRemote()) {
      console.log("🟦 Git: no remote configured, skipping push.");
      return { pushed: false };
    }

    safeExec(`git add ${dropDirRel} README.md drops || true`);
    safeExec(`git commit -m "${message}" || true`);
    safeExec(`git push || true`);

    console.log("🟩 Git: committed & pushed.");
    return { pushed: true };
  } catch (e) {
    console.log("🟥 Git publish error:", e?.message || e);
    return { pushed: false, error: e?.message || String(e) };
  }
}

module.exports = { publishDrop };
