import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { api, relativeTime } from "./api";
import Modal from "./components/Modal";
import AssistantsPanel from "./components/AssistantsPanel";
import ToolsPanel from "./components/ToolsPanel";
import AuthProfilesPanel from "./components/AuthProfilesPanel";

export default function App() {
  const [sessions, setSessions] = useState([]);
  const [showArchived, setShowArchived] = useState(false);
  const [currentId, setCurrentId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [renamingId, setRenamingId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [assistants, setAssistants] = useState([]);
  const [selectedAssistantId, setSelectedAssistantId] = useState("");
  const [showAssistants, setShowAssistants] = useState(false);
  const [showTools, setShowTools] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const esRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    refreshSessions(showArchived);
  }, [showArchived]);

  useEffect(() => {
    refreshAssistants();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  useEffect(() => () => esRef.current?.close(), []);

  async function refreshSessions(archived = showArchived) {
    try {
      setSessions(await api.listSessions(archived));
    } catch (e) {
      console.error(e);
    }
  }

  async function refreshAssistants() {
    try {
      const list = await api.listAssistants();
      setAssistants(list);
      setSelectedAssistantId((prev) =>
        prev && list.some((a) => a.id === prev) ? prev : list[0]?.id || ""
      );
    } catch (e) {
      console.error(e);
    }
  }

  function assistantName(id) {
    return assistants.find((a) => a.id === id)?.name || "Assistant";
  }

  async function openSession(id) {
    setCurrentId(id);
    try {
      const msgs = await api.getMessages(id);
      setMessages(msgs.map((m) => ({ role: m.role, content: m.content })));
    } catch (e) {
      setMessages([]);
    }
  }

  async function newChat() {
    const s = await api.createSession(selectedAssistantId || undefined);
    setSessions((prev) => [s, ...prev]);
    setShowArchived(false);
    setCurrentId(s.id);
    setMessages([]);
  }

  async function send() {
    const text = input.trim();
    if (!text || streaming) return;

    let sid = currentId;
    if (!sid) {
      const s = await api.createSession(selectedAssistantId || undefined);
      sid = s.id;
      setSessions((prev) => [s, ...prev]);
      setCurrentId(sid);
    }

    setMessages((m) => [
      ...m,
      { role: "user", content: text },
      { role: "assistant", content: "", tools: [] },
    ]);
    setInput("");
    setStreaming(true);

    const es = new EventSource(
      `/api/chat/stream?sessionId=${encodeURIComponent(
        sid
      )}&message=${encodeURIComponent(text)}`
    );
    esRef.current = es;

    const updateLast = (fn) =>
      setMessages((m) => {
        const next = [...m];
        next[next.length - 1] = fn(next[next.length - 1]);
        return next;
      });

    const append = (chunk) =>
      updateLast((last) => ({ ...last, content: last.content + chunk }));

    const addTool = (t) =>
      updateLast((last) => ({
        ...last,
        tools: [...(last.tools || []), { ...t, output: null, running: true }],
      }));

    const finishTool = (r) =>
      updateLast((last) => ({
        ...last,
        tools: (last.tools || []).map((t) =>
          t.id === r.id
            ? { ...t, output: r.output, error: r.error, running: false }
            : t
        ),
      }));

    es.addEventListener("message", (e) => append(JSON.parse(e.data).text));
    es.addEventListener("tool", (e) => addTool(JSON.parse(e.data)));
    es.addEventListener("tool_result", (e) => finishTool(JSON.parse(e.data)));
    es.addEventListener("error", (e) => {
      if (e.data) append(`\n\n_Error: ${JSON.parse(e.data).text}_`);
      es.close();
      setStreaming(false);
      refreshSessions();
    });
    es.addEventListener("done", () => {
      es.close();
      setStreaming(false);
      refreshSessions();
    });
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  function startRename(s) {
    setRenamingId(s.id);
    setRenameValue(s.title);
  }

  async function commitRename(id) {
    const title = renameValue.trim();
    setRenamingId(null);
    if (title) {
      await api.updateSession(id, { title });
      refreshSessions();
    }
  }

  async function toggleArchive(s) {
    await api.updateSession(s.id, { archived: !s.archived });
    if (s.id === currentId) {
      setCurrentId(null);
      setMessages([]);
    }
    refreshSessions();
  }

  async function deleteSession(s) {
    if (!window.confirm(`Delete "${s.title}"? This can't be undone.`)) return;
    await api.deleteSession(s.id);
    if (s.id === currentId) {
      setCurrentId(null);
      setMessages([]);
    }
    refreshSessions();
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <button className="new-chat" onClick={newChat}>
          + New chat
        </button>

        <div className="assistant-picker">
          <select
            value={selectedAssistantId}
            onChange={(e) => setSelectedAssistantId(e.target.value)}
          >
            {assistants.length === 0 && <option value="">No assistants</option>}
            {assistants.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            className="icon-btn"
            title="Manage assistants"
            onClick={() => setShowAssistants(true)}
          >
            ⚙
          </button>
          <button
            className="icon-btn"
            title="Manage HTTP tools"
            onClick={() => setShowTools(true)}
          >
            🔧
          </button>
          <button
            className="icon-btn"
            title="Manage auth profiles"
            onClick={() => setShowAuth(true)}
          >
            🔑
          </button>
        </div>

        <div className="toggle">
          <button
            className={!showArchived ? "active" : ""}
            onClick={() => setShowArchived(false)}
          >
            Active
          </button>
          <button
            className={showArchived ? "active" : ""}
            onClick={() => setShowArchived(true)}
          >
            Archived
          </button>
        </div>

        <div className="session-list">
          {sessions.length === 0 && (
            <div className="muted small">No {showArchived ? "archived" : "active"} chats</div>
          )}
          {sessions.map((s) => (
            <div
              key={s.id}
              className={`session ${s.id === currentId ? "selected" : ""}`}
              onClick={() => openSession(s.id)}
            >
              {renamingId === s.id ? (
                <input
                  className="rename-input"
                  value={renameValue}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onBlur={() => commitRename(s.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitRename(s.id);
                    if (e.key === "Escape") setRenamingId(null);
                  }}
                />
              ) : (
                <div className="session-main">
                  <div className="session-title">{s.title}</div>
                  <div className="muted small">{relativeTime(s.updatedAt)}</div>
                </div>
              )}
              <div className="session-actions" onClick={(e) => e.stopPropagation()}>
                <button title="Rename" onClick={() => startRename(s)}>
                  ✎
                </button>
                <button
                  title={s.archived ? "Unarchive" : "Archive"}
                  onClick={() => toggleArchive(s)}
                >
                  {s.archived ? "↺" : "⊟"}
                </button>
                <button title="Delete" onClick={() => deleteSession(s)}>
                  🗑
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="chat">
        <header className="header">
          <span>🤖 Coding Agent</span>
          {currentId ? (
            <span className="header-assistant">
              {assistantName(
                sessions.find((s) => s.id === currentId)?.assistantId
              )}
            </span>
          ) : (
            selectedAssistantId && (
              <span className="header-assistant">
                {assistantName(selectedAssistantId)}
              </span>
            )
          )}
        </header>

        <div className="messages" ref={scrollRef}>
          {messages.length === 0 && (
            <div className="empty">
              {currentId
                ? "Send a message to start this chat."
                : 'Ask me anything about your codebase — e.g. "What does the main application class do?"'}
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.role}`}>
              <div className="bubble">
                {m.role === "assistant" ? (
                  <>
                    {(m.tools || []).map((t) => (
                      <ToolCard key={t.id} tool={t} />
                    ))}
                    {m.content ? (
                      <ReactMarkdown>{m.content}</ReactMarkdown>
                    ) : (
                      (m.tools || []).length === 0 && (
                        <span className="typing">…</span>
                      )
                    )}
                  </>
                ) : (
                  m.content
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="composer">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Ask about your codebase…"
            rows={1}
          />
          <button onClick={send} disabled={streaming || !input.trim()}>
            {streaming ? "…" : "Send"}
          </button>
        </div>
      </main>

      {showAssistants && (
        <Modal
          title="Manage assistants"
          wide
          onClose={() => setShowAssistants(false)}
        >
          <AssistantsPanel onChanged={refreshAssistants} />
        </Modal>
      )}

      {showTools && (
        <Modal title="HTTP tools" wide onClose={() => setShowTools(false)}>
          <ToolsPanel />
        </Modal>
      )}

      {showAuth && (
        <Modal title="Auth profiles" wide onClose={() => setShowAuth(false)}>
          <AuthProfilesPanel />
        </Modal>
      )}
    </div>
  );
}

function formatJson(raw) {
  if (raw == null || raw === "") return "";
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

function ToolCard({ tool }) {
  const [open, setOpen] = useState(false);
  const status = tool.running ? "⏳" : tool.error ? "⚠️" : "✓";
  return (
    <div className={`tool-card ${tool.error ? "error" : ""}`}>
      <div className="tool-head" onClick={() => setOpen((o) => !o)}>
        <span className="tool-status">{status}</span>
        <span className="tool-name">{tool.name}</span>
        <span className="tool-caret">{open ? "▾" : "▸"}</span>
      </div>
      {open && (
        <div className="tool-body">
          <div className="tool-label">Input</div>
          <pre className="tool-pre">{formatJson(tool.input)}</pre>
          <div className="tool-label">Output</div>
          <pre className="tool-pre">
            {tool.running ? "Running…" : formatJson(tool.output)}
          </pre>
        </div>
      )}
    </div>
  );
}
