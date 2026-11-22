export async function getAgents() {
  const r = await fetch("/api/agents", { cache: "no-store" });
  if (!r.ok) throw new Error("Could not load agents");
  return r.json();
}

export async function getRoom(id) {
  const r = await fetch(`/api/agents/${encodeURIComponent(id)}/room`, { cache: "no-store" });
  if (!r.ok) throw new Error("Could not load room");
  return r.json();
}

export async function postDecision(id, body) {
  const r = await fetch(`/api/agents/${encodeURIComponent(id)}/decisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.ok === false) {
    throw new Error(data.error || "Could not save the decision");
  }
  return data;
}

export async function startRun(id) {
  const r = await fetch(`/api/agents/${encodeURIComponent(id)}/run`, { method: "POST" });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || data.ok === false) {
    throw new Error(data.error || "Could not start the run");
  }
  return data;
}
