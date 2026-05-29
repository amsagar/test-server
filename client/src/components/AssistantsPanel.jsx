import { useEffect, useState } from "react";
import { api } from "../api";

const EMPTY = { name: "", systemPrompt: "", builtinTools: [], toolIds: [] };

export default function AssistantsPanel({ onChanged }) {
  const [assistants, setAssistants] = useState([]);
  const [builtins, setBuiltins] = useState([]);
  const [httpTools, setHttpTools] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");

  useEffect(() => {
    load();
    api.builtinTools().then(setBuiltins).catch(() => setBuiltins([]));
    api.listTools().then(setHttpTools).catch(() => setHttpTools([]));
  }, []);

  async function load() {
    try {
      setAssistants(await api.listAssistants());
    } catch (e) {
      setError(e.message);
    }
  }

  function startNew() {
    setEditingId("new");
    setForm(EMPTY);
    setError("");
  }

  function startEdit(a) {
    setEditingId(a.id);
    setForm({
      name: a.name,
      systemPrompt: a.systemPrompt,
      builtinTools: a.builtinTools || [],
      toolIds: a.toolIds || [],
    });
    setError("");
  }

  function cancel() {
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  function toggleTool(key) {
    setForm((f) => ({
      ...f,
      builtinTools: f.builtinTools.includes(key)
        ? f.builtinTools.filter((k) => k !== key)
        : [...f.builtinTools, key],
    }));
  }

  function toggleHttpTool(id) {
    setForm((f) => ({
      ...f,
      toolIds: f.toolIds.includes(id)
        ? f.toolIds.filter((t) => t !== id)
        : [...f.toolIds, id],
    }));
  }

  async function save() {
    if (!form.name.trim() || !form.systemPrompt.trim()) {
      setError("Name and system prompt are required.");
      return;
    }
    const body = {
      name: form.name.trim(),
      systemPrompt: form.systemPrompt,
      builtinTools: form.builtinTools,
      toolIds: form.toolIds,
    };
    try {
      if (editingId === "new") {
        await api.createAssistant(body);
      } else {
        await api.updateAssistant(editingId, body);
      }
      cancel();
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(a) {
    if (!window.confirm(`Delete assistant "${a.name}"?`)) return;
    try {
      await api.deleteAssistant(a.id);
      if (editingId === a.id) cancel();
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="assistants-panel">
      <div className="assistants-list">
        <button className="new-chat" onClick={startNew}>
          + New assistant
        </button>
        {assistants.map((a) => (
          <div
            key={a.id}
            className={`assistant-row ${editingId === a.id ? "selected" : ""}`}
            onClick={() => startEdit(a)}
          >
            <div className="assistant-row-main">
              <div className="assistant-row-name">{a.name}</div>
              <div className="muted small">
                {(a.builtinTools || []).length} tools
              </div>
            </div>
            <button
              className="icon-btn"
              title="Delete"
              onClick={(e) => {
                e.stopPropagation();
                remove(a);
              }}
            >
              🗑
            </button>
          </div>
        ))}
      </div>

      <div className="assistant-form">
        {editingId == null ? (
          <div className="muted">Select an assistant to edit, or create a new one.</div>
        ) : (
          <>
            <label className="field-label">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. SQL Helper"
            />

            <label className="field-label">System prompt</label>
            <textarea
              className="prompt-area"
              value={form.systemPrompt}
              onChange={(e) =>
                setForm((f) => ({ ...f, systemPrompt: e.target.value }))
              }
              placeholder="Describe how this assistant should behave."
              rows={10}
            />

            <label className="field-label">Built-in tools</label>
            <div className="tool-checks">
              {builtins.map((t) => (
                <label key={t.key} className="tool-check">
                  <input
                    type="checkbox"
                    checked={form.builtinTools.includes(t.key)}
                    onChange={() => toggleTool(t.key)}
                  />
                  {t.label}
                </label>
              ))}
            </div>

            <label className="field-label">HTTP tools</label>
            {httpTools.length === 0 ? (
              <div className="muted small">
                No HTTP tools yet — add them from the Tools manager.
              </div>
            ) : (
              <div className="tool-checks">
                {httpTools.map((t) => (
                  <label key={t.id} className="tool-check">
                    <input
                      type="checkbox"
                      checked={form.toolIds.includes(t.id)}
                      onChange={() => toggleHttpTool(t.id)}
                    />
                    {t.name}
                  </label>
                ))}
              </div>
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
