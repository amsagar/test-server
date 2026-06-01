import type ApiRequestConfig from '@interfaces/apiEndpoints.interface';

/**
 * All paths are routed through the webpack devServer proxy (`/api -> :8080`)
 * so the client only ever knows about relative URLs. The Spring Boot
 * controllers all mount under /api (see ApiConstants.java in the backend).
 */
export const BASE_PATH = '/api';

export const DEFAULT_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};

export const JSON_HEADERS: Record<string, string> = {
  'Content-Type': 'application/json',
};

type EndpointMap = Record<string, ApiRequestConfig>;

export const API_ENDPOINTS = {
  // ---------- chat sessions ----------
  LIST_SESSIONS: {
    url: (query: string) => `${BASE_PATH}/sessions${query}`,
    method: 'GET',
  },
  CREATE_SESSION: {
    url: (query: string) => `${BASE_PATH}/sessions${query}`,
    method: 'POST',
  },
  GET_SESSION_MESSAGES: {
    url: (id: string) => `${BASE_PATH}/sessions/${id}/messages`,
    method: 'GET',
  },
  UPDATE_SESSION: {
    url: (id: string) => `${BASE_PATH}/sessions/${id}`,
    method: 'PATCH',
  },
  DELETE_SESSION: {
    url: (id: string) => `${BASE_PATH}/sessions/${id}`,
    method: 'DELETE',
  },
  TRUNCATE_SESSION: {
    url: (idAndQuery: string) =>
      `${BASE_PATH}/sessions/${idAndQuery}`,
    method: 'POST',
  },

  // ---------- chat stream (SSE — used separately by chatStream.ts) ----------
  CHAT_STREAM: {
    url: (query: string) => `${BASE_PATH}/chat/stream${query}`,
    method: 'GET',
  },

  // ---------- assistants ----------
  LIST_ASSISTANTS: {
    url: () => `${BASE_PATH}/assistants`,
    method: 'GET',
  },
  GET_ASSISTANT: {
    url: (id: string) => `${BASE_PATH}/assistants/${id}`,
    method: 'GET',
  },
  CREATE_ASSISTANT: {
    url: () => `${BASE_PATH}/assistants`,
    method: 'POST',
  },
  UPDATE_ASSISTANT: {
    url: (id: string) => `${BASE_PATH}/assistants/${id}`,
    method: 'PATCH',
  },
  DELETE_ASSISTANT: {
    url: (id: string) => `${BASE_PATH}/assistants/${id}`,
    method: 'DELETE',
  },
  LIST_BUILTIN_TOOLS: {
    url: () => `${BASE_PATH}/assistants/builtin-tools`,
    method: 'GET',
  },

  // ---------- tools ----------
  LIST_TOOLS: {
    url: (query: string) => `${BASE_PATH}/tools${query}`,
    method: 'GET',
  },
  GET_TOOL: {
    url: (id: string) => `${BASE_PATH}/tools/${id}`,
    method: 'GET',
  },
  CREATE_TOOL: {
    url: (query: string) => `${BASE_PATH}/tools${query}`,
    method: 'POST',
  },
  UPDATE_TOOL: {
    url: (id: string) => `${BASE_PATH}/tools/${id}`,
    method: 'PATCH',
  },
  DELETE_TOOL: {
    url: (id: string) => `${BASE_PATH}/tools/${id}`,
    method: 'DELETE',
  },
  TEST_TOOL: {
    url: (id: string) => `${BASE_PATH}/tools/${id}/test`,
    method: 'POST',
  },
  IMPORT_TOOLS: {
    url: (kindAndQuery: string) =>
      `${BASE_PATH}/tools/import/${kindAndQuery}`,
    method: 'POST',
  },

  // ---------- tool auth profiles ----------
  LIST_AUTH_PROFILES: {
    url: (query: string) => `${BASE_PATH}/tool-auth${query}`,
    method: 'GET',
  },
  GET_AUTH_PROFILE: {
    url: (id: string) => `${BASE_PATH}/tool-auth/${id}`,
    method: 'GET',
  },
  CREATE_AUTH_PROFILE: {
    url: (query: string) => `${BASE_PATH}/tool-auth${query}`,
    method: 'POST',
  },
  UPDATE_AUTH_PROFILE: {
    url: (id: string) => `${BASE_PATH}/tool-auth/${id}`,
    method: 'PATCH',
  },
  DELETE_AUTH_PROFILE: {
    url: (id: string) => `${BASE_PATH}/tool-auth/${id}`,
    method: 'DELETE',
  },

  // ---------- skills ----------
  LIST_SKILLS: {
    url: (query: string) => `${BASE_PATH}/skills${query}`,
    method: 'GET',
  },
  GET_SKILL: {
    url: (id: string) => `${BASE_PATH}/skills/${id}`,
    method: 'GET',
  },
  UPLOAD_SKILL: {
    url: (query: string) => `${BASE_PATH}/skills${query}`,
    method: 'POST',
  },
  UPDATE_SKILL_META: {
    url: (id: string) => `${BASE_PATH}/skills/${id}`,
    method: 'PATCH',
  },
  REPLACE_SKILL_FILE: {
    url: (id: string) => `${BASE_PATH}/skills/${id}`,
    method: 'PATCH',
  },
  DELETE_SKILL: {
    url: (id: string) => `${BASE_PATH}/skills/${id}`,
    method: 'DELETE',
  },

  // ---------- documents ----------
  LIST_DOCUMENTS: {
    url: (query: string) => `${BASE_PATH}/documents${query}`,
    method: 'GET',
  },
  GET_DOCUMENT: {
    url: (id: string) => `${BASE_PATH}/documents/${id}`,
    method: 'GET',
  },
  UPLOAD_DOCUMENT: {
    url: (query: string) => `${BASE_PATH}/documents${query}`,
    method: 'POST',
  },
  UPDATE_DOCUMENT: {
    url: (id: string) => `${BASE_PATH}/documents/${id}`,
    method: 'PATCH',
  },
  DELETE_DOCUMENT: {
    url: (id: string) => `${BASE_PATH}/documents/${id}`,
    method: 'DELETE',
  },

  // ---------- response styles ----------
  LIST_STYLES: {
    url: (query: string) => `${BASE_PATH}/response-styles${query}`,
    method: 'GET',
  },
  GET_STYLE: {
    url: (id: string) => `${BASE_PATH}/response-styles/${id}`,
    method: 'GET',
  },
  CREATE_STYLE: {
    url: (query: string) => `${BASE_PATH}/response-styles${query}`,
    method: 'POST',
  },
  UPDATE_STYLE: {
    url: (id: string) => `${BASE_PATH}/response-styles/${id}`,
    method: 'PATCH',
  },
  DELETE_STYLE: {
    url: (id: string) => `${BASE_PATH}/response-styles/${id}`,
    method: 'DELETE',
  },

  // ---------- MCP servers ----------
  LIST_MCP_SERVERS: {
    url: (query: string) => `${BASE_PATH}/mcp-servers${query}`,
    method: 'GET',
  },
  GET_MCP_SERVER: {
    url: (id: string) => `${BASE_PATH}/mcp-servers/${id}`,
    method: 'GET',
  },
  CREATE_MCP_SERVER: {
    url: (query: string) => `${BASE_PATH}/mcp-servers${query}`,
    method: 'POST',
  },
  UPDATE_MCP_SERVER: {
    url: (id: string) => `${BASE_PATH}/mcp-servers/${id}`,
    method: 'PATCH',
  },
  DELETE_MCP_SERVER: {
    url: (id: string) => `${BASE_PATH}/mcp-servers/${id}`,
    method: 'DELETE',
  },
  DISCOVER_MCP_SERVER: {
    url: (id: string) => `${BASE_PATH}/mcp-servers/${id}/discover`,
    method: 'POST',
  },
  LIST_MCP_TOOLS: {
    url: (id: string) => `${BASE_PATH}/mcp-servers/${id}/tools`,
    method: 'GET',
  },
  UPDATE_MCP_TOOL: {
    url: (idAndToolId: string) =>
      `${BASE_PATH}/mcp-servers/${idAndToolId}`,
    method: 'PATCH',
  },
} as const satisfies EndpointMap;
