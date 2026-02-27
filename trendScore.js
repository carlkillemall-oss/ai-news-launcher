const { recentEvents } = require("./db");

const WEIGHTS = {
  hn: 3,
  reddit: 2,
  news: 1,
};

function normalizeTerm(s) {
  return s
    .toLowerCase()
    .replace(/https?:\/\/\S+/g, "")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTerms(title) {
  const t = normalizeTerm(title).split(" ");
  // stopwords minime
  const stop = new Set(["the","a","an","and","or","to","of","in","on","for","with","is","are","was","were","as","at","by","from","new"]);
  return t.filter(w => w.length >= 4 && !stop.has(w));
}

function scoreTrends(minutes = 30) {
  const ev = recentEvents(minutes);
  const map = new Map(); // term -> score

  for (const e of ev) {
    const weight = WEIGHTS[e.source] || 1;
    const terms = extractTerms(e.title);

    for (const term of terms) {
      map.set(term, (map.get(term) || 0) + weight);
    }
  }

  const ranked = [...map.entries()]
    .map(([term, score]) => ({ term, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 15);

  return ranked;
}

module.exports = { scoreTrends };
