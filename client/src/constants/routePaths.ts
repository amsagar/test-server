export const ROUTE_PATHS = {
  CHAT: '/',
  SETTINGS: '/settings',
  SETTINGS_SECTION: '/settings/:section',
  NOT_FOUND: '*',
} as const;

export const SETTINGS_SECTIONS = {
  ASSISTANTS: 'assistants',
  TOOLS: 'tools',
  AUTH_PROFILES: 'auth-profiles',
  SKILLS: 'skills',
  DOCUMENTS: 'documents',
  RESPONSE_STYLES: 'response-styles',
  MCP_SERVERS: 'mcp-servers',
} as const;

export type SettingsSection =
  (typeof SETTINGS_SECTIONS)[keyof typeof SETTINGS_SECTIONS];

export const settingsPath = (section: SettingsSection) =>
  `/settings/${section}`;

export type RoutePath = (typeof ROUTE_PATHS)[keyof typeof ROUTE_PATHS];
