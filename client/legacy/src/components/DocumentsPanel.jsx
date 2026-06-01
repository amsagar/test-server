import { useEffect, useRef, useState } from "react";
import { api } from "../api";

export default function DocumentsPanel() {
  const [assistants, setAssistants] = useState([]);
  const [assistantId, setAssistantId] = useState("");
  const [documents, setDocuments] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState({ name: "", enabled: true });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const uploadRef = useRef(null);

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
    if (assistantId) loadDocuments(assistantId);
    else setDocuments([]);
    cancel();
  }, [assistantId]);

  async function loadDocuments(id) {
    try {
      setDocuments(await api.listDocuments(id));
    } catch (e) {
      setError(e.message);
    }
  }

  function startEdit(d) {
    setEditingId(d.id);
    setForm({ name: d.name || "", enabled: d.enabled });
    setError("");
  }

  function cancel() {
    setEditingId(null);
    setForm({ name: "", enabled: true });
    setError("");
  }

  async function onUpload(e) {
    const file = e.target.files?.[0];
    if (uploadRef.current) uploadRef.current.value = "";
    if (!file || !assistantId) return;
    setBusy(true);
    setError("");
    try {
      await api.uploadDocument(assistantId, file);
      await loadDocuments(assistantId);
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
      await api.updateDocument(editingId, {
        name: form.name.trim(),
        enabled: form.enabled,
      });
      await loadDocuments(assistantId);
      cancel();
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }

  async function toggleEnabled(d) {
    try {
      await api.updateDocument(d.id, { enabled: !d.enabled });
      await loadDocuments(assistantId);
    } catch (e) {
      setError(e.message);
    }
  }

  async function remove(d) {
    if (!window.confirm(`Delete document "${d.name}"?`)) return;
    try {
      await api.deleteDocument(d.id);
      if (editingId === d.id) cancel();
      await loadDocuments(assistantId);
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
          Upload document
        </label>
        <input
          ref={uploadRef}
          type="file"
          accept=".txt,.md,.pdf,.docx,.doc,.html,.csv"
          disabled={!assistantId || busy}
          onChange={onUpload}
        />
        <div className="muted small">
          {busy ? "Indexing…" : "A .txt, .md, .pdf, or .docx file. It is chunked and embedded for retrieval."}
        </div>

        <div style={{ marginTop: 12 }}>
          {documents.length === 0 ? (
            <div className="muted small">No documents for this assistant yet.</div>
          ) : (
            documents.map((d) => (
              <div
                key={d.id}
                className={`assistant-row ${editingId === d.id ? "selected" : ""}`}
                onClick={() => startEdit(d)}
              >
                <div className="assistant-row-main">
                  <div className="assistant-row-name">{d.name}</div>
                  <div className="muted small">
                    {d.chunkCount} chunks · {d.enabled ? "enabled" : "disabled"}
                  </div>
                </div>
                <button
                  className="icon-btn"
                  title={d.enabled ? "Disable" : "Enable"}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleEnabled(d);
                  }}
                >
                  {d.enabled ? "✅" : "⬜"}
                </button>
                <button
                  className="icon-btn"
                  title="Delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(d);
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
            Select a document to rename or toggle, or upload a new one.
          </div>
        ) : (
          <>
            <label className="field-label">Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="Document name"
            />

            <label className="tool-check" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={form.enabled}
                onChange={(e) =>
                  setForm((f) => ({ ...f, enabled: e.target.checked }))
                }
              />
              Enabled (included in retrieval)
            </label>

            <div className="muted small" style={{ marginTop: 8 }}>
              To replace the content, delete this document and upload the new file.
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
