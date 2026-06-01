import { useEffect, useRef, useState } from "react";
import { api } from "../api";

export default function SkillsPanel() {
  const [assistants, setAssistants] = useState([]);
  const [assistantId, setAssistantId] = useState("");
  const [skills, setSkills] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", description: "", enabled: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const uploadRef = useRef(null);
  const replaceRef = useRef(null);

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
    if (assistantId) loadSkills(assistantId);
    else setSkills([]);
    cancel();
  }, [assistantId]);

  async function loadSkills(id) {
    try {
      setSkills(await api.listSkills(id));
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(s) {
    setEditingId(s.id);
    setForm({
      name: s.name || "",
      description: s.description || "",
      enabled: s.enabled,
    });
    setError("");
  }

  function cancel() {
    setEditingId(null);
    setForm({ name: "", description: "", enabled: true });
    setError("");
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (uploadRef.current) uploadRef.current.value = "";
    if (!file || !assistantId) return;
    setBusy(true);
    setError("");
    try {
      await api.uploadSkill(assistantId, file);
      await loadSkills(assistantId);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function onReplaceFile(e) {
    const file = e.target.files?.[0];
    if (replaceRef.current) replaceRef.current.value = "";
    if (!file || !editingId) return;
    setBusy(true);
    setError("");
    try {
      const updated = await api.replaceSkillFile(editingId, file);
      await loadSkills(assistantId);
      startEdit(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function save() {
    if (!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.updateSkill(editingId, {
        name: form.name.trim(),
        description: form.description,
        enabled: form.enabled,
      });
      await loadSkills(assistantId);
      cancel();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(s) {
    try {
      await api.updateSkill(s.id, { enabled: !s.enabled });
      await loadSkills(assistantId);
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(s) {
    if (!window.confirm(`Delete skill "${s.name}"?`)) return;
    try {
      await api.deleteSkill(s.id);
      if (editingId === s.id) cancel();
      await loadSkills(assistantId);
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

        <label className="field-label" style={{ marginTop: 12 }}>
          Upload skill
        </label>
        <input
          ref={uploadRef}
          type="file"
          accept=".md,.zip"
          disabled={!assistantId || busy}
          onChange={onUpload}
        />
        <div className="muted small">A SKILL.md file or a .zip bundle.</div>

        <div style={{ marginTop: 12 }}>
          {skills.length === 0 ? (
            <div className="muted small">No skills for this assistant yet.</div>
          ) : (
            skills.map((s) => (
              <div
                key={s.id}
                className={`assistant-row ${editingId === s.id ? "selected" : ""}`}
                onClick={() => startEdit(s)}
              >
                <div className="assistant-row-main">
                  <div className="assistant-row-name">{s.name}</div>
                  <div className="muted small">
                    {s.enabled ? "enabled" : "disabled"}
                  </div>
                </div>
                <button
                  className="icon-btn"
                  title={s.enabled ? "Disable" : "Enable"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEnabled(s);
                  }}
                >
                  {s.enabled ? "✅" : "⬜"}
                </button>
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
      </div>

      <div className="assistant-form">
        {editingId == null ? (
          <div className="muted">
            Select a skill to edit its metadata, or upload a new one.
          </div>
        ) : (
          <>
            <label className="field-label">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Skill name"
            />

            <label className="field-label">Description</label>
            <textarea
              className="prompt-area"
              value={form.description}
              onChange={(e) =>
                setForm((f) => ({ ...f, description: e.target.value }))
              }
              placeholder="When should the model use this skill?"
              rows={6}
            />

            <label className="tool-check" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, enabled: e.target.checked }))
                }
              />
              Enabled
            </label>

            <label className="field-label" style={{ marginTop: 12 }}>
              Replace content
            </label>
            <input
              ref={replaceRef}
              type="file"
              accept=".md,.zip"
              disabled={busy}
              onChange={onReplaceFile}
            />
            <div className="muted small">
              Re-uploads the SKILL.md / .zip and refreshes metadata from its frontmatter.
            </div>

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

      {error && editingId == null && <div className="form-error">{error}</div>}
    </div>
  );
}
