import { api } from './client';

export interface DraftBlock {
  start: string;
  end: string;
  taskId?: string;
  taskTitle?: string;
  conflict?: boolean;
}

export interface DraftResponse {
  date: string;
  tasks: Array<{ id: string; title: string; status: string }>;
  blocks: DraftBlock[];
  warnings: string[];
}

export async function fetchPlanningDraft(date: string) {
  return api.post<DraftResponse>('/planning/draft', { date });
}

export async function applyPlanning(payload: {
  date: string;
  tasks: Array<{ taskId?: string; title?: string }>;
  blocks: Array<{ start: string; end: string; taskId?: string; title?: string }>;
}) {
  return api.post('/planning/apply', payload);
}
