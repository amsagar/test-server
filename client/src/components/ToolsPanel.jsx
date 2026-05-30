import { useEffect, useState } from "react";
import { api } from "../api";

const METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE"];

const EMPTY = {
  name: "",
  description: "",
  method: "GET",
  host: "",
  endpoint: "",
  requestSchema: "",
  authProfileId: "",
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

export default function ToolsPanel() {
  const [assistants, setAssistants] = useState([]);
  const [assistantId, setAssistantId] = useState("");
  const [tools, setTools] = useState([]);
  const [profiles, setProfiles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [auth, setAuth] = useState({});
  const [error, setError] = useState("");
  const [testInput, setTestInput] = useState("{}");
  const [testResult, setTestResult] = useState(null);
  const [importKind, setImportKind] = useState("curl");
  const [importHost, setImportHost] = useState("");
  const [importContent, setImportContent] = useState("");
  const [importMsg, setImportMsg] = useState(null);

  useEffect(() => {
    api
      .listAssistants()
      .then((list) => {
        setAssistants(list);
        if (list.length > 0) setAssistantId((cur) => cur || list[0].id);
      })
      .catch((e) => setError(e.message));
    api.listAuthProfiles().then(setProfiles).catch(() => setProfiles([]));
  }, []);

  useEffect(() => {
    if (assistantId) load();
    else setTools([]);
    cancel();
  }, [assistantId]);

  async function load() {
    if (!assistantId) return;
    try {
      setTools(await api.listTools(assistantId));
    } catch (e) {
      setError(e.message);
    }
  }

  function startNew() {
    setEditingId("new");
    setForm(EMPTY);
    setAuth({});
    setError("");
    setTestResult(null);
  }

  function startEdit(t) {
    setEditingId(t.id);
    setForm({
      name: t.name || "",
      description: t.description || "",
      method: t.method || "GET",
      host: t.host || "",
      endpoint: t.endpoint || "",
      requestSchema: t.requestSchema || "",
      authProfileId: t.authProfileId || "",
      authType: t.authType || "none",
      authConfig: t.authConfig || "",
      enabled: t.enabled,
    });
    setAuth(parseAuth(t.authConfig));
    setError("");
    setTestResult(null);
  }

  function cancel() {
    setEditingId(null);
    setForm(EMPTY);
    setAuth({});
    setError("");
    setTestResult(null);
  }

  function buildAuthConfig() {
    if (form.authType === "none") return "";
    return JSON.stringify(auth);
  }

  async function save() {
    if (!form.name.trim() || !form.host.trim()) {
      setError("Name and host are required.");
      return;
    }
    if (form.requestSchema.trim()) {
      try {
        JSON.parse(form.requestSchema);
      } catch {
        setError("Request schema must be valid JSON.");
        return;
      }
    }
    const usingProfile = !!form.authProfileId;
    const body = {
      name: form.name.trim(),
      description: form.description,
      method: form.method,
      host: form.host.trim(),
      endpoint: form.endpoint,
      requestSchema: form.requestSchema,
      authProfileId: form.authProfileId,
      authType: usingProfile ? "none" : form.authType,
      authConfig: usingProfile ? "" : buildAuthConfig(),
      enabled: form.enabled,
    };
    try {
      if (editingId === "new") {
        await api.createTool(assistantId, body);
      } else {
        await api.updateTool(editingId, body);
      }
      cancel();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(t) {
    if (!window.confirm(`Delete tool "${t.name}"?`)) return;
    try {
      await api.deleteTool(t.id);
      if (editingId === t.id) cancel();
      await load();
    } catch (e) {
      setError(e.message);
    }
  }

  async function runTest() {
    setTestResult(null);
    try {
      const r = await api.testTool(editingId, { input: testInput });
      setTestResult(r);
    } catch (e) {
      setTestResult({ success: false, output: e.message });
    }
  }

  async function runImport() {
    setImportMsg(null);
    if (!importContent.trim()) {
      setImportMsg({ ok: false, text: "Paste content to import." });
      return;
    }
    try {
      const r = await api.importTools(assistantId, importKind, {
        content: importContent,
        host: importHost.trim() || undefined,
      });
      setImportMsg({ ok: true, text: `Imported ${r.count} tool(s).` });
      setImportContent("");
      await load();
    } catch (e) {
      setImportMsg({ ok: false, text: e.message });
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
          + New tool
        </button>
        <button
          className="new-chat"
          onClick={() => {
            setEditingId("import");
            setError("");
            setImportMsg(null);
          }}
          disabled={!assistantId}
        >
          ⬇ Import
        </button>
        {tools.length === 0 && (
          <div className="muted small" style={{ marginTop: 8 }}>
            No tools for this assistant yet.
          </div>
        )}
        {tools.map((t) => (
          <div
            key={t.id}
            className={`assistant-row ${editingId === t.id ? "selected" : ""}`}
            onClick={() => startEdit(t)}
          >
            <div className="assistant-row-main">
              <div className="assistant-row-name">
                {t.name} {!t.enabled && <span className="muted small">(off)</span>}
              </div>
              <div className="muted small">
                {t.method} {t.host}
              </div>
            </div>
            <button
              className="icon-btn"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                remove(t);
              }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <div className="assistant-form">
        {editingId == null ? (
          <div className="muted">Select a tool to edit, or create a new one.</div>
        ) : editingId === "import" ? (
          <>
            <label className="field-label">Import format</label>
            <select
              value={importKind}
              onChange={(e) => setImportKind(e.target.value)}
            >
              <option value="curl">cURL command (1 tool)</option>
              <option value="openapi">OpenAPI 3 spec (JSON)</option>
              <option value="postman">Postman collection (JSON)</option>
            </select>

            <label className="field-label">
              Host override {importKind === "curl" ? "(optional)" : "(optional — used if spec has none)"}
            </label>
            <input
              value={importHost}
              onChange={(e) => setImportHost(e.target.value)}
              placeholder="https://api.example.com"
            />

            <label className="field-label">
              {importKind === "curl" ? "cURL command" : "JSON content"}
            </label>
            <textarea
              className="prompt-area"
              value={importContent}
              onChange={(e) => setImportContent(e.target.value)}
              placeholder={
                importKind === "curl"
                  ? "curl -X POST https://api.example.com/v1/users -d '{\"name\":\"x\"}'"
                  : "Paste the spec / collection JSON here"
              }
              rows={12}
            />

            {importMsg && (
              <div className={importMsg.ok ? "muted small" : "form-error"}>
                {importMsg.text}
              </div>
            )}

            <div className="form-actions">
              <button className="primary" onClick={runImport}>
                Import
              </button>
              <button onClick={cancel}>Cancel</button>
            </div>
          </>
        ) : (
          <>
            <label className="field-label">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. get_weather"
            />

            <label className="field-label">Description</label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="What the model sees — when to use this tool"
            />

            <div className="row-2">
              <div>
                <label className="field-label">Method</label>
                <select
                  value={form.method}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, method: e.target.value }))
                  }
                >
                  {METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
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

            <label className="field-label">Host</label>
            <input
              value={form.host}
              onChange={(e) => setForm((f) => ({ ...f, host: e.target.value }))}
              placeholder="https://api.example.com"
            />

            <label className="field-label">Endpoint (use {"{param}"} for path params)</label>
            <input
              value={form.endpoint}
              onChange={(e) =>
                setForm((f) => ({ ...f, endpoint: e.target.value }))
              }
              placeholder="/v1/users/{id}"
            />

            <label className="field-label">Request schema (JSON Schema)</label>
            <textarea
              className="prompt-area"
              value={form.requestSchema}
              onChange={(e) =>
                setForm((f) => ({ ...f, requestSchema: e.target.value }))
              }
              placeholder='{"type":"object","properties":{"id":{"type":"string"}},"required":["id"]}'
              rows={5}
            />

            <label className="field-label">Auth profile (reusable)</label>
            <select
              value={form.authProfileId}
              onChange={(e) =>
                setForm((f) => ({ ...f, authProfileId: e.target.value }))
              }
            >
              <option value="">None — use inline auth below</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.authType})
                </option>
              ))}
            </select>

            {!form.authProfileId && (
              <>
                <label className="field-label">Inline authentication</label>
                <select
                  value={form.authType}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, authType: e.target.value }))
                  }
                >
                  <option value="none">None</option>
                  <option value="api_key">API key</option>
                  <option value="bearer">Bearer token</option>
                  <option value="basic">Basic auth</option>
                </select>

                <AuthFields type={form.authType} auth={auth} setAuth={setAuth} />
              </>
            )}

            {error && <div className="form-error">{error}</div>}

            <div className="form-actions">
              <button className="primary" onClick={save}>
                Save
              </button>
              <button onClick={cancel}>Cancel</button>
            </div>

            {editingId !== "new" && (
              <div className="test-box">
                <label className="field-label">Test — input JSON</label>
                <textarea
                  className="prompt-area"
                  value={testInput}
                  onChange={(e) => setTestInput(e.target.value)}
                  rows={3}
                />
                <div className="form-actions">
                  <button onClick={runTest}>Run test</button>
                </div>
                {testResult && (
                  <pre
                    className={`tool-pre ${testResult.success ? "" : "test-error"}`}
                  >
                    {testResult.output}
                  </pre>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function AuthFields({ type, auth, setAuth }) {
  const set = (k, v) => setAuth((a) => ({ ...a, [k]: v }));
  if (type === "api_key") {
    return (
      <>
        <label className="field-label">Send as</label>
        <select value={auth.in || "header"} onChange={(e) => set("in", e.target.value)}>
          <option value="header">Header</option>
          <option value="query">Query param</option>
        </select>
        <label className="field-label">Key name</label>
        <input
          value={auth.name || ""}
          onChange={(e) => set("name", e.target.value)}
          placeholder="X-API-Key"
        />
        <label className="field-label">Value</label>
        <input
          value={auth.value || ""}
          onChange={(e) => set("value", e.target.value)}
          placeholder="secret"
        />
      </>
    );
  }
  if (type === "bearer") {
    return (
      <>
        <label className="field-label">Token</label>
        <input
          value={auth.token || ""}
          onChange={(e) => set("token", e.target.value)}
          placeholder="token"
        />
      </>
    );
  }
  if (type === "basic") {
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
          value={auth.password || ""}
          onChange={(e) => set("password", e.target.value)}
        />
      </>
    );
  }
  return null;
}
