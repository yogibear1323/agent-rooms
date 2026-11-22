import { hudStatus, workLevel, accentOf, characterOf, roomHref, displayName } from "./hud.js";
import { syncTopDown } from "./characters.js";
import { syncNeighborhood } from "./neighborhood.js";

const TILE = 48;

const SLOTS = {
  scout: { x: 1.2, y: 1.6 },
  "lead-followup": { x: 6.2, y: 1.6 },
  recruiter: { x: 1.2, y: 6.4 },
  content: { x: 6.2, y: 6.4 },
  finance: { x: 1.2, y: 10.0 },
  merch: { x: 6.2, y: 10.0 },
};

function slotFor(id, index) {
  if (SLOTS[id]) return SLOTS[id];
  const extras = [
    { x: 10.5, y: 6.4 },
    { x: 10.5, y: 10.0 },
    { x: 10.5, y: 1.6 },
  ];
  return extras[index % extras.length];
}

export function renderFloor(el, agents) {
  if (!el) return;
  const list = agents || [];
  const used = new Set();
  const placed = list.map((a, i) => {
    let slot = slotFor(a.id, i);
    // naive de-dupe if two extras collide
    const key = `${slot.x},${slot.y}`;
    if (used.has(key)) slot = { x: slot.x, y: slot.y + 3 };
    used.add(`${slot.x},${slot.y}`);
    return { agent: a, slot };
  });

  const hasScout = list.some((a) => a.id === "scout");
  const hasFollow = list.some((a) => a.id === "lead-followup");

  const stations = placed
    .map(({ agent, slot }) => {
      const left = slot.x * TILE;
      const top = slot.y * TILE;
      const state = agent.state || "idle";
      const hood = agent.id === "scout";
      const body = hood
        ? `<div class="hood-mini" data-id="${agent.id}" data-state="${state}"></div>`
        : `<div class="desk"><div class="monitor"></div></div>
        <div class="chair"></div>
        <div class="rack" aria-hidden="true"><i></i><i></i><i></i></div>
        <div class="sprite-top" data-id="${agent.id}" data-state="${state}"></div>`;
      return `<a class="station ${hood ? "hood-station " : ""}accent-${accentOf(agent)}" href="${roomHref(agent.id)}" style="left:${left}px;top:${top}px" title="${displayName(agent)}">
        <div class="nametag">${displayName(agent).toUpperCase()} · LV ${workLevel(agent)}</div>
        ${body}
      </a>`;
    })
    .join("");

  const outLeft = 11.6 * TILE;
  const outTop = 1.6 * TILE;
  const outbox = `<div class="outbox-pad" style="left:${outLeft}px;top:${outTop}px">
    <div class="nametag">OUTBOX</div>
    <div class="outbox-bin"><span>FINISHED</span></div>
  </div>`;

  // Belts: Scout -> Lead Follow-up -> Outbox (or Scout -> Outbox if no follow-up)
  const belts = [];
  const yBelt = 1.6 * TILE + 36;
  if (hasScout && hasFollow) {
    const x1 = (SLOTS.scout.x + 4.4) * TILE - 4;
    const x2 = SLOTS["lead-followup"].x * TILE + 4;
    belts.push(belt(x1, yBelt, x2 - x1));
    const x3 = (SLOTS["lead-followup"].x + 3) * TILE - 4;
    belts.push(belt(x3, yBelt, outLeft - x3 + 4));
  } else if (hasScout) {
    const x1 = (SLOTS.scout.x + 4.4) * TILE - 4;
    belts.push(belt(x1, yBelt, outLeft - x1 + 4));
  } else if (hasFollow) {
    const x1 = (SLOTS["lead-followup"].x + 3) * TILE - 4;
    belts.push(belt(x1, yBelt, outLeft - x1 + 4));
  }

  el.innerHTML = `<div class="deck-floor"></div>${belts.join("")}${stations}${outbox}`;

  for (const { agent } of placed) {
    const state = agent.state || "idle";
    if (agent.id === "scout") {
      const mini = el.querySelector(`.hood-mini[data-id="${agent.id}"]`);
      syncNeighborhood(mini, { state });
    } else {
      const spr = el.querySelector(`.sprite-top[data-id="${agent.id}"]`);
      syncTopDown(spr, { kind: characterOf(agent), character: characterOf(agent), state });
    }
  }
}

function belt(left, top, width) {
  const w = Math.max(24, width);
  return `<div class="belt" style="left:${left}px;top:${top}px;width:${w}px">
    <span class="pack"></span><span class="pack"></span><span class="pack"></span>
  </div>`;
}
