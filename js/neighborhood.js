/* Original pixel-art neighborhood for the Company Data Asset Profile room.
   Not a copy of any product. Generic storefronts only — no real names or logos. */

const STATES = new Set(["idle", "scanning", "scoring", "drafting", "awaiting_approval", "done", "error"]);

const FONT = {
  A: ["010","101","111","101","101"],
  C: ["011","100","100","100","011"],
  E: ["111","100","110","100","111"],
  F: ["111","100","110","100","100"],
  H: ["101","101","111","101","101"],
  I: ["111","010","010","010","111"],
  K: ["101","101","110","101","101"],
  L: ["100","100","100","100","111"],
  N: ["101","111","111","101","101"],
  O: ["010","101","101","101","010"],
  P: ["111","101","111","100","100"],
  S: ["011","100","010","001","110"],
  W: ["101","101","101","111","101"],
};

function rect(x, y, w, h, fill, cls) {
  const c = cls ? ` class="${cls}"` : "";
  return `<rect${c} x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}"/>`;
}

function word(text, x, y, color, s = 2) {
  let out = "";
  let cx = x;
  for (const ch of text) {
    const g = FONT[ch];
    if (!g) {
      cx += 3 * s;
      continue;
    }
    g.forEach((row, ry) => {
      [...row].forEach((bit, rx) => {
        if (bit === "1") out += rect(cx + rx * s, y + ry * s, s, s, color);
      });
    });
    cx += 4 * s;
  }
  return out;
}

function windows(x, y, cols, rows, gx, gy, litFill) {
  let out = "";
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cls = (c + r) % 3 === 0 ? "win-dim" : "win-lit";
      out += rect(x + c * gx, y + r * gy, 8, 10, litFill, cls);
    }
  }
  return out;
}

function walker() {
  // Side-view scout (amber shirt, clipboard). Two walk frames + idle/door poses.
  const body = (leg) => `
    <g class="hood-body">
      ${rect(6, 2, 8, 5, "#f0c9a8")}
      ${rect(6, 1, 8, 3, "#2b211c")}
      ${rect(8, 4, 2, 1, "#0e1016")}
      ${rect(4, 7, 12, 10, "#e8a838")}
      ${rect(4, 9, 3, 7, "#b87a18")}
      ${rect(13, 9, 3, 7, "#b87a18")}
      ${rect(5, 17, 4, 7, leg === 1 ? "#2a3348" : "#1a1e28")}
      ${rect(11, 17, 4, 7, leg === 1 ? "#1a1e28" : "#2a3348")}
      <g class="hood-clip">
        ${rect(16, 10, 7, 9, "#e8e6df")}
        ${rect(17, 11, 5, 7, "#0b1c22")}
        ${rect(18, 13, 3, 1, "#00f0ff")}
        ${rect(18, 15, 3, 1, "#00f0ff")}
      </g>
    </g>`;
  return `
    <g class="hood-walker" transform="translate(36,108)">
      <g class="walk-a">${body(0)}</g>
      <g class="walk-b">${body(1)}</g>
      <g class="hood-bubble" transform="translate(22,-18)">
        ${rect(0, 0, 16, 12, "#e8e6df")}
        ${rect(1, 1, 14, 10, "#0b1018")}
        ${rect(3, 3, 10, 2, "#fce803")}
        ${rect(3, 7, 7, 2, "#00f0ff")}
        ${rect(4, 12, 3, 3, "#e8e6df")}
      </g>
    </g>`;
}

function scene() {
  // 384 x 192 dusk street. Buildings: LAW, CLINIC, SHOP, OFFICE.
  const sky = [
    rect(0, 0, 384, 152, "#0b1020"),
    rect(0, 96, 384, 36, "#16122a"),
    rect(0, 120, 384, 16, "#1c1730"),
    // moon
    rect(348, 14, 16, 16, "#e8e6df", "hood-moon"),
    rect(351, 17, 6, 6, "#0b1020"),
    // stars
    rect(20, 10, 2, 2, "#d8e8ff", "hood-star"),
    rect(48, 22, 1, 1, "#9bb0c8", "hood-star dim"),
    rect(80, 8, 2, 2, "#d8e8ff", "hood-star"),
    rect(120, 18, 1, 1, "#9bb0c8", "hood-star dim"),
    rect(160, 6, 1, 1, "#d8e8ff", "hood-star"),
    rect(200, 16, 2, 2, "#d8e8ff", "hood-star"),
    rect(240, 9, 1, 1, "#9bb0c8", "hood-star dim"),
    rect(280, 20, 1, 1, "#d8e8ff", "hood-star"),
    rect(310, 8, 2, 2, "#d8e8ff", "hood-star"),
    rect(40, 36, 1, 1, "#9bb0c8", "hood-star dim"),
    rect(300, 32, 1, 1, "#d8e8ff", "hood-star"),
  ].join("");

  const law = `
    <g class="bldg" data-kind="law" transform="translate(12,48)">
      ${rect(8, 0, 68, 12, "#3a4458")}
      ${rect(0, 12, 84, 72, "#2a3348")}
      ${rect(4, 16, 8, 68, "#3d4658")}
      ${rect(72, 16, 8, 68, "#3d4658")}
      ${windows(18, 20, 3, 2, 18, 18, "#f7e27a")}
      ${rect(32, 60, 20, 24, "#12141a")}
      ${rect(40, 70, 4, 6, "#fce803", "door-knob")}
      ${rect(22, 2, 40, 12, "#0b1018")}
      ${word("LAW", 28, 4, "#fce803", 2)}
    </g>`;

  const clinic = `
    <g class="bldg" data-kind="clinic" transform="translate(104,40)">
      ${rect(0, 20, 84, 72, "#24343a")}
      ${rect(-2, 16, 88, 10, "#4cbe6e")}
      ${rect(0, 18, 84, 6, "#1e3326")}
      ${windows(10, 32, 2, 2, 18, 18, "#c8f0d4")}
      ${rect(52, 32, 22, 22, "#0b1018")}
      ${rect(61, 35, 4, 16, "#4cbe6e")}
      ${rect(55, 41, 16, 4, "#4cbe6e")}
      ${rect(32, 64, 20, 28, "#12141a")}
      ${rect(40, 76, 4, 6, "#fce803", "door-knob")}
      ${rect(18, 0, 48, 14, "#0b1018")}
      ${word("CLINIC", 20, 3, "#4cbe6e", 2)}
    </g>`;

  const shop = `
    <g class="bldg" data-kind="shop" transform="translate(196,44)">
      ${rect(0, 16, 84, 72, "#3a2e24")}
      ${rect(-2, 10, 88, 10, "#e8a838")}
      ${rect(0, 12, 8, 6, "#b87a18")}
      ${rect(16, 12, 8, 6, "#fce803")}
      ${rect(32, 12, 8, 6, "#b87a18")}
      ${rect(48, 12, 8, 6, "#fce803")}
      ${rect(64, 12, 8, 6, "#b87a18")}
      ${rect(80, 12, 6, 6, "#fce803")}
      ${rect(10, 28, 64, 28, "#0b1c22", "win-lit")}
      ${rect(14, 32, 16, 20, "#1a3040")}
      ${rect(36, 32, 16, 20, "#1a3040")}
      ${rect(58, 32, 12, 20, "#1a3040")}
      ${rect(32, 60, 20, 28, "#12141a")}
      ${rect(40, 72, 4, 6, "#fce803", "door-knob")}
      ${rect(22, 0, 40, 12, "#0b1018")}
      ${word("SHOP", 26, 2, "#fce803", 2)}
    </g>`;

  const office = `
    <g class="bldg" data-kind="office" transform="translate(288,32)">
      ${rect(0, 16, 84, 84, "#243044")}
      ${windows(10, 24, 4, 3, 18, 16, "#9bb8e8")}
      ${rect(32, 72, 20, 28, "#12141a")}
      ${rect(40, 84, 4, 6, "#00f0ff", "door-knob")}
      ${rect(16, 0, 52, 14, "#0b1018")}
      ${word("OFFICE", 18, 3, "#00f0ff", 2)}
    </g>`;

  const ground = [
    rect(0, 132, 384, 20, "#4a515c"),
    rect(0, 136, 384, 2, "#c5c8ce"),
    rect(4, 140, 8, 2, "#d8dbe0"),
    rect(20, 140, 8, 2, "#d8dbe0"),
    rect(36, 140, 8, 2, "#d8dbe0"),
    rect(52, 140, 8, 2, "#d8dbe0"),
    rect(0, 152, 384, 40, "#1a1d24"),
    rect(0, 150, 384, 3, "#5a616c"),
    rect(16, 172, 24, 3, "#fce803"),
    rect(56, 172, 24, 3, "#fce803"),
    rect(96, 172, 24, 3, "#fce803"),
    rect(136, 172, 24, 3, "#fce803"),
    rect(176, 172, 24, 3, "#fce803"),
    rect(216, 172, 24, 3, "#fce803"),
    rect(256, 172, 24, 3, "#fce803"),
    rect(296, 172, 24, 3, "#fce803"),
    rect(336, 172, 24, 3, "#fce803"),
    // door stoops
    rect(44, 128, 20, 6, "#2a2e36"),
    rect(136, 128, 20, 6, "#2a2e36"),
    rect(228, 128, 20, 6, "#2a2e36"),
    rect(320, 128, 20, 6, "#2a2e36"),
  ].join("");

  // Document icon that appears at a doorway while drafting
  const doorDoc = `
    <g class="hood-door-doc" transform="translate(248,100)">
      ${rect(0, 0, 12, 14, "#e8e6df")}
      ${rect(1, 1, 10, 12, "#111827")}
      ${rect(3, 4, 6, 2, "#00f0ff")}
      ${rect(3, 8, 6, 2, "#00f0ff")}
    </g>`;

  return `<svg class="neighborhood-svg" viewBox="0 0 384 192" width="384" height="192" shape-rendering="crispEdges" style="image-rendering:pixelated" role="img" aria-label="Night neighborhood street with law, clinic, shop, and office storefronts">
    ${sky}${law}${clinic}${shop}${office}${ground}${doorDoc}${walker()}
  </svg>`;
}

export function syncNeighborhood(el, { state } = {}) {
  if (!el) return;
  const st = STATES.has(state) ? state : "idle";
  let svg = el.querySelector("svg.neighborhood-svg");
  if (!svg) {
    el.innerHTML = scene();
    svg = el.querySelector("svg.neighborhood-svg");
  }
  el.dataset.state = st;
  if (svg) svg.setAttribute("data-state", st);
}
