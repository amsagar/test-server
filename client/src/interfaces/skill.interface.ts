export interface SkillDto {
  id: string;
  assistantId: string;
  name: string;
  description: string;
  enabled: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface UpdateSkillRequest {
  name?: string;
  description?: string;
  enabled?: boolean;
}
