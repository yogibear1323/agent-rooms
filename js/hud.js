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

/** Visible title (e.g. Company Data Asset Profile). Internal id is unchanged. */
export function displayName(agent) {
  return (agent && (agent.name || agent.short || agent.id)) || "";
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

/** Format an ISO timestamp in America/Phoenix, e.g. "1:22 PM MST (Phoenix)". */
export function formatMST(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Phoenix",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
  return `${fmt.format(d)} MST (Phoenix)`;
}

export function latestRoomUpdate(agents) {
  let max = "";
  for (const a of (agents || [])) {
    const iso = a.last_updated || (a.status && a.status.last_updated) || "";
    if (iso && iso > max) max = iso;
  }
  return max;
}
