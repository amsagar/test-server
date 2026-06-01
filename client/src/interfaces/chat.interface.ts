export interface ChatSessionDto {
  id: string;
  title: string;
  archived: boolean;
  assistantId?: string | null;
  styleId?: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ToolCallDto {
  id: string;
  name: string;
  input: string;
  output: string;
  error: boolean;
}

export interface ChatMessageDto {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tools?: ToolCallDto[];
}

export interface UpdateSessionRequest {
  title?: string;
  archived?: boolean;
  styleId?: string;
}

export interface UiToolCall {
  id: string;
  name: string;
  input: string;
  output: string | null;
  error?: boolean;
  running: boolean;
}

export interface UiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  tools: UiToolCall[];
}

export type SseEventName = 'message' | 'tool' | 'tool_result' | 'done' | 'error';

export interface SseMessageEvent {
  text: string;
}

export interface SseToolEvent {
  id: string;
  name: string;
  input: string;
}

export interface SseToolResultEvent {
  id: string;
  output: string | null;
  error?: boolean;
}

export interface SseErrorEvent {
  text: string;
}
