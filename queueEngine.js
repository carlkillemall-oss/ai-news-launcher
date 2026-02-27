const queue = []

function enqueueTrend(trend, score) {
  queue.push({
    trend,
    score,
    time: Date.now()
  })

  console.log("🟩 QUEUED FOR LAUNCH:")
  console.log(`${trend} (${score})`)
  console.log("------")
}

function getQueue() {
  return queue
}

function runQueue() {
  if (!queue.length) return

  const top = queue[0]

  console.log("🗒️ QUEUE:",
    queue.map(q => `${q.trend}:${q.score}`).join(" | ")
  )

  return top
}

module.exports = {
  enqueueTrend,
  runQueue,
  getQueue
}
