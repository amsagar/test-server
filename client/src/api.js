async function json(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return res.json();
}

async function ok(res) {
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
}

const jsonHeaders = { "Content-Type": "application/json" };

export const api = {
  // --- chat sessions ---
  listSessions: (archived = false) =>
    fetch(`/api/sessions?archived=${archived}`).then(json),

  createSession: (assistantId) =>
    fetch(
      `/api/sessions${assistantId ? `?assistantId=${encodeURIComponent(assistantId)}` : ""}`,
      { method: "POST" }
    ).then(json),

  getMessages: (id) => fetch(`/api/sessions/${id}/messages`).then(json),

  updateSession: (id, patch) =>
    fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(patch),
    }).then(json),

  deleteSession: (id) =>
    fetch(`/api/sessions/${id}`, { method: "DELETE" }).then(ok),

  truncateSession: (id, messageIndex) =>
    fetch(`/api/sessions/${id}/truncate?messageIndex=${messageIndex}`, {
      method: "POST",
    }).then(ok),

  // --- assistants ---
  listAssistants: () => fetch(`/api/assistants`).then(json),

  builtinTools: () => fetch(`/api/assistants/builtin-tools`).then(json),

  createAssistant: (body) =>
    fetch(`/api/assistants`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(body),
    }).then(json),

  updateAssistant: (id, body) =>
    fetch(`/api/assistants/${id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(body),
    }).then(json),

  deleteAssistant: (id) =>
    fetch(`/api/assistants/${id}`, { method: "DELETE" }).then(ok),

  // --- tool registry (Phase 2) ---
  listTools: () => fetch(`/api/tools`).then(json),

  createTool: (body) =>
    fetch(`/api/tools`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(body),
    }).then(json),

  updateTool: (id, body) =>
    fetch(`/api/tools/${id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(body),
    }).then(json),

  deleteTool: (id) => fetch(`/api/tools/${id}`, { method: "DELETE" }).then(ok),

  testTool: (id, body) =>
    fetch(`/api/tools/${id}/test`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(body || {}),
    }).then(json),

  importTools: (kind, body) =>
    fetch(`/api/tools/import/${kind}`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(body),
    }).then(json),

  // --- auth profiles (Phase 3) ---
  listAuthProfiles: () => fetch(`/api/tool-auth`).then(json),

  createAuthProfile: (body) =>
    fetch(`/api/tool-auth`, {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify(body),
    }).then(json),

  updateAuthProfile: (id, body) =>
    fetch(`/api/tool-auth/${id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(body),
    }).then(json),

  deleteAuthProfile: (id) =>
    fetch(`/api/tool-auth/${id}`, { method: "DELETE" }).then(ok),
};

export function relativeTime(epochSeconds) {
  if (!epochSeconds) return "";
  const diff = Date.now() / 1000 - epochSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
