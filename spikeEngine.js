// spikeEngine.js

const history = {};
const WINDOW = 10; // memoria ultimi cicli

function updateHistory(trends) {

  for (const [word, count] of Object.entries(trends)) {

    if (!history[word]) {
      history[word] = [];
    }

    history[word].push(count);

    if (history[word].length > WINDOW) {
      history[word].shift();
    }
  }
}

function detectSpikes() {

  const spikes = [];

  for (const word in history) {

    const arr = history[word];

    if (arr.length < 3) continue;

    const oldAvg =
      arr.slice(0, arr.length - 1)
      .reduce((a,b)=>a+b,0) /
      (arr.length - 1);

    const latest = arr[arr.length - 1];

    if (oldAvg === 0) continue;

    const velocity = ((latest - oldAvg) / oldAvg) * 100;

    if (velocity > 150 && latest >= 3) {

      spikes.push({
        word,
        velocity: velocity.toFixed(0),
        score: latest
      });
    }
  }

  return spikes;
}

module.exports = {
  updateHistory,
  detectSpikes
};
