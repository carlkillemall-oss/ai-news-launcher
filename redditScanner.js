async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      // Reddit vuole UA “umano-ish”, altrimenti spesso 403/429
      "User-Agent": "ai-news-launcher/1.0 (by carlkillemall-oss)",
      "Accept": "application/json"
    }
  });

  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    const err = new Error(`Status code ${res.status}`);
    err.status = res.status;
    err.body = txt.slice(0, 200);
    throw err;
  }
  return res.json();
}

function normalizeRedditListing(json, sourceName) {
  const children = json?.data?.children || [];
  return children
    .map(c => c?.data)
    .filter(Boolean)
    .map(p => ({
      source: `reddit:${sourceName}`,
      title: p.title,
      url: `https://www.reddit.com${p.permalink}`,
      ts: (p.created_utc ? p.created_utc * 1000 : Date.now())
    }));
}

async function scanReddit({ subreddits = ["technology", "CryptoCurrency", "artificial"], limit = 10 } = {}) {
  const out = [];
  for (const sr of subreddits) {
    try {
      const url = `https://www.reddit.com/r/${encodeURIComponent(sr)}/hot.json?limit=${limit}`;
      const json = await fetchJson(url);
      out.push(...normalizeRedditListing(json, sr));
    } catch (e) {
      // SOFT FAIL: non blocchiamo il bot se Reddit fa 403
      console.log(`Reddit error: ${e?.message || e}`);
      continue;
    }
  }
  return out;
}

module.exports = { scanReddit };
