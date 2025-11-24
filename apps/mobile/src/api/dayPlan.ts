import { api } from './client';

export interface DayPlanTaskPayload {
  taskId?: string;
  title?: string;
  order?: number;
  plannedStart?: string;
  plannedEnd?: string;
}

export interface DayPlanStatus {
  confirmed: boolean;
  wakeConfirmedAt?: string | null;
  compressed: boolean;
  plan?: {
    id: string;
    date: string;
    confirmedAt: string | null;
    wakeConfirmedAt: string | null;
    compressed: boolean;
    tasks: Array<{
      id: string;
      isTopTask: boolean;
      order: number;
      plannedStart?: string | null;
      plannedEnd?: string | null;
      task: { id: string; title: string; status: string };
    }>;
  } | null;
}

export async function confirmDayPlan(payload: { date?: string; topTasks: DayPlanTaskPayload[] }) {
  return api.post<{ plan: DayPlanStatus['plan']; confirmed: boolean }>('/day-plan/confirm', payload);
}

export async function getDayPlanStatus(date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return api.get<DayPlanStatus>(`/day-plan/status${query}`);
}

export async function wakeUnlock() {
  return api.post<{ ok: boolean }>('/alarms/wake-unlock', {});
}

export async function getTaskSuggestions(date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return api.get<{ suggestions: Array<{ id: string; title: string; status: string }> }>(`/tasks/suggestions${query}`);
}
