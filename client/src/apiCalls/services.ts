import makeApiRequest, { qs } from './makeApiRequest';
import { API_ENDPOINTS } from '@constants/apiEndpoints';
import type {
  ChatSessionDto,
  ChatMessageDto,
  UpdateSessionRequest,
} from '@interfaces/chat.interface';
import type {
  AssistantDto,
  BuiltinToolDto,
  CreateAssistantRequest,
  UpdateAssistantRequest,
} from '@interfaces/assistant.interface';
import type {
  AgentToolDto,
  CreateToolRequest,
  UpdateToolRequest,
  TestToolRequest,
  ImportToolsRequest,
  ToolImportKind,
} from '@interfaces/tool.interface';
import type {
  ToolAuthProfileDto,
  CreateAuthProfileRequest,
  UpdateAuthProfileRequest,
} from '@interfaces/auth.interface';
import type {
  SkillDto,
  UpdateSkillRequest,
} from '@interfaces/skill.interface';
import type {
  DocumentDto,
  UpdateDocumentRequest,
} from '@interfaces/document.interface';
import type {
  ResponseStyleDto,
  CreateStyleRequest,
  UpdateStyleRequest,
} from '@interfaces/style.interface';
import type {
  McpServerDto,
  McpServerToolDto,
  CreateMcpServerRequest,
  UpdateMcpServerRequest,
  UpdateMcpToolRequest,
} from '@interfaces/mcp.interface';

const E = API_ENDPOINTS;

export const sessionsApi = {
  list: (archived = false) =>
    makeApiRequest<ChatSessionDto[]>({}, E.LIST_SESSIONS, qs({ archived })),
  create: (assistantId?: string) =>
    makeApiRequest<ChatSessionDto>(
      {},
      E.CREATE_SESSION,
      qs({ assistantId })
    ),
  messages: (id: string) =>
    makeApiRequest<ChatMessageDto[]>({}, E.GET_SESSION_MESSAGES, id),
  update: (id: string, patch: UpdateSessionRequest) =>
    makeApiRequest<ChatSessionDto>(patch, E.UPDATE_SESSION, id),
  delete: (id: string) =>
    makeApiRequest<void>({}, E.DELETE_SESSION, id),
  truncate: (id: string, messageIndex: number) =>
    makeApiRequest<void>(
      {},
      E.TRUNCATE_SESSION,
      `${id}/truncate${qs({ messageIndex })}`
    ),
  setStyle: (id: string, styleId: string) =>
    makeApiRequest<ChatSessionDto>(
      { styleId: styleId || '' },
      E.UPDATE_SESSION,
      id
    ),
};

export const assistantsApi = {
  list: () => makeApiRequest<AssistantDto[]>({}, E.LIST_ASSISTANTS),
  get: (id: string) => makeApiRequest<AssistantDto>({}, E.GET_ASSISTANT, id),
  create: (body: CreateAssistantRequest) =>
    makeApiRequest<AssistantDto>(body, E.CREATE_ASSISTANT),
  update: (id: string, body: UpdateAssistantRequest) =>
    makeApiRequest<AssistantDto>(body, E.UPDATE_ASSISTANT, id),
  delete: (id: string) =>
    makeApiRequest<void>({}, E.DELETE_ASSISTANT, id),
  builtinTools: () =>
    makeApiRequest<BuiltinToolDto[]>({}, E.LIST_BUILTIN_TOOLS),
};

export const toolsApi = {
  list: (assistantId: string) =>
    makeApiRequest<AgentToolDto[]>({}, E.LIST_TOOLS, qs({ assistantId })),
  get: (id: string) => makeApiRequest<AgentToolDto>({}, E.GET_TOOL, id),
  create: (assistantId: string, body: CreateToolRequest) =>
    makeApiRequest<AgentToolDto>(body, E.CREATE_TOOL, qs({ assistantId })),
  update: (id: string, body: UpdateToolRequest) =>
    makeApiRequest<AgentToolDto>(body, E.UPDATE_TOOL, id),
  delete: (id: string) =>
    makeApiRequest<void>({}, E.DELETE_TOOL, id),
  test: (id: string, body: TestToolRequest) =>
    makeApiRequest<unknown>(body, E.TEST_TOOL, id),
  import: (
    kind: ToolImportKind,
    assistantId: string,
    body: ImportToolsRequest
  ) =>
    makeApiRequest<AgentToolDto[]>(
      body,
      E.IMPORT_TOOLS,
      `${kind}${qs({ assistantId })}`
    ),
};

export const authProfilesApi = {
  list: (assistantId: string) =>
    makeApiRequest<ToolAuthProfileDto[]>(
      {},
      E.LIST_AUTH_PROFILES,
      qs({ assistantId })
    ),
  get: (id: string) =>
    makeApiRequest<ToolAuthProfileDto>({}, E.GET_AUTH_PROFILE, id),
  create: (assistantId: string, body: CreateAuthProfileRequest) =>
    makeApiRequest<ToolAuthProfileDto>(
      body,
      E.CREATE_AUTH_PROFILE,
      qs({ assistantId })
    ),
  update: (id: string, body: UpdateAuthProfileRequest) =>
    makeApiRequest<ToolAuthProfileDto>(body, E.UPDATE_AUTH_PROFILE, id),
  delete: (id: string) =>
    makeApiRequest<void>({}, E.DELETE_AUTH_PROFILE, id),
};

export const skillsApi = {
  list: (assistantId: string) =>
    makeApiRequest<SkillDto[]>({}, E.LIST_SKILLS, qs({ assistantId })),
  upload: (assistantId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return makeApiRequest<SkillDto>(
      fd,
      E.UPLOAD_SKILL,
      qs({ assistantId })
    );
  },
  updateMeta: (id: string, body: UpdateSkillRequest) =>
    makeApiRequest<SkillDto>(body, E.UPDATE_SKILL_META, id),
  replaceFile: (id: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return makeApiRequest<SkillDto>(fd, E.REPLACE_SKILL_FILE, id);
  },
  delete: (id: string) =>
    makeApiRequest<void>({}, E.DELETE_SKILL, id),
};

export const documentsApi = {
  list: (assistantId: string) =>
    makeApiRequest<DocumentDto[]>({}, E.LIST_DOCUMENTS, qs({ assistantId })),
  upload: (assistantId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    return makeApiRequest<DocumentDto>(
      fd,
      E.UPLOAD_DOCUMENT,
      qs({ assistantId })
    );
  },
  update: (id: string, body: UpdateDocumentRequest) =>
    makeApiRequest<DocumentDto>(body, E.UPDATE_DOCUMENT, id),
  delete: (id: string) =>
    makeApiRequest<void>({}, E.DELETE_DOCUMENT, id),
};

export const stylesApi = {
  list: (assistantId: string) =>
    makeApiRequest<ResponseStyleDto[]>({}, E.LIST_STYLES, qs({ assistantId })),
  get: (id: string) =>
    makeApiRequest<ResponseStyleDto>({}, E.GET_STYLE, id),
  create: (assistantId: string, body: CreateStyleRequest) =>
    makeApiRequest<ResponseStyleDto>(body, E.CREATE_STYLE, qs({ assistantId })),
  update: (id: string, body: UpdateStyleRequest) =>
    makeApiRequest<ResponseStyleDto>(body, E.UPDATE_STYLE, id),
  delete: (id: string) =>
    makeApiRequest<void>({}, E.DELETE_STYLE, id),
};

export const mcpApi = {
  list: (assistantId: string) =>
    makeApiRequest<McpServerDto[]>(
      {},
      E.LIST_MCP_SERVERS,
      qs({ assistantId })
    ),
  get: (id: string) =>
    makeApiRequest<McpServerDto>({}, E.GET_MCP_SERVER, id),
  create: (assistantId: string, body: CreateMcpServerRequest) =>
    makeApiRequest<McpServerDto>(
      body,
      E.CREATE_MCP_SERVER,
      qs({ assistantId })
    ),
  update: (id: string, body: UpdateMcpServerRequest) =>
    makeApiRequest<McpServerDto>(body, E.UPDATE_MCP_SERVER, id),
  delete: (id: string) =>
    makeApiRequest<void>({}, E.DELETE_MCP_SERVER, id),
  discover: (id: string) =>
    makeApiRequest<McpServerDto>({}, E.DISCOVER_MCP_SERVER, id),
  tools: (id: string) =>
    makeApiRequest<McpServerToolDto[]>({}, E.LIST_MCP_TOOLS, id),
  setToolEnabled: (id: string, toolId: string, body: UpdateMcpToolRequest) =>
    makeApiRequest<McpServerToolDto>(
      body,
      E.UPDATE_MCP_TOOL,
      `${id}/tools/${toolId}`
    ),
};
