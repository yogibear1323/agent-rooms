/** Shared HUD helpers. LV is always derived from real work counts. */

export const STATIC = Boolean(window.__AGENT_ROOMS_STATIC__);

export function hudStatus(state) {
  switch (state) {
    case "scanning":
    case "scoring":
    case "drafting":
      return "WORKING";
    case "awaiting_approval":
      return "AWAITING APPROVAL";
    case "done":
      return "DONE";
    case "error":
      return "ERROR";
    default:
      return "IDLE";
  }
}

export function workUnits(agent) {
  const badges = agent.badges || [];
  if (badges.length) {
    return badges.reduce((sum, b) => {
      const n = parseInt(b.value, 10);
      return sum + (Number.isFinite(n) ? n : 0);
    }, 0);
  }
  const c = agent.counts || (agent.status && agent.status.counts) || {};
  return (Number(c.scored) || 0) + (Number(c.drafts) || 0) + (Number(c.items_found) || 0);
}

/** Level 1 at zero work; +1 per 8 real items/drafts. Never invented. */
export function workLevel(agent) {
  return 1 + Math.floor(workUnits(agent) / 8);
}

export function accentOf(agent) {
  return agent.accent || "amber";
}

export function characterOf(agent) {
  return agent.character || agent.kind || "scout";
}

export function roomHref(id) {
  return STATIC ? `room/${encodeURIComponent(id)}.html` : `/room/${encodeURIComponent(id)}`;
}

export function paintStars(container, count = 70) {
  if (!container) return;
  container.innerHTML = "";
  for (let i = 0; i < count; i++) {
    const s = document.createElement("span");
    s.className = "star" + (i % 5 === 0 ? " giant" : i % 3 === 0 ? " dim" : "");
    s.style.left = `${Math.random() * 100}%`;
    s.style.top = `${Math.random() * 100}%`;
    s.style.animationDelay = `${Math.random() * 3.6}s`;
    container.appendChild(s);
  }
}
