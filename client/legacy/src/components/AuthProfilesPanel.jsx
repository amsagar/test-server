import { useEffect, useState } from "react";
import { api } from "../api";

const EMPTY = {
  name: "",
  description: "",
  authType: "api_key",
  authConfig: {},
  clientSecret: "",
  tokenUrl: "",
  scopes: "",
};

function parseConfig(raw) {
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export default function AuthProfilesPanel({ onChanged }) {
  const [profiles, setProfiles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setProfiles(await api.listAuthProfiles());
    } catch (e) {
      setError(e.message);
    }
  }

  function startNew() {
    setEditingId("new");
    setForm(EMPTY);
    setError("");
  }

  function startEdit(p) {
    setEditingId(p.id);
    setForm({
      name: p.name || "",
      description: p.description || "",
      authType: p.authType || "api_key",
      authConfig: parseConfig(p.authConfig),
      clientSecret: "",
      tokenUrl: p.tokenUrl || "",
      scopes: p.scopes || "",
      hasClientSecret: p.hasClientSecret,
    });
    setError("");
  }

  function cancel() {
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  const setCfg = (k, v) =>
    setForm((f) => ({ ...f, authConfig: { ...f.authConfig, [k]: v } }));

  async function save() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    const body = {
      name: form.name.trim(),
      description: form.description,
      authType: form.authType,
      authConfig: JSON.stringify(form.authConfig || {}),
      tokenUrl: form.tokenUrl,
      scopes: form.scopes,
    };
    if (form.clientSecret) body.clientSecret = form.clientSecret;
    try {
      if (editingId === "new") {
        await api.createAuthProfile(body);
      } else {
        await api.updateAuthProfile(editingId, body);
      }
      cancel();
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(p) {
    if (!window.confirm(`Delete auth profile "${p.name}"?`)) return;
    try {
      await api.deleteAuthProfile(p.id);
      if (editingId === p.id) cancel();
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
  }

  const secretLabel = form.hasClientSecret
    ? "Secret (leave blank to keep existing)"
    : "Secret";

  return (
    <div className="assistants-panel">
      <div className="assistants-list">
        <button className="new-chat" onClick={startNew}>
          + New profile
        </button>
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`assistant-row ${editingId === p.id ? "selected" : ""}`}
            onClick={() => startEdit(p)}
          >
            <div className="assistant-row-main">
              <div className="assistant-row-name">{p.name}</div>
              <div className="muted small">{p.authType}</div>
            </div>
            <button
              className="icon-btn"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                remove(p);
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
            Reusable auth profiles let multiple tools share credentials. Secrets
            are encrypted at rest and never returned.
          </div>
        ) : (
          <>
            <label className="field-label">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Prod API key"
            />

            <label className="field-label">Description</label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
            />

            <label className="field-label">Type</label>
            <select
              value={form.authType}
              onChange={(e) =>
                setForm((f) => ({ ...f, authType: e.target.value }))
              }
            >
              <option value="api_key">API key</option>
              <option value="bearer">Bearer token</option>
              <option value="basic">Basic auth</option>
              <option value="oauth_client_credentials">
                OAuth client credentials
              </option>
            </select>

            {form.authType === "api_key" && (
              <>
                <label className="field-label">Send as</label>
                <select
                  value={form.authConfig.in || "header"}
                  onChange={(e) => setCfg("in", e.target.value)}
                >
                  <option value="header">Header</option>
                  <option value="query">Query param</option>
                </select>
                <label className="field-label">Key name</label>
                <input
                  value={form.authConfig.name || ""}
                  onChange={(e) => setCfg("name", e.target.value)}
                  placeholder="X-API-Key"
                />
                <label className="field-label">{secretLabel}</label>
                <input
                  value={form.clientSecret}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, clientSecret: e.target.value }))
                  }
                  placeholder="key value"
                />
              </>
            )}

            {form.authType === "bearer" && (
              <>
                <label className="field-label">{secretLabel}</label>
                <input
                  value={form.clientSecret}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, clientSecret: e.target.value }))
                  }
                  placeholder="token"
                />
              </>
            )}

            {form.authType === "basic" && (
              <>
                <label className="field-label">Username</label>
                <input
                  value={form.authConfig.username || ""}
                  onChange={(e) => setCfg("username", e.target.value)}
                />
                <label className="field-label">{secretLabel} (password)</label>
                <input
                  type="password"
                  value={form.clientSecret}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, clientSecret: e.target.value }))
                  }
                />
              </>
            )}

            {form.authType === "oauth_client_credentials" && (
              <>
                <label className="field-label">Token URL</label>
                <input
                  value={form.tokenUrl}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, tokenUrl: e.target.value }))
                  }
                  placeholder="https://auth.example.com/oauth/token"
                />
                <label className="field-label">Client ID</label>
                <input
                  value={form.authConfig.clientId || ""}
                  onChange={(e) => setCfg("clientId", e.target.value)}
                />
                <label className="field-label">{secretLabel} (client secret)</label>
                <input
                  type="password"
                  value={form.clientSecret}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, clientSecret: e.target.value }))
                  }
                />
                <label className="field-label">Scopes (space-separated)</label>
                <input
                  value={form.scopes}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, scopes: e.target.value }))
                  }
                  placeholder="read write"
                />
              </>
            )}

            {error && <div className="form-error">{error}</div>}

            <div className="form-actions">
              <button className="primary" onClick={save}>
                Save
              </button>
              <button onClick={cancel}>Cancel</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
