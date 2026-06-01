export interface AssistantDto {
  id: string;
  name: string;
  systemPrompt: string;
  builtinTools: string[];
  createdAt: number;
  updatedAt: number;
}

export interface BuiltinToolDto {
  key: string;
  label: string;
}

export interface CreateAssistantRequest {
  name: string;
  systemPrompt: string;
  builtinTools: string[];
}

export type UpdateAssistantRequest = Partial<CreateAssistantRequest>;
