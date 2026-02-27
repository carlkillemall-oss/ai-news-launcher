function tokenize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .filter(w => w.length >= 4)
    .filter(w => !["this","that","with","from","have","will","your","they","their","about","after","before","into","over","more","than","been","news","says","said","today"].includes(w));
}

function topKeywords(items, limit = 10) {
  const freq = new Map();
  for (const it of items) {
    const words = tokenize(`${it.title || ""} ${it.source || ""}`);
    for (const w of words) freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()].sort((a,b) => b[1]-a[1]).slice(0, limit);
}

function pickTrend(items) {
  const top = topKeywords(items, 20);
  if (!top.length) return { keyword: "DailyDrop", score: 0, top };

  // “trend” = keyword con frequenza massima, ma evita parole troppo generiche se presenti
  const avoid = new Set(["crypto","bitcoin","ethereum","market","stocks","price","prices"]);
  let [kw, sc] = top[0];

  for (const [k, s] of top) {
    if (!avoid.has(k)) { kw = k; sc = s; break; }
  }

  return { keyword: kw, score: sc, top };
}

function makeTicker(keyword) {
  const base = String(keyword || "DROP").toUpperCase().replace(/[^A-Z0-9]/g, "");
  const t = base.slice(0, 6);
  return t.length >= 3 ? t : "DROP";
}

function prettyName(keyword) {
  const k = String(keyword || "Daily Drop");
  return k
    .split(/[\s_-]+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
    .slice(0, 28);
}

function buildDescription({ keyword, sources, dateISO }) {
  const lines = [];
  lines.push(`Daily News Drop: ${prettyName(keyword)}.`);
  lines.push(`Generated via github.com/carlkillemall-oss/ai-news-launcher`);
  lines.push(`Date: ${dateISO}`);
  lines.push("");
  lines.push("Sources:");
  for (const s of sources.slice(0, 5)) {
    lines.push(`- ${s.title} (${s.source})`);
    lines.push(`  ${s.url}`);
  }
  return lines.join("\n");
}

function makeDraft({ items, dateISO }) {
  const trend = pickTrend(items);
  const keyword = trend.keyword;
  const name = prettyName(keyword);
  const ticker = makeTicker(keyword);

  const sources = items
    .filter(x => x && x.title && x.url)
    .slice(0, 10);

  const description = buildDescription({ keyword, sources, dateISO });

  return {
    name,
    ticker,
    keyword,
    score: trend.score,
    topKeywords: trend.top,
    description,
    sources
  };
}

module.exports = { makeDraft };
