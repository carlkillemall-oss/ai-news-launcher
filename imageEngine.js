const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { Resvg } = require("@resvg/resvg-js");

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

function hashToSeed(str) {
  return crypto.createHash("sha256").update(String(str)).digest().readUInt32LE(0);
}

// PRNG semplice deterministico (così stessa keyword => look simile)
function mulberry32(a) {
  return function() {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick(arr, r) {
  return arr[Math.floor(r() * arr.length)];
}

function safeText(s, max = 28) {
  const t = String(s || "").replace(/[^\w\s\-#&]/g, "").trim();
  return t.length > max ? t.slice(0, max).trim() : t;
}

function buildAnimeCozySvg({ keyword, subtitle, stamp, size = 1024 }) {
  const seed = hashToSeed(keyword + "|" + stamp);
  const r = mulberry32(seed);

  // palette “cozy”
  const palettes = [
    ["#0b1220", "#1b2a4a", "#f8e7c9", "#ffd6a5", "#a7f3d0"],
    ["#0a0f1f", "#2a1b3d", "#f3e8ff", "#f9a8d4", "#93c5fd"],
    ["#0b0f14", "#183a2c", "#fef3c7", "#fdba74", "#86efac"],
    ["#0b1020", "#1f2d5a", "#e0f2fe", "#99f6e4", "#fde68a"],
  ];
  const pal = pick(palettes, r);
  const bg1 = pal[0], bg2 = pal[1], paper = pal[2], acc1 = pal[3], acc2 = pal[4];

  const k = safeText(keyword, 18).toUpperCase();
  const sub = safeText(subtitle, 42);

  // Mascotte “chibi” super semplice ma carina
  const eyeX = Math.floor(size * (0.44 + r() * 0.12));
  const eyeY = Math.floor(size * (0.44 + r() * 0.08));
  const blush = r() > 0.5;

  // Background blobs + watercolor noise
  const blobs = Array.from({ length: 9 }).map((_, i) => {
    const cx = Math.floor(r() * size);
    const cy = Math.floor(r() * size);
    const rad = Math.floor(size * (0.12 + r() * 0.22));
    const op = (0.10 + r() * 0.18).toFixed(3);
    const col = i % 2 === 0 ? acc1 : acc2;
    return `<circle cx="${cx}" cy="${cy}" r="${rad}" fill="${col}" opacity="${op}"/>`;
  }).join("\n");

  // “film grain” con turbulence
  const svg = `
<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${bg1}"/>
      <stop offset="100%" stop-color="${bg2}"/>
    </linearGradient>

    <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="18" result="blur"/>
      <feColorMatrix type="matrix"
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.9 0" />
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <filter id="paper" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" stitchTiles="stitch" result="noise"/>
      <feColorMatrix type="saturate" values="0.35"/>
      <feComponentTransfer>
        <feFuncA type="table" tableValues="0 0.10"/>
      </feComponentTransfer>
    </filter>

    <filter id="grain" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.7" numOctaves="1" stitchTiles="stitch" result="g"/>
      <feColorMatrix type="matrix"
        values="1 0 0 0 0
                0 1 0 0 0
                0 0 1 0 0
                0 0 0 0.10 0" />
    </filter>

    <radialGradient id="spot" cx="50%" cy="35%" r="60%">
      <stop offset="0%" stop-color="${paper}" stop-opacity="0.20"/>
      <stop offset="100%" stop-color="${paper}" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <!-- background -->
  <rect x="0" y="0" width="${size}" height="${size}" fill="url(#bg)"/>
  <rect x="0" y="0" width="${size}" height="${size}" fill="url(#spot)"/>
  <g filter="url(#softGlow)">${blobs}</g>

  <!-- “paper texture” overlay -->
  <rect x="0" y="0" width="${size}" height="${size}" fill="${paper}" opacity="0.06" filter="url(#paper)"/>

  <!-- character card -->
  <g transform="translate(${Math.floor(size*0.12)}, ${Math.floor(size*0.18)})">
    <rect x="0" y="0" rx="56" ry="56" width="${Math.floor(size*0.76)}" height="${Math.floor(size*0.64)}"
          fill="${paper}" opacity="0.12" stroke="${paper}" stroke-opacity="0.16"/>

    <!-- mascot -->
    <g transform="translate(${Math.floor(size*0.38)}, ${Math.floor(size*0.28)})">
      <!-- head -->
      <ellipse cx="0" cy="0" rx="${Math.floor(size*0.17)}" ry="${Math.floor(size*0.15)}"
               fill="${paper}" opacity="0.92"/>
      <!-- ears -->
      <ellipse cx="-${Math.floor(size*0.12)}" cy="-${Math.floor(size*0.10)}"
               rx="${Math.floor(size*0.07)}" ry="${Math.floor(size*0.08)}"
               fill="${paper}" opacity="0.85"/>
      <ellipse cx="${Math.floor(size*0.12)}" cy="-${Math.floor(size*0.10)}"
               rx="${Math.floor(size*0.07)}" ry="${Math.floor(size*0.08)}"
               fill="${paper}" opacity="0.85"/>

      <!-- eyes -->
      <ellipse cx="-${Math.floor(size*0.06)}" cy="-${Math.floor(size*0.01)}" rx="${Math.floor(size*0.020)}" ry="${Math.floor(size*0.028)}" fill="${bg1}" opacity="0.85"/>
      <ellipse cx="${Math.floor(size*0.06)}" cy="-${Math.floor(size*0.01)}" rx="${Math.floor(size*0.020)}" ry="${Math.floor(size*0.028)}" fill="${bg1}" opacity="0.85"/>
      <circle cx="-${Math.floor(size*0.055)}" cy="-${Math.floor(size*0.018)}" r="${Math.floor(size*0.006)}" fill="${paper}" opacity="0.9"/>
      <circle cx="${Math.floor(size*0.065)}" cy="-${Math.floor(size*0.018)}" r="${Math.floor(size*0.006)}" fill="${paper}" opacity="0.9"/>

      <!-- mouth -->
      <path d="M -${Math.floor(size*0.03)} ${Math.floor(size*0.035)} Q 0 ${Math.floor(size*0.055)} ${Math.floor(size*0.03)} ${Math.floor(size*0.035)}"
            stroke="${bg1}" stroke-opacity="0.55" stroke-width="${Math.floor(size*0.008)}" fill="none" stroke-linecap="round"/>

      ${blush ? `
      <ellipse cx="-${Math.floor(size*0.085)}" cy="${Math.floor(size*0.035)}" rx="${Math.floor(size*0.03)}" ry="${Math.floor(size*0.018)}" fill="${acc1}" opacity="0.25"/>
      <ellipse cx="${Math.floor(size*0.085)}" cy="${Math.floor(size*0.035)}" rx="${Math.floor(size*0.03)}" ry="${Math.floor(size*0.018)}" fill="${acc1}" opacity="0.25"/>
      ` : ""}
    </g>
  </g>

  <!-- title strip -->
  <g transform="translate(${Math.floor(size*0.12)}, ${Math.floor(size*0.72)})">
    <rect x="0" y="0" rx="32" ry="32" width="${Math.floor(size*0.76)}" height="${Math.floor(size*0.16)}"
          fill="${bg1}" opacity="0.25" />
    <text x="${Math.floor(size*0.04)}" y="${Math.floor(size*0.10)}"
          font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
          font-size="${Math.floor(size*0.075)}"
          fill="${paper}" opacity="0.95" letter-spacing="3">${k}</text>

    <text x="${Math.floor(size*0.04)}" y="${Math.floor(size*0.14)}"
          font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto"
          font-size="${Math.floor(size*0.022)}"
          fill="${paper}" opacity="0.75">${sub}</text>
  </g>

  <!-- grain overlay -->
  <rect x="0" y="0" width="${size}" height="${size}" filter="url(#grain)" opacity="0.55"/>
</svg>`.trim();

  return svg;
}

async function svgToPngBuffer(svg) {
  const resvg = new Resvg(svg, {
    fitTo: { mode: "original" },
    font: { loadSystemFonts: true }
  });
  const pngData = resvg.render();
  return pngData.asPng();
}

async function makeTokenPng({ keyword, subtitle, stamp, outPath }) {
  const svg = buildAnimeCozySvg({ keyword, subtitle, stamp, size: 1024 });
  const png = await svgToPngBuffer(svg);

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, png);

  return { outPath, svgPreview: null };
}

module.exports = {
  makeTokenPng,
};
