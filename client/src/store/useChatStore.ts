import { create } from 'zustand';
import { sessionsApi, assistantsApi, stylesApi } from '@apiCalls/services';
import { openChatStream } from '@apiCalls/chatStream';
import type {
  ChatSessionDto,
  UiChatMessage,
  UiToolCall,
} from '@interfaces/chat.interface';
import type { AssistantDto } from '@interfaces/assistant.interface';
import type { ResponseStyleDto } from '@interfaces/style.interface';

interface ChatStoreState {
  // Session list state
  sessions: ChatSessionDto[];
  showArchived: boolean;
  currentId: string | null;

  // Assistant state
  assistants: AssistantDto[];
  selectedAssistantId: string;

  // Response styles
  styles: ResponseStyleDto[];
  /** Style to apply to the *next* new chat. Overridden per-session once a
   *  chat exists (sessions store their own styleId). */
  selectedStyleId: string;

  // Active conversation
  messages: UiChatMessage[];
  streaming: boolean;
  messagesLoading: boolean;
  sessionsLoading: boolean;

  // ---- actions ----
  refreshSessions: (archived?: boolean) => Promise<void>;
  refreshAssistants: () => Promise<void>;
  refreshStyles: (assistantId: string) => Promise<void>;
  setShowArchived: (archived: boolean) => void;
  setSelectedAssistantId: (id: string) => void;
  setSelectedStyleId: (id: string) => void;

  openSession: (id: string) => Promise<void>;
  newChat: () => Promise<void>;
  clearSelection: () => void;

  renameSession: (id: string, title: string) => Promise<void>;
  toggleArchive: (id: string, archived: boolean) => Promise<void>;
  deleteSession: (id: string) => Promise<void>;
  setSessionStyle: (id: string, styleId: string) => Promise<void>;

  send: (text: string) => Promise<void>;
  resendFromUser: (userIndex: number, text: string) => Promise<void>;

  // Internal: shared by send / resendFromUser
  _runTurn: (sessionId: string, text: string) => void;
  _closeStream: () => void;
}

let activeStreamClose: (() => void) | null = null;
let sessionLoadGeneration = 0;

const toUiMessage = (m: {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tools?: { id: string; name: string; input: string; output: string; error: boolean }[];
}): UiChatMessage => ({
  role: m.role,
  content: m.content,
  tools: (m.tools || []).map<UiToolCall>((t) => ({
    id: t.id,
    name: t.name,
    input: t.input,
    output: t.output,
    error: t.error,
    running: false,
  })),
});

export const useChatStore = create<ChatStoreState>((set, get) => ({
  sessions: [],
  showArchived: false,
  currentId: null,
  assistants: [],
  selectedAssistantId: '',
  styles: [],
  selectedStyleId: '',
  messages: [],
  streaming: false,
  messagesLoading: false,
  sessionsLoading: false,

  refreshSessions: async (archived) => {
    const isArchived = archived ?? get().showArchived;
    set({ sessionsLoading: true });
    try {
      const sessions = await sessionsApi.list(isArchived);
      set({ sessions });
    } finally {
      set({ sessionsLoading: false });
    }
  },

  refreshAssistants: async () => {
    const assistants = await assistantsApi.list();
    set((state) => ({
      assistants,
      selectedAssistantId:
        state.selectedAssistantId &&
        assistants.some((a) => a.id === state.selectedAssistantId)
          ? state.selectedAssistantId
          : assistants[0]?.id || '',
    }));
  },

  refreshStyles: async (assistantId) => {
    if (!assistantId) {
      set({ styles: [] });
      return;
    }
    const styles = await stylesApi.list(assistantId);
    set({ styles });
  },

  setShowArchived: (archived) => {
    set({ showArchived: archived });
    void get().refreshSessions(archived);
  },

  setSelectedAssistantId: (id) => set({ selectedAssistantId: id }),

  setSelectedStyleId: (id) => set({ selectedStyleId: id }),

  openSession: async (id) => {
    get()._closeStream();
    const gen = ++sessionLoadGeneration;
    set({
      currentId: id,
      messages: [],
      messagesLoading: true,
      streaming: false,
    });
    try {
      const msgs = await sessionsApi.messages(id);
      if (gen !== sessionLoadGeneration) return;
      set({ messages: msgs.map(toUiMessage), messagesLoading: false });
    } catch {
      if (gen !== sessionLoadGeneration) return;
      set({ messages: [], messagesLoading: false });
    }
  },

  // "+ New chat" is purely a local "draft" reset — it deliberately does NOT
  // hit the backend. A real ChatSession is created lazily by `send()` when
  // the user actually sends their first message. This avoids the bug where
  // every click on the button spawned an empty "New chat" row.
  newChat: async () => {
    get()._closeStream();
    set({
      currentId: null,
      messages: [],
      streaming: false,
      messagesLoading: false,
      showArchived: false,
    });
  },

  clearSelection: () =>
    set({ currentId: null, messages: [], messagesLoading: false }),

  renameSession: async (id, title) => {
    if (!title.trim()) return;
    await sessionsApi.update(id, { title: title.trim() });
    await get().refreshSessions();
  },

  toggleArchive: async (id, archived) => {
    await sessionsApi.update(id, { archived });
    if (get().currentId === id) {
      set({ currentId: null, messages: [], messagesLoading: false });
    }
    await get().refreshSessions();
  },

  deleteSession: async (id) => {
    await sessionsApi.delete(id);
    if (get().currentId === id) {
      set({ currentId: null, messages: [], messagesLoading: false });
    }
    await get().refreshSessions();
  },

  setSessionStyle: async (id, styleId) => {
    const updated = await sessionsApi.setStyle(id, styleId);
    set((state) => ({
      sessions: state.sessions.map((s) =>
        s.id === id ? { ...s, styleId: updated.styleId } : s
      ),
    }));
  },

  send: async (text) => {
    const trimmed = text.trim();
    if (!trimmed || get().streaming) return;

    let sid = get().currentId;
    if (!sid) {
      let s = await sessionsApi.create(
        get().selectedAssistantId || undefined
      );
      const preStyleId = get().selectedStyleId;
      if (preStyleId) {
        try {
          s = await sessionsApi.setStyle(s.id, preStyleId);
        } catch (err) {
          console.error('Failed to apply preselected style', err);
        }
      }
      sid = s.id;
      set((state) => ({ sessions: [s, ...state.sessions], currentId: sid }));
    }
    get()._runTurn(sid, trimmed);
  },

  resendFromUser: async (userIndex, text) => {
    const trimmed = text.trim();
    const sid = get().currentId;
    if (get().streaming || !sid || userIndex < 0 || !trimmed) return;
    try {
      await sessionsApi.truncate(sid, userIndex);
    } catch (err) {
      console.error(err);
      return;
    }
    set((state) => ({ messages: state.messages.slice(0, userIndex) }));
    get()._runTurn(sid, trimmed);
  },

  _closeStream: () => {
    activeStreamClose?.();
    activeStreamClose = null;
  },

  _runTurn: (sessionId, text) => {
    set((state) => ({
      messages: [
        ...state.messages,
        { role: 'user', content: text, tools: [] },
        { role: 'assistant', content: '', tools: [] },
      ],
      streaming: true,
    }));

    const styleId =
      get().sessions.find((s) => s.id === sessionId)?.styleId || undefined;

    const updateLast = (
      fn: (msg: UiChatMessage) => UiChatMessage
    ) =>
      set((state) => {
        const next = [...state.messages];
        next[next.length - 1] = fn(next[next.length - 1]);
        return { messages: next };
      });

    const handle = openChatStream(
      { sessionId, message: text, styleId: styleId ?? undefined },
      {
        onMessage: (e) => {
          updateLast((last) => ({ ...last, content: last.content + e.text }));
        },
        onTool: (t) => {
          updateLast((last) => ({
            ...last,
            tools: [
              ...last.tools,
              {
                id: t.id,
                name: t.name,
                input: t.input,
                output: null,
                running: true,
              },
            ],
          }));
        },
        onToolResult: (r) => {
          updateLast((last) => ({
            ...last,
            tools: last.tools.map((t) =>
              t.id === r.id
                ? { ...t, output: r.output, error: r.error, running: false }
                : t
            ),
          }));
        },
        onError: (err) => {
          if (err?.text) {
            updateLast((last) => ({
              ...last,
              content: last.content + `\n\n_Error: ${err.text}_`,
            }));
          }
          set({ streaming: false });
          activeStreamClose = null;
          void get().refreshSessions();
        },
        onDone: () => {
          set({ streaming: false });
          activeStreamClose = null;
          void get().refreshSessions();
        },
      }
    );

    activeStreamClose = handle.close;
  },
}));
