import { useEffect, useState } from "react";
import { api } from "../api";

const TRANSPORTS = [
  { value: "streamable_http", label: "Streamable HTTP" },
  { value: "sse", label: "SSE" },
];

const AUTH_TYPES = [
  { value: "none", label: "None" },
  { value: "api_key_header", label: "API key (header)" },
  { value: "bearer_token", label: "Bearer token" },
  { value: "basic_auth", label: "Basic auth" },
  { value: "oauth_client_credentials", label: "OAuth (client credentials)" },
  { value: "oauth_auth_code", label: "OAuth (authorization code)" },
];

const EMPTY = {
  name: "",
  description: "",
  transport: "streamable_http",
  url: "",
  sseEndpoint: "",
  authType: "none",
  authConfig: "",
  enabled: true,
};

function parseAuth(authConfig) {
  if (!authConfig) return {};
  try {
    return JSON.parse(authConfig);
  } catch {
    return {};
  }
}

export default function McpServersPanel() {
  const [assistants, setAssistants] = useState([]);
  const [assistantId, setAssistantId] = useState("");
  const [servers, setServers] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [auth, setAuth] = useState({});
  const [secret, setSecret] = useState("");
  const [hasSecret, setHasSecret] = useState(false);
  const [tools, setTools] = useState([]);
  const [serverStatus, setServerStatus] = useState(null);
  const [discovering, setDiscovering] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .listAssistants()
      .then((list) => {
        setAssistants(list);
        if (list.length > 0) setAssistantId((cur) => cur || list[0].id);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (assistantId) load();
    else setServers([]);
    cancel();
  }, [assistantId]);

  async function load() {
    if (!assistantId) return;
    try {
      setServers(await api.listMcpServers(assistantId));
    } catch (e) {
      setError(e.message);
    }
  }

  function startNew() {
    setEditingId("new");
    setForm(EMPTY);
    setAuth({});
    setSecret("");
    setHasSecret(false);
    setTools([]);
    setServerStatus(null);
    setError("");
  }

  function startEdit(s) {
    setEditingId(s.id);
    setForm({
      name: s.name || "",
      description: s.description || "",
      transport: s.transport || "streamable_http",
      url: s.url || "",
      sseEndpoint: s.sseEndpoint || "",
      authType: s.authType || "none",
      authConfig: s.authConfig || "",
      enabled: s.enabled,
    });
    setAuth(parseAuth(s.authConfig));
    setSecret("");
    setHasSecret(!!s.hasSecret);
    setServerStatus({ status: s.status, statusDetail: s.statusDetail });
    setTools(s.tools || []);
    setError("");
    // Pull fresh tool list for the server.
    api
      .listMcpTools(s.id)
      .then(setTools)
      .catch(() => {});
  }

  function cancel() {
    setEditingId(null);
    setForm(EMPTY);
    setAuth({});
    setSecret("");
    setHasSecret(false);
    setTools([]);
    setServerStatus(null);
    setError("");
  }

  function buildAuthConfig() {
    if (form.authType === "none") return "";
    return JSON.stringify(auth);
  }

  async function save() {
    if (!form.name.trim() || !form.url.trim()) {
      setError("Name and URL are required.");
      return;
    }
    const body = {
      name: form.name.trim(),
      description: form.description,
      transport: form.transport,
      url: form.url.trim(),
      sseEndpoint: form.sseEndpoint.trim(),
      authType: form.authType,
      authConfig: buildAuthConfig(),
      enabled: form.enabled,
    };
    // secret: only send when the user typed one (null => keep existing server-side).
    if (secret) body.secret = secret;
    try {
      if (editingId === "new") {
        const created = await api.createMcpServer(assistantId, body);
        await load();
        startEdit(created);
      } else {
        await api.updateMcpServer(editingId, body);
        await load();
        const refreshed = await api.getMcpServer(editingId);
        startEdit(refreshed);
      }
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(s) {
    if (!window.confirm(`Delete MCP server "${s.name}"?`)) return;
    try {
      await api.deleteMcpServer(s.id);
      if (editingId === s.id) cancel();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function discover() {
    if (editingId == null || editingId === "new") return;
    setDiscovering(true);
    setError("");
    try {
      const updated = await api.discoverMcpServer(editingId);
      setServerStatus({ status: updated.status, statusDetail: updated.statusDetail });
      setTools(updated.tools || (await api.listMcpTools(editingId)));
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setDiscovering(false);
    }
  }

  async function toggleTool(t, enabled) {
    try {
      await api.setMcpToolEnabled(editingId, t.id, enabled);
      setTools((list) =>
        list.map((x) => (x.id === t.id ? { ...x, enabled } : x))
      );
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="assistants-panel">
      <div className="assistants-list">
        <label className="field-label">Assistant</label>
        <select
          value={assistantId}
          onChange={(e) => setAssistantId(e.target.value)}
        >
          {assistants.length === 0 && <option value="">No assistants</option>}
          {assistants.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <button
          className="new-chat"
          style={{ marginTop: 12 }}
          onClick={startNew}
          disabled={!assistantId}
        >
          + New MCP server
        </button>

        {servers.length === 0 && (
          <div className="muted small" style={{ marginTop: 8 }}>
            No MCP servers for this assistant yet.
          </div>
        )}
        {servers.map((s) => (
          <div
            key={s.id}
            className={`assistant-row ${editingId === s.id ? "selected" : ""}`}
            onClick={() => startEdit(s)}
          >
            <div className="assistant-row-main">
              <div className="assistant-row-name">
                {s.name} {!s.enabled && <span className="muted small">(off)</span>}
              </div>
              <div className="muted small">
                {s.transport} · {s.url}
              </div>
              {s.status && (
                <div className={`muted small ${s.status === "error" ? "form-error" : ""}`}>
                  {s.status}
                </div>
              )}
            </div>
            <button
              className="icon-btn"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                remove(s);
              }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <div className="assistant-form">
        {editingId == null ? (
          <div className="muted">
            Select an MCP server to edit, or create a new one.
          </div>
        ) : (
          <>
            <label className="field-label">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. github-mcp"
            />

            <label className="field-label">Description</label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="What this server provides"
            />

            <div className="row-2">
              <div>
                <label className="field-label">Transport</label>
                <select
                  value={form.transport}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, transport: e.target.value }))
                  }
                >
                  {TRANSPORTS.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <label className="tool-check enabled-check">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, enabled: e.target.checked }))
                  }
                />
                Enabled
              </label>
            </div>

            <label className="field-label">URL</label>
            <input
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
              placeholder="https://mcp.example.com/mcp"
            />

            {form.transport === "sse" && (
              <>
                <label className="field-label">SSE endpoint (optional)</label>
                <input
                  value={form.sseEndpoint}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, sseEndpoint: e.target.value }))
                  }
                  placeholder="/sse"
                />
              </>
            )}

            <label className="field-label">Authentication</label>
            <select
              value={form.authType}
              onChange={(e) =>
                setForm((f) => ({ ...f, authType: e.target.value }))
              }
            >
              {AUTH_TYPES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>

            <McpAuthFields
              type={form.authType}
              auth={auth}
              setAuth={setAuth}
              secret={secret}
              setSecret={setSecret}
              hasSecret={hasSecret}
            />

            {error && <div className="form-error">{error}</div>}

            <div className="form-actions">
              <button className="primary" onClick={save}>
                Save
              </button>
              <button onClick={cancel}>Cancel</button>
            </div>

            {editingId !== "new" && (
              <div className="test-box">
                <div className="form-actions">
                  <button onClick={discover} disabled={discovering}>
                    {discovering ? "Discovering…" : "🔌 Discover tools"}
                  </button>
                </div>

                {serverStatus && serverStatus.status && (
                  <div
                    className={
                      serverStatus.status === "error"
                        ? "form-error"
                        : "muted small"
                    }
                  >
                    {serverStatus.status}
                    {serverStatus.statusDetail
                      ? ` — ${serverStatus.statusDetail}`
                      : ""}
                  </div>
                )}

                {tools.length === 0 ? (
                  <div className="muted small" style={{ marginTop: 8 }}>
                    No tools discovered yet. Click "Discover tools".
                  </div>
                ) : (
                  <div style={{ marginTop: 8 }}>
                    <label className="field-label">
                      Tools ({tools.filter((t) => t.enabled).length}/{tools.length} enabled)
                    </label>
                    {tools.map((t) => (
                      <label key={t.id} className="tool-check" title={t.description || ""}>
                        <input
                          type="checkbox"
                          checked={t.enabled}
                          onChange={(e) => toggleTool(t, e.target.checked)}
                        />
                        <span className="assistant-row-name">{t.name}</span>
                        {t.description && (
                          <span className="muted small"> — {t.description}</span>
                        )}
                      </label>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function McpAuthFields({ type, auth, setAuth, secret, setSecret, hasSecret }) {
  const set = (k, v) => setAuth((a) => ({ ...a, [k]: v }));
  const secretPlaceholder = hasSecret ? "•••••• (leave blank to keep)" : "";

  if (type === "api_key_header") {
    return (
      <>
        <label className="field-label">Header name</label>
        <input
          value={auth.name || ""}
          onChange={(e) => set("name", e.target.value)}
          placeholder="X-Api-Key"
        />
        <label className="field-label">API key</label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={secretPlaceholder}
        />
      </>
    );
  }
  if (type === "bearer_token") {
    return (
      <>
        <label className="field-label">Token</label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={secretPlaceholder}
        />
      </>
    );
  }
  if (type === "basic_auth") {
    return (
      <>
        <label className="field-label">Username</label>
        <input
          value={auth.username || ""}
          onChange={(e) => set("username", e.target.value)}
        />
        <label className="field-label">Password</label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={secretPlaceholder}
        />
      </>
    );
  }
  if (type === "oauth_client_credentials" || type === "oauth_auth_code") {
    return (
      <>
        <label className="field-label">Client ID</label>
        <input
          value={auth.clientId || ""}
          onChange={(e) => set("clientId", e.target.value)}
        />
        <label className="field-label">Client secret</label>
        <input
          type="password"
          value={secret}
          onChange={(e) => setSecret(e.target.value)}
          placeholder={secretPlaceholder}
        />
        <label className="field-label">Token URL</label>
        <input
          value={auth.tokenUrl || ""}
          onChange={(e) => set("tokenUrl", e.target.value)}
          placeholder="https://auth.example.com/oauth/token"
        />
        <label className="field-label">Scopes (space-separated, optional)</label>
        <input
          value={auth.scopes || ""}
          onChange={(e) => set("scopes", e.target.value)}
          placeholder="read write"
        />
        {type === "oauth_auth_code" && (
          <div className="muted small">
            Authorization-code flow is scaffolded; client-credentials is the
            functional OAuth path.
          </div>
        )}
      </>
    );
  }
  return null;
}
