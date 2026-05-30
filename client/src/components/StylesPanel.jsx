import { useEffect, useState } from "react";
import { api } from "../api";

const EMPTY = { name: "", description: "", instructions: "" };

export default function StylesPanel({ onChanged }) {
  const [styles, setStyles] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      setStyles(await api.listStyles());
    } catch (e) {
      setError(e.message);
    }
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  function startEdit(s) {
    setCreating(false);
    setEditingId(s.id);
    setForm({
      name: s.name || "",
      description: s.description || "",
      instructions: s.instructions || "",
    });
    setError("");
  }

  function cancel() {
    setCreating(false);
    setEditingId(null);
    setForm(EMPTY);
    setError("");
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!form.instructions.trim()) {
      setError("Instructions are required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const body = {
        name: form.name.trim(),
        description: form.description,
        instructions: form.instructions,
      };
      if (editingId) {
        await api.updateStyle(editingId, body);
      } else {
        await api.createStyle(body);
      }
      await load();
      onChanged?.();
      cancel();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(s) {
    if (!window.confirm(`Delete style "${s.name}"?`)) return;
    try {
      await api.deleteStyle(s.id);
      if (editingId === s.id) cancel();
      await load();
      onChanged?.();
    } catch (e) {
      setError(e.message);
    }
  }

  const showForm = creating || editingId != null;

  return (
    <div className="assistants-panel">
      <div className="assistants-list">
        <button className="primary" onClick={startCreate} style={{ marginBottom: 12 }}>
          + New style
        </button>

        {styles.length === 0 ? (
          <div className="muted small">No response styles yet.</div>
        ) : (
          styles.map((s) => (
            <div
              key={s.id}
              className={`assistant-row ${editingId === s.id ? "selected" : ""}`}
              onClick={() => startEdit(s)}
            >
              <div className="assistant-row-main">
                <div className="assistant-row-name">{s.name}</div>
                {s.description && (
                  <div className="muted small">{s.description}</div>
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
          ))
        )}
      </div>

      <div className="assistant-form">
        {!showForm ? (
          <div className="muted">
            Select a style to edit, or create a new one. Styles shape the tone and structure of the
            assistant's replies and can be picked per chat.
          </div>
        ) : (
          <>
            <label className="field-label">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Concise"
            />

            <label className="field-label">Description</label>
            <input
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="Short note shown in the picker"
            />

            <label className="field-label">Instructions</label>
            <textarea
              className="prompt-area"
              value={form.instructions}
              onChange={(e) =>
                setForm((f) => ({ ...f, instructions: e.target.value }))
              }
              placeholder="How should the assistant format and phrase its replies?"
              rows={10}
            />

            {error && <div className="form-error">{error}</div>}

            <div className="form-actions">
              <button className="primary" onClick={save} disabled={busy}>
                Save
              </button>
              <button onClick={cancel} disabled={busy}>
                Cancel
              </button>
            </div>
          </>
        )}
      </div>

      {error && !showForm && <div className="form-error">{error}</div>}
    </div>
  );
}
