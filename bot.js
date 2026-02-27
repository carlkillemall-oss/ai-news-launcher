const fs = require("fs");
const path = require("path");

const { readState, writeState } = require("./storage");
const { makeDraft } = require("./draftEngine");
const { makeTokenSvg } = require("./imageEngine");
const { publishDrop } = require("./gitPublisher");

// Scanners già presenti nella tua repo (se uno manca, lo skippiamo)
function safeRequire(p) {
  try { return require(p); } catch { return null; }
}

const newsScanner = safeRequire("./newsScanner");   // dovrebbe esportare scanNews()
const hnScanner   = safeRequire("./hnScanner");     // dovrebbe esportare scanHN()
const xScanner    = safeRequire("./xScanner");      // opzionale
const { scanReddit } = safeRequire("./redditScanner") || { scanReddit: async () => [] };

const TZ_IT = "Europe/Rome";
const TZ_US = "America/New_York";

// DROP TIME: 00:00 ITALIA
const DROP_HOUR = 0;
const DROP_MINUTE = 0;

const LOOP_MS = 60 * 1000; // tick ogni minuto

function fmtDateYYYYMMDD(d = new Date(), timeZone) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(d);
  const y = parts.find(p => p.type === "year")?.value;
  const m = parts.find(p => p.type === "month")?.value;
  const day = parts.find(p => p.type === "day")?.value;
  return `${y}-${m}-${day}`;
}

function getHM(d = new Date(), timeZone) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(d);
  const hh = Number(parts.find(p => p.type === "hour")?.value || 0);
  const mm = Number(parts.find(p => p.type === "minute")?.value || 0);
  return { hh, mm };
}

function fmtStamp(d = new Date(), timeZone) {
  // YYYY-MM-DD HH:MM (TZ)
  const ymd = fmtDateYYYYMMDD(d, timeZone);
  const hm = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(d);
  return `${ymd} ${hm} (${timeZone})`;
}

async function gatherItems() {
  const items = [];

  if (newsScanner?.scanNews) {
    try {
      const a = await newsScanner.scanNews();
      if (Array.isArray(a)) items.push(...a.map(x => ({ ...x, source: x.source || "news" })));
    } catch (e) {
      console.log("NEWS error:", e?.message || e);
    }
  }

  if (hnScanner?.scanHN) {
    try {
      const a = await hnScanner.scanHN();
      if (Array.isArray(a)) items.push(...a.map(x => ({ ...x, source: x.source || "hn" })));
    } catch (e) {
      console.log("HN error:", e?.message || e);
    }
  }

  // X è opzionale (spesso rompe) → non deve bloccare niente
  if (xScanner?.scanX) {
    try {
      const a = await xScanner.scanX();
      if (Array.isArray(a)) items.push(...a.map(x => ({ ...x, source: x.source || "x" })));
    } catch (e) {
      console.log("X error:", e?.message || e);
    }
  }

  // Reddit soft fail (403/429 sono comuni)
  try {
    const a = await scanReddit({ subreddits: ["technology", "CryptoCurrency", "artificial"], limit: 8 });
    if (Array.isArray(a)) items.push(...a);
  } catch (e) {
    console.log("Reddit scan fatal:", e?.message || e);
  }

  return items
    .filter(it => it && it.title && it.url)
    .map(it => ({
      title: String(it.title).trim(),
      url: String(it.url).trim(),
      source: String(it.source || "unknown").trim(),
      ts: Number(it.ts || Date.now())
    }));
}

function ensureDropsDir() {
  const p = path.join(__dirname, "drops");
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
  return p;
}

function writeDropFiles({ ymdIT, draft }) {
  const drops = ensureDropsDir();
  const dropDir = path.join(drops, ymdIT);
  if (!fs.existsSync(dropDir)) fs.mkdirSync(dropDir, { recursive: true });

  const now = new Date();
  const iso = now.toISOString();

  const jsonPath = path.join(dropDir, "drop.json");
  const svgPath = path.join(dropDir, "image.svg");

  const payload = {
    dateIT: ymdIT,
    generatedAtISO: iso,
    generatedAtIT: fmtStamp(now, TZ_IT),
    generatedAtUS: fmtStamp(now, TZ_US),
    ...draft
  };

  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

  const svg = makeTokenSvg({
    title: draft.ticker || draft.name,
    subtitle: "Generated via github.com/carlkillemall-oss/ai-news-launcher",
    dateISO: `${payload.generatedAtUS}`
  });
  fs.writeFileSync(svgPath, svg);

  // aggiorna README “Today’s Drop”
  const readmePath = path.join(__dirname, "README.md");
  let readme = "";
  try { readme = fs.readFileSync(readmePath, "utf8"); } catch {}
  const marker = "<!-- DAILY_DROP -->";
  const block = `${marker}
## Today’s Drop (${ymdIT})

**${draft.name}** ($${draft.ticker})

Top keyword: **${draft.keyword}** (score: ${draft.score})

- Image: \`drops/${ymdIT}/image.svg\`
- Draft: \`drops/${ymdIT}/drop.json\`

Generated at:
- IT: ${payload.generatedAtIT}
- US: ${payload.generatedAtUS}

${marker}`;
  if (readme.includes(marker)) {
    const re = new RegExp(`${marker}[\\s\\S]*?${marker}`, "m");
    readme = readme.replace(re, block);
  } else {
    readme = (readme || "") + "\n\n" + block + "\n";
  }
  fs.writeFileSync(readmePath, readme);

  return { dropDirRel: `drops/${ymdIT}` };
}

async function runDailyDropIfTime() {
  const now = new Date();

  // data “del giorno” in Italia
  const ymdIT = fmtDateYYYYMMDD(now, TZ_IT);
  const state = readState();

  // orario corrente in Italia
  const { hh, mm } = getHM(now, TZ_IT);
  const isDropTime = (hh === DROP_HOUR && mm === DROP_MINUTE);

  if (!isDropTime) return;

  if (state.lastDropDate === ymdIT) {
    console.log(`✅ already dropped today (IT ${ymdIT})`);
    return;
  }

  console.log(`🟩 DAILY DROP triggered`);
  console.log(`🕛 IT now: ${fmtStamp(now, TZ_IT)}`);
  console.log(`🗽 US now: ${fmtStamp(now, TZ_US)}`);

  const items = await gatherItems();
  if (!items.length) {
    console.log("🟨 no items found, skipping drop");
    return;
  }

  const draft = makeDraft({ items, dateISO: now.toISOString() });

  console.log("🧠 DRAFT:");
  console.log(`- name: ${draft.name}`);
  console.log(`- ticker: ${draft.ticker}`);
  console.log(`- keyword: ${draft.keyword} (score ${draft.score})`);
  console.log(`- sources: ${draft.sources.length}`);

  const { dropDirRel } = writeDropFiles({ ymdIT, draft });

  // salva state subito così non loopa
  writeState({ lastDropDate: ymdIT });

  // publish su GitHub (se remote configurato)
  publishDrop({
    dropDirRel,
    message: `daily drop ${ymdIT}: ${draft.ticker}`
  });
}

async function loop() {
  try {
    const now = new Date();
    console.log(`⏱️ tick ${now.toISOString()} | IT ${fmtStamp(now, TZ_IT)} | US ${fmtStamp(now, TZ_US)}`);
    await runDailyDropIfTime();
  } catch (e) {
    console.log("Loop fatal error:", e?.message || e);
  }
}

console.log("🚀 AI News Launcher started");
loop();
setInterval(loop, LOOP_MS);
