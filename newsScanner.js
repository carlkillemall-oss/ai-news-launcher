const Parser = require("rss-parser");
const parser = new Parser();

module.exports = async function scanNews() {
  try {
    const feed = await parser.parseURL(
      "https://news.google.com/rss/search?q=AI+crypto&hl=en-US&gl=US&ceid=US:en"
    );

    return feed.items.slice(0, 5).map((item) => ({
      tag: "📰 NEWS NEW:",
      title: item.title,
      link: item.link,
    }));

  } catch (err) {
    console.error("News error:", err.message);
    return [];
  }
};
