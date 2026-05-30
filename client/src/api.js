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
  listTools: (assistantId) =>
    fetch(`/api/tools?assistantId=${encodeURIComponent(assistantId)}`).then(json),

  createTool: (assistantId, body) =>
    fetch(`/api/tools?assistantId=${encodeURIComponent(assistantId)}`, {
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

  importTools: (assistantId, kind, body) =>
    fetch(`/api/tools/import/${kind}?assistantId=${encodeURIComponent(assistantId)}`, {
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

  // --- agent skills ---
  listSkills: (assistantId) =>
    fetch(`/api/skills?assistantId=${encodeURIComponent(assistantId)}`).then(json),

  uploadSkill: (assistantId, file) => {
    const fd = new FormData();
    fd.append("file", file);
    // No Content-Type header: the browser sets the multipart boundary itself.
    return fetch(`/api/skills?assistantId=${encodeURIComponent(assistantId)}`, {
      method: "POST",
      body: fd,
    }).then(json);
  },

  updateSkill: (id, body) =>
    fetch(`/api/skills/${id}`, {
      method: "PATCH",
      headers: jsonHeaders,
      body: JSON.stringify(body),
    }).then(json),

  replaceSkillFile: (id, file) => {
    const fd = new FormData();
    fd.append("file", file);
    return fetch(`/api/skills/${id}`, { method: "PATCH", body: fd }).then(json);
  },

  deleteSkill: (id) => fetch(`/api/skills/${id}`, { method: "DELETE" }).then(ok),
};

export function relativeTime(epochSeconds) {
  if (!epochSeconds) return "";
  const diff = Date.now() / 1000 - epochSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
