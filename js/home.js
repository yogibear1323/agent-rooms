import { getAgents } from "./api.js";
import { syncCharacter } from "./characters.js";
import { renderFloor } from "./floor.js";
import {
  STATIC, hudStatus, workLevel, accentOf, characterOf, roomHref, paintStars,
  formatMST, latestRoomUpdate, displayName,
} from "./hud.js";

const crewList = document.getElementById("crew-list");
const crewCount = document.getElementById("crew-count");
const floor = document.getElementById("floor");

function renderSnapshot(agents) {
  const stamp = (window.__ROOMS_LAST_UPDATED__ || latestRoomUpdate(agents || [])) || "";
  const pretty = formatMST(stamp);
  const clock = document.getElementById("clock-readout");
  if (clock && pretty) clock.textContent = `LAST UPDATED ${pretty}`;
  const el = document.getElementById("snapshot-banner");
  if (!el) return;
  if (STATIC && window.__SNAPSHOT_LABEL__) {
    el.hidden = false;
    const last = pretty ? ` Rooms last updated ${pretty}.` : "";
    el.innerHTML = `<strong>SNAPSHOT</strong> — ${window.__SNAPSHOT_LABEL__}.${last} This is a saved view, not a live run. Approve in chat.`;
    document.body.classList.add("static");
    const sys = document.getElementById("sys-readout");
    if (sys) sys.textContent = "SYS · SNAPSHOT";
  }
}

function renderCrew(agents) {
  crewCount.textContent = String(agents.length);
  crewList.innerHTML = "";
  for (const agent of agents) {
    const a = document.createElement("a");
    a.className = `crew-row accent-${accentOf(agent)}`;
    a.href = roomHref(agent.id);
    const state = agent.state || "idle";
    a.innerHTML = `
      <div class="crew-avatar"></div>
      <div>
        <div class="crew-name">${displayName(agent).toUpperCase()}</div>
        <div class="crew-status">${hudStatus(state)}</div>
      </div>
      <div class="crew-lv">LV ${workLevel(agent)}</div>`;
    crewList.appendChild(a);
    syncCharacter(a.querySelector(".crew-avatar"), {
      kind: characterOf(agent),
      character: characterOf(agent),
      state,
      size: 56,
    });
  }
}

async function tick() {
  try {
    let agents;
    if (STATIC && window.__AGENTS_DATA__) {
      agents = window.__AGENTS_DATA__.agents || window.__AGENTS_DATA__ || [];
    } else {
      const data = await getAgents();
      agents = data.agents || [];
      if (data.rooms_last_updated) window.__ROOMS_LAST_UPDATED__ = data.rooms_last_updated;
    }
    renderSnapshot(agents);
    renderCrew(agents);
    renderFloor(floor, agents);
    document.body.dataset.awaiting = agents.some((a) => a.state === "awaiting_approval") ? "true" : "false";
  } catch (err) {
    crewList.innerHTML = `<p class="empty">${err.message}</p>`;
  }
}

paintStars(document.getElementById("stars"));
tick();
if (!STATIC) setInterval(tick, 2000);
