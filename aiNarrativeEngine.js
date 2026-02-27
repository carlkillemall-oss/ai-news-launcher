// aiNarrativeEngine.js

function generateTokenIdea(trends) {
  if (!trends || trends.length === 0) return null;

  const [topWord, score] = trends[0];

  if (score < 20) return null; // launch threshold

  const narratives = {
    ai: "Autonomous AI agents becoming dominant",
    crypto: "New crypto adoption narrative emerging",
    pentagon: "Military + AI convergence meta",
    anthropic: "AI safety war narrative",
    agents: "Agent economy expansion",
    bitcoin: "Institutional crypto momentum",
  };

  const narrative =
    narratives[topWord.toLowerCase()] ||
    "Emerging global tech narrative";

  const name =
    topWord.charAt(0).toUpperCase() +
    topWord.slice(1) +
    "AI";

  const ticker =
    topWord.slice(0, 3).toUpperCase() +
    Math.floor(Math.random() * 9);

  return {
    name,
    ticker,
    narrative,
    score,
  };
}

module.exports = {
  generateTokenIdea,
};
