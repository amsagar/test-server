export interface ResponseStyleDto {
  id: string;
  name: string;
  description: string;
  instructions: string;
  createdAt: number;
  updatedAt: number;
}

export interface CreateStyleRequest {
  name: string;
  description?: string;
  instructions: string;
}

export type UpdateStyleRequest = Partial<CreateStyleRequest>;
