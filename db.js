const Database = require("better-sqlite3");

const db = new Database("data.sqlite");

db.exec(`
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  source TEXT,
  title TEXT,
  link TEXT,
  ts INTEGER,
  hash TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS launch_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  term TEXT,
  score INTEGER,
  window_mins INTEGER,
  status TEXT DEFAULT 'queued',
  created_ts INTEGER
);
`);

function hashOf(source, title) {
  return `${source}:${title}`.toLowerCase();
}

function insertEvent({ source, title, link }) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO events
    (source,title,link,ts,hash)
    VALUES (?,?,?,?,?)
  `);

  const res = stmt.run(
    source,
    title,
    link || "",
    Date.now(),
    hashOf(source, title)
  );

  return res.changes === 1;
}

function recentEvents(minutes = 30) {
  const since = Date.now() - minutes * 60 * 1000;

  return db.prepare(`
    SELECT * FROM events
    WHERE ts >= ?
  `).all(since);
}

function enqueueTrend({ term, score, windowMins }) {
  const stmt = db.prepare(`
    INSERT INTO launch_queue
    (term,score,window_mins,created_ts)
    VALUES (?,?,?,?)
  `);

  stmt.run(term, score, windowMins, Date.now());
}

function getQueued(limit = 5) {
  return db.prepare(`
    SELECT * FROM launch_queue
    ORDER BY created_ts DESC
    LIMIT ?
  `).all(limit);
}

module.exports = {
  insertEvent,
  recentEvents,
  enqueueTrend,
  getQueued
};
