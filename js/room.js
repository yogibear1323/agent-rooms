import { getRoom, postDecision, startRun } from "./api.js";
import { syncCharacter, stateLabel } from "./characters.js";
import { syncNeighborhood } from "./neighborhood.js";
import { STATIC, hudStatus, workLevel, accentOf, characterOf, paintStars, formatMST, displayName } from "./hud.js";

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function agentIdFromPath() {
  const parts = location.pathname.split("/").filter(Boolean);
  const i = parts.indexOf("room");
  if (i >= 0 && parts[i + 1]) return decodeURIComponent(parts[i + 1].replace(/\.html$/, ""));
  return new URLSearchParams(location.search).get("id") || "";
}

const agentId = agentIdFromPath();
const $ = (id) => document.getElementById(id);
const els = {
  room: $("room"),
  banner: $("live-banner"),
  crumb: $("crumb-name"),
  name: $("agent-name"),
  light: $("state-light"),
  label: $("state-label"),
  step: $("step"),
  lv: $("lv-readout"),
  stats: $("stats-strip"),
  runBtn: $("run-btn"),
  runNote: $("run-note"),
  char: $("char-stage"),
  comms: $("comms"),
  nowDraft: $("now-draft"),
  draftMeta: $("draft-meta"),
  draftBody: $("draft-body"),
  draftEdit: $("draft-edit"),
  draftActions: $("draft-actions"),
  dataPanels: $("data-panels"),
  queue: $("queue"),
  queueBadge: $("queue-badge"),
  cols: $("room-cols"),
  outbox: $("outbox-panel"),
  consoleWrap: $("console-wrap"),
  consoleLog: $("console-log"),
};

let room = null;
let selectedId = null;
let editing = false;
let typing = { id: null, text: "", i: 0, timer: null };
let streaming = false;

function escapeHtml(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function fmtTime(ts) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Phoenix",
      hour: "numeric",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d);
  } catch {
    return String(ts);
  }
}

function draftText(d) {
  if (!d) return "";
  return d.edited_text || d.body || "";
}

function currentDraft() {
  if (!room) return null;
  const drafts = room.drafts || [];
  if (selectedId) return drafts.find((d) => d.id === selectedId) || null;
  const want = room.status && room.status.current_draft_id;
  if (want) return drafts.find((d) => d.id === want) || null;
  return drafts[0] || null;
}

function stopTyping() {
  if (typing.timer) clearInterval(typing.timer);
  typing = { id: null, text: "", i: 0, timer: null };
}

function showDraftText(text) {
  els.draftBody.hidden = false;
  els.draftEdit.hidden = true;
  els.draftBody.textContent = text || "";
}

function typeDraft(id, text, active) {
  if (!active || reduceMotion.matches || !text) {
    stopTyping();
    showDraftText(text);
    return;
  }
  if (typing.id === id && typing.text === text) return;
  stopTyping();
  typing = { id, text, i: 0, timer: null };
  els.draftBody.hidden = false;
  els.draftEdit.hidden = true;
  els.draftBody.textContent = "";
  const step = Math.max(1, Math.ceil(text.length / 180));
  typing.timer = setInterval(() => {
    typing.i = Math.min(text.length, typing.i + step);
    els.draftBody.textContent = text.slice(0, typing.i);
    if (typing.i >= text.length) {
      clearInterval(typing.timer);
      typing.timer = null;
    }
  }, 16);
}

function renderBanner() {
  const snap = window.__SNAPSHOT_LABEL__ || (room && room.snapshot_label);
  if (STATIC && snap) {
    els.banner.className = "snapshot-banner";
    const lastIso = window.__ROOMS_LAST_UPDATED__ || (room && room.status && room.status.last_updated) || room.rooms_last_updated || "";
    const last = lastIso ? ` Rooms last updated ${formatMST(lastIso)}.` : "";
    els.banner.innerHTML = `<strong>SNAPSHOT</strong> — ${escapeHtml(snap)}.${last} This is a saved view, not a live run. Approve in chat.`;
    els.banner.hidden = false;
    return;
  }
  if (room && room.live_note) {
    els.banner.className = "banner";
    els.banner.textContent = room.live_note;
    els.banner.classList.remove("hidden");
  } else if (els.banner) {
    els.banner.classList.add("hidden");
  }
}

function renderHeader() {
  const st = room.status || {};
  const state = st.state || "idle";
  document.title = `${displayName(room)} — Agent Hub`;
  els.room.className = `room-wrap room accent-${accentOf(room)}`;
  els.room.dataset.state = state;
  document.body.classList.toggle("static", STATIC);
  if (els.cols) els.cols.classList.toggle("no-queue", room.queue_enabled === false);
  els.crumb.textContent = displayName(room);
  els.name.textContent = displayName(room).toUpperCase();
  els.light.dataset.state = state;
  els.label.textContent = hudStatus(state);
  els.lv.textContent = `LV ${workLevel(room)}`;
  const clock = document.getElementById("clock-readout");
  const lu = (room.status && room.status.last_updated) || room.rooms_last_updated || window.__ROOMS_LAST_UPDATED__ || "";
  if (clock && lu) clock.textContent = `LAST UPDATED ${formatMST(lu)}`;

  const bits = [];
  if (st.current_step) bits.push(`<strong>${escapeHtml(st.current_step)}</strong>`);
  if (st.current_source) bits.push(escapeHtml(st.current_source));
  if (st.error) bits.push(`<span style="color:var(--bad)">${escapeHtml(st.error)}</span>`);
  els.step.innerHTML = bits.join(" · ");
  const isScout = room.id === "scout";
  document.getElementById("room")?.classList.toggle("has-neighborhood", isScout);
  if (els.char) {
    if (isScout) {
      els.char.classList.add("neighborhood-stage");
      syncNeighborhood(els.char, { state });
    } else {
      els.char.classList.remove("neighborhood-stage");
      syncCharacter(els.char, { kind: characterOf(room), character: characterOf(room), state, size: 256 });
    }
  }

  const badges = room.badges || [];
  els.stats.innerHTML = badges
    .map((b) => `<div class="stat"><b>${escapeHtml(b.value)}</b> ${escapeHtml(b.label.replace(/^\d+\s+/, ""))}</div>`)
    .join("");
  if (!badges.length) {
    els.stats.innerHTML = `<div class="stat">LV from work counts · ${workUnitsSafe()}</div>`;
  }

  const run = room.run || {};
  if (STATIC) {
    els.runBtn.hidden = true;
    els.runBtn.disabled = true;
    els.runNote.textContent = "Snapshot only — run the agent from the local dashboard.";
  } else {
    els.runBtn.hidden = false;
    const canRun = run.available && !run.running && room.folder_exists;
    els.runBtn.disabled = !canRun;
    if (run.running) {
      els.runBtn.textContent = "Running…";
      els.runNote.textContent = run.detected_command || run.command || "";
    } else if (run.available) {
      els.runBtn.textContent = "Run";
      els.runNote.textContent = run.note || run.detected_command || "";
    } else {
      els.runBtn.textContent = "Run";
      els.runNote.textContent = run.note || "Run is disabled until a no-key command is documented in the README.";
    }
  }
  const log = (run.log_tail || []).join("\n");
  if (log) {
    els.consoleWrap.hidden = false;
    if (!streaming) els.consoleLog.textContent = log;
  }
}

function workUnitsSafe() {
  const c = (room.status && room.status.counts) || {};
  return (c.scored || 0) + (c.drafts || 0) + (c.items_found || 0);
}

function renderComms() {
  const st = room.status || {};
  const state = st.state || "idle";
  const events = room.events || [];
  const steps = events.slice(-8).map((ev) => {
    const detail = ev.detail || ev.title || ev.source || ev.type || "";
    return `<li class="done"><span class="etype">${escapeHtml(ev.type || "event")}</span> ${escapeHtml(detail)} <time>${escapeHtml(fmtTime(ev.ts))}</time></li>`;
  });
  if (st.current_step) {
    steps.push(`<li><span class="etype">NOW</span> ${escapeHtml(st.current_step)}${st.current_source ? " · " + escapeHtml(st.current_source) : ""}</li>`);
  }
  const liveNote = room.live_wired
    ? ""
    : `<p class="approve-chat">Live feed not wired yet. Showing last outputs on disk.</p>`;
  const title = st.current_step || (room.live_wired ? hudStatus(state) : "Standby — last outputs on disk");
  els.comms.innerHTML = `
    <article class="task-card">
      <h3>${escapeHtml(title)}</h3>
      ${liveNote}
      <ul class="steps">${steps.length ? steps.join("") : `<li>No inner steps yet. Events will list here once roomlog is wired.</li>`}</ul>
    </article>`;
}

function labelMessage(t) {
  if (t === "warm_network") return "Warm network";
  if (t === "professional") return "Professional";
  if (t === "follow-up") return "Follow-up";
  return t;
}

function actionButtons(d) {
  if (!d) return "";
  return `
    <button type="button" class="good" data-act="approved" data-id="${escapeHtml(d.id)}">Approve for sending</button>
    <button type="button" class="bad" data-act="rejected" data-id="${escapeHtml(d.id)}">Reject</button>
    <button type="button" data-act="edit" data-id="${escapeHtml(d.id)}">Edit</button>
  `;
}

function renderCenter() {
  const d = currentDraft();
  const state = (room.status && room.status.state) || "idle";
  if (editing && d && selectedId === d.id) return;
  if (!d || !draftText(d) && !d.subject && STATIC) {
    // Snapshot often omits bodies; still show a short card in outbox only.
    if (els.nowDraft) els.nowDraft.hidden = true;
    return;
  }
  if (!d) {
    if (els.nowDraft) els.nowDraft.hidden = true;
    return;
  }
  els.nowDraft.hidden = false;
  selectedId = d.id;
  const landing = d.landing_url || room.invite_url || "";
  const to = d.to_email ? `${d.to_name} <${d.to_email}>` : d.to_name;
  const pills = [];
  if (d.decision) pills.push(`<span class="pill ${escapeHtml(d.decision)}">${escapeHtml(d.decision)}</span>`);
  if (d.message_type) pills.push(`<span class="pill msg-${escapeHtml(d.message_type)}">${escapeHtml(labelMessage(d.message_type))}</span>`);
  els.draftMeta.innerHTML = `
    <strong>${escapeHtml(d.subject || "Draft")}</strong>
    ${to ? `To: ${escapeHtml(to)}` : ""}
    ${d.opportunity ? `<div>Opportunity: ${escapeHtml(d.opportunity)}</div>` : ""}
    ${landing ? `<div>Landing: <a href="${escapeHtml(landing)}" target="_blank" rel="noopener">${escapeHtml(landing)}</a></div>` : ""}
    <div>${pills.join(" ")}</div>`;
  const text = draftText(d);
  typeDraft(d.id, text, state === "drafting" && d.decision !== "edited");
  if (STATIC || room.queue_enabled === false) {
    els.draftActions.hidden = false;
    els.draftActions.innerHTML = STATIC
      ? `<p class="send-note">Approve in chat. This snapshot cannot send or record a decision.</p>`
      : `<p class="send-note">This agent has no approval queue.</p>`;
  } else {
    els.draftActions.hidden = false;
    els.draftActions.innerHTML = `${actionButtons(d)}<p class="send-note">Nothing is sent from this dashboard. Sending happens only with Robert's confirmation.</p>`;
  }
}

function renderQueue() {
  if (room.queue_enabled === false) {
    if (els.outbox) els.outbox.hidden = true;
    return;
  }
  if (els.outbox) els.outbox.hidden = false;
  const drafts = room.drafts || [];
  const pending = drafts.filter((d) => d.decision !== "approved" && d.decision !== "rejected").length;
  els.queueBadge.textContent = String(pending);
  if (!drafts.length) {
    els.queue.innerHTML = `<div class="empty">No finished work in the outbox yet.</div>`;
    return;
  }
  const note = STATIC
    ? `<p class="approve-chat">Approve in chat. This snapshot cannot send or record a decision.</p>`
    : "";
  els.queue.innerHTML =
    note +
    drafts
      .map((d) => {
        const sel = d.id === selectedId ? " selected" : "";
        const status = d.decision || "pending";
        const type = d.message_type
          ? `<span class="pill msg-${escapeHtml(d.message_type)}">${escapeHtml(labelMessage(d.message_type))}</span>`
          : "";
        const btns = STATIC ? "" : `<div class="qbtns">${actionButtons(d)}</div>`;
        return `<article class="out-item${sel}" data-select="${escapeHtml(d.id)}">
          <div class="clock" aria-hidden="true"></div>
          <div>
            <div class="out-title">${escapeHtml(d.to_name || d.subject || "Draft")}</div>
            <div class="out-sub">${escapeHtml(d.subject || "")} ${type} <span class="pill ${escapeHtml(status)}">${escapeHtml(status)}</span></div>
            <div class="review-hint">OPEN TO REVIEW</div>
            ${btns}
          </div>
        </article>`;
      })
      .join("");
}

function fmtMoney(amount, currency) {
  if (amount == null || amount === "") return "—";
  if (typeof amount === "number") {
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: currency || "USD", maximumFractionDigits: 0 }).format(amount);
    } catch {
      return String(amount);
    }
  }
  return String(amount);
}

function renderPanel(panel) {
  if (panel.type === "income") {
    const totals = panel.totals || [];
    if (!totals.length) return `<div class="empty">No income totals yet.</div>`;
    return `<div class="income-tiles">${totals
      .map(
        (t) => `<div class="income-tile"><div class="ilabel">${escapeHtml(t.label)}</div><div class="iamt">${escapeHtml(fmtMoney(t.amount, t.currency))}</div></div>`,
      )
      .join("")}</div>`;
  }
  const items = panel.items || [];
  if (!items.length) return `<div class="empty">None yet.</div>`;
  return items
    .map((item) => {
      const name = item.url
        ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">${escapeHtml(item.name || item.title)}</a>`
        : escapeHtml(item.name || item.title || "");
      const pills = [];
      if (item.payout_known === true) pills.push(`<span class="pill known">payout known</span>`);
      if (item.payout_known === false && panel.type === "opportunities") pills.push(`<span class="pill unknown">payout unknown</span>`);
      if (item.message_type) pills.push(`<span class="pill msg-${escapeHtml(item.message_type)}">${escapeHtml(labelMessage(item.message_type))}</span>`);
      const score = item.score != null ? item.score : item.fit_score;
      const meta = [item.payout, item.city, item.industry, item.source, item.role, item.channel, item.status, item.confidence != null ? `confidence ${item.confidence}` : ""]
        .filter(Boolean)
        .join(" · ");
      const why = item.why || item.snippet || item.summary || item.match_reason || "";
      return `<article class="row">
        <div class="rtitle"><span>${name} ${pills.join(" ")}</span>${score != null && score !== "" ? `<span class="score">${escapeHtml(score)}</span>` : ""}</div>
        ${meta ? `<div class="rmeta">${escapeHtml(meta)}</div>` : ""}
        ${why ? `<div class="rwhy">${escapeHtml(why)}</div>` : ""}
      </article>`;
    })
    .join("");
}

function renderLower() {
  const panels = room.panels || [];
  if (!panels.length) {
    els.dataPanels.innerHTML = "";
    return;
  }
  els.dataPanels.innerHTML = panels
    .map(
      (panel) => `<div class="task-card">
        <h3>${escapeHtml(panel.title)} <span class="queue-badge">${(panel.items || panel.totals || []).length}</span></h3>
        <div class="list">${renderPanel(panel)}</div>
      </div>`,
    )
    .join("");
}

function renderAll() {
  renderBanner();
  renderHeader();
  renderComms();
  renderCenter();
  renderQueue();
  renderLower();
}

async function refresh() {
  if (!agentId && !(STATIC && window.__ROOM_DATA__)) {
    els.banner.classList.remove("hidden");
    els.banner.textContent = "No agent id in the URL.";
    return;
  }
  try {
    room = STATIC && window.__ROOM_DATA__ ? window.__ROOM_DATA__ : await getRoom(agentId);
    if (!selectedId && room.status && room.status.current_draft_id) {
      selectedId = room.status.current_draft_id;
    }
    renderAll();
  } catch (err) {
    els.banner.classList.remove("hidden");
    els.banner.className = "banner";
    els.banner.textContent = err.message;
  }
}

async function decide(id, action, text) {
  await postDecision(agentId, { draft_id: id, action, text: text || null });
  editing = false;
  await refresh();
}

function startEdit(id) {
  const d = (room.drafts || []).find((x) => x.id === id);
  if (!d) return;
  selectedId = id;
  editing = true;
  stopTyping();
  els.nowDraft.hidden = false;
  els.draftBody.hidden = true;
  els.draftEdit.hidden = false;
  els.draftEdit.value = draftText(d);
  els.draftActions.hidden = false;
  els.draftActions.innerHTML = `
    <button type="button" class="primary" data-act="save-edit" data-id="${escapeHtml(id)}">Save edit</button>
    <button type="button" data-act="cancel-edit">Cancel</button>
    <p class="send-note">The edited text is stored in room/decisions.json. Nothing is sent.</p>`;
  renderQueue();
}

els.queue.addEventListener("click", (ev) => {
  const sel = ev.target.closest("[data-select]");
  const btn = ev.target.closest("[data-act]");
  if (btn) return;
  if (sel) {
    selectedId = sel.getAttribute("data-select");
    editing = false;
    renderCenter();
    renderQueue();
  }
});

document.addEventListener("click", async (ev) => {
  const btn = ev.target.closest("[data-act]");
  if (!btn) return;
  ev.preventDefault();
  ev.stopPropagation();
  const act = btn.getAttribute("data-act");
  const id = btn.getAttribute("data-id");
  try {
    if (act === "approved" || act === "rejected") await decide(id, act);
    else if (act === "edit") startEdit(id);
    else if (act === "save-edit") await decide(id, "edited", els.draftEdit.value);
    else if (act === "cancel-edit") {
      editing = false;
      renderCenter();
    }
  } catch (err) {
    els.banner.classList.remove("hidden");
    els.banner.textContent = err.message;
  }
});

els.runBtn.addEventListener("click", async () => {
  if (els.runBtn.disabled) return;
  try {
    els.runBtn.disabled = true;
    els.runBtn.textContent = "Starting…";
    await startRun(agentId);
    els.consoleWrap.hidden = false;
    streamRun();
    await refresh();
  } catch (err) {
    els.runBtn.disabled = false;
    els.banner.classList.remove("hidden");
    els.banner.textContent = err.message;
  }
});

function streamRun() {
  if (streaming) return;
  streaming = true;
  els.consoleWrap.hidden = false;
  const src = new EventSource(`/api/agents/${encodeURIComponent(agentId)}/run/stream`);
  src.onmessage = (ev) => {
    try {
      const data = JSON.parse(ev.data);
      if (data.line != null) {
        els.consoleLog.textContent += (els.consoleLog.textContent ? "\n" : "") + data.line;
        els.consoleLog.scrollTop = els.consoleLog.scrollHeight;
      }
      if (data.done) {
        src.close();
        streaming = false;
        refresh();
      }
    } catch {
      /* ignore */
    }
  };
  src.onerror = () => {
    src.close();
    streaming = false;
    refresh();
  };
}

paintStars(document.getElementById("stars"));
refresh();
if (!STATIC) {
  setInterval(() => {
    if (!editing) refresh();
  }, 2000);
}
