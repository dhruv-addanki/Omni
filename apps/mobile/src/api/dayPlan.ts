import { api } from './client';

export async function confirmDayPlan(date?: string) {
  return api.post('/day-plan/confirm', date ? { date } : {});
}

export async function getDayPlanStatus(date?: string) {
  const query = date ? `?date=${encodeURIComponent(date)}` : '';
  return api.get<{ confirmed: boolean; confirmation?: unknown }>(`/day-plan/status${query}`);
}
