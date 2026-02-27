const launchKeywords = [
  "ai",
  "agent",
  "crypto",
  "token",
  "blockchain",
  "automation",
  "openai",
  "anthropic",
  "bitcoin",
  "ethereum"
];

function analyzeTrends(trends) {
  let score = 0;

  for (const [word, count] of Object.entries(trends)) {
    if (launchKeywords.includes(word.toLowerCase())) {
      score += count;
    }
  }

  if (score >= 8) {
    console.log("🚨 LAUNCH SIGNAL DETECTED");
    console.log("🔥 Trend Score:", score);
    return true;
  }

  return false;
}

module.exports = {
  analyzeTrends
};
