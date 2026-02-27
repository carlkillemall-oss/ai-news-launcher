const Parser = require("rss-parser");
const parser = new Parser();

let lastRun = 0;
const COOLDOWN = 5 * 60 * 1000; // 5 minuti

module.exports = async function scanHN() {

  const now = Date.now();

  if (now - lastRun < COOLDOWN) {
    return [];
  }

  lastRun = now;

  try {
    const feed = await parser.parseURL(
      "https://hnrss.org/frontpage"
    );

    return feed.items.slice(0,5).map(item => ({
      tag: "🟧 HN NEW:",
      title: item.title,
      link: item.link
    }));

  } catch (err) {
    console.error("HN error:", err.message);
    return [];
  }
};
