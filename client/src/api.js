const BASE = "/api/sessions";

async function json(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

export const api = {
  listSessions: (archived = false) =>
    fetch(`${BASE}?archived=${archived}`).then(json),

  createSession: () => fetch(BASE, { method: "POST" }).then(json),

  getMessages: (id) => fetch(`${BASE}/${id}/messages`).then(json),

  updateSession: (id, patch) =>
    fetch(`${BASE}/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).then(json),

  deleteSession: (id) =>
    fetch(`${BASE}/${id}`, { method: "DELETE" }).then((res) => {
      if (!res.ok) throw new Error(`Delete failed (${res.status})`);
    }),
};

export function relativeTime(epochSeconds) {
  if (!epochSeconds) return "";
  const diff = Date.now() / 1000 - epochSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
