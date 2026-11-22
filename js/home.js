import { getAgents } from "./api.js";
import { syncCharacter, stateLabel } from "./characters.js";

const tiles = document.getElementById("tiles");
const STATIC = Boolean(window.__AGENT_ROOMS_STATIC__);

function badgesFor(agent) {
  if (Array.isArray(agent.badges) && agent.badges.length) {
    return agent.badges.map((b) => b.label);
  }
  const items = [];
  if (agent.opportunity_count) items.push(`${agent.opportunity_count} opportunit${agent.opportunity_count === 1 ? "y" : "ies"}`);
  if (agent.business_count) items.push(`${agent.business_count} business${agent.business_count === 1 ? "" : "es"}`);
  if (agent.candidate_count) items.push(`${agent.candidate_count} candidate${agent.candidate_count === 1 ? "" : "s"}`);
  if (agent.lead_count) items.push(`${agent.lead_count} lead${agent.lead_count === 1 ? "" : "s"}`);
  if (agent.queue_enabled !== false) {
    items.push(`${agent.draft_count || 0} draft${agent.draft_count === 1 ? "" : "s"}`);
    if (agent.pending_count) items.push(`${agent.pending_count} pending`);
  }
  return items;
}

function renderSnapshot() {
  const el = document.getElementById("snapshot-banner");
  if (!el) return;
  if (STATIC && window.__SNAPSHOT_LABEL__) {
    el.hidden = false;
    el.innerHTML = "<strong>Snapshot</strong> — " + window.__SNAPSHOT_LABEL__ + ". This is a saved view, not a live run.";
    document.body.classList.add("static");
  }
}

function render(agents) {
  renderSnapshot();

  tiles.innerHTML = "";
  for (const agent of agents) {
    const a = document.createElement("a");
    const accent = agent.accent || "amber";
    a.className = `tile accent-${accent}`;
    a.href = STATIC ? `room/${encodeURIComponent(agent.id)}.html` : `/room/${encodeURIComponent(agent.id)}`;
    a.innerHTML = `
      <div class="tile-char" data-kind="${agent.character || agent.kind}"></div>
      <div class="tile-body">
        <div class="tile-top">
          <span class="light" data-state="${agent.state || "idle"}" title="${stateLabel(agent.state)}"></span>
          <h2>${agent.name}</h2>
        </div>
        <p class="blurb">${agent.blurb || ""}</p>
        <ul class="counts">${badgesFor(agent).map((c) => `<li>${c}</li>`).join("")}</ul>
        <div class="tile-status">${stateLabel(agent.state)}${agent.current_step ? " · " + agent.current_step : ""}${agent.live_wired ? "" : " · live feed not wired yet"}</div>
      </div>`;
    tiles.appendChild(a);
    syncCharacter(a.querySelector(".tile-char"), {
      kind: agent.character || agent.kind,
      character: agent.character || agent.kind,
      state: agent.state,
      size: 96,
    });
  }
}

async function tick() {
  try {
    if (STATIC && window.__AGENTS_DATA__) {
      render(window.__AGENTS_DATA__.agents || window.__AGENTS_DATA__ || []);
      return;
    }
    const data = await getAgents();
    render(data.agents || []);
  } catch (err) {
    tiles.innerHTML = `<p class="empty">${err.message}</p>`;
  }
}

tick();
if (!STATIC) setInterval(tick, 2000);
