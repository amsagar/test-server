import { qs } from './makeApiRequest';
import { BASE_PATH } from '@constants/apiEndpoints';
import type {
  SseMessageEvent,
  SseToolEvent,
  SseToolResultEvent,
  SseErrorEvent,
} from '@interfaces/chat.interface';

export interface ChatStreamHandlers {
  onMessage?: (e: SseMessageEvent) => void;
  onTool?: (e: SseToolEvent) => void;
  onToolResult?: (e: SseToolResultEvent) => void;
  onError?: (e: SseErrorEvent | null) => void;
  onDone?: () => void;
}

export interface ChatStreamHandle {
  close: () => void;
}

export interface ChatStreamParams {
  sessionId: string;
  message: string;
  styleId?: string;
}

/**
 * Open an SSE connection to /api/chat/stream. The backend emits five named
 * events: `message` (token chunks), `tool` (tool invocation), `tool_result`
 * (tool completion), `done` (turn finished), `error` (turn aborted).
 */
export const openChatStream = (
  params: ChatStreamParams,
  handlers: ChatStreamHandlers
): ChatStreamHandle => {
  const query = qs({
    sessionId: params.sessionId,
    message: params.message,
    styleId: params.styleId || undefined,
  });
  const es = new EventSource(`${BASE_PATH}/chat/stream${query}`);

  es.addEventListener('message', (e) => {
    try {
      handlers.onMessage?.(JSON.parse((e as MessageEvent).data));
    } catch (err) {
      console.error('chatStream onMessage parse', err);
    }
  });

  es.addEventListener('tool', (e) => {
    try {
      handlers.onTool?.(JSON.parse((e as MessageEvent).data));
    } catch (err) {
      console.error('chatStream onTool parse', err);
    }
  });

  es.addEventListener('tool_result', (e) => {
    try {
      handlers.onToolResult?.(JSON.parse((e as MessageEvent).data));
    } catch (err) {
      console.error('chatStream onToolResult parse', err);
    }
  });

  es.addEventListener('done', () => {
    handlers.onDone?.();
    es.close();
  });

  es.addEventListener('error', (e) => {
    let payload: SseErrorEvent | null = null;
    const data = (e as MessageEvent).data;
    if (data) {
      try {
        payload = JSON.parse(data);
      } catch {
        payload = { text: String(data) };
      }
    }
    handlers.onError?.(payload);
    es.close();
  });

  return { close: () => es.close() };
};
