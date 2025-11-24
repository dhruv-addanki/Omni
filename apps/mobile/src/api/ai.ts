import { api } from './client';

export async function fetchNextBestAction() {
  return api.post<{ action: string }>('/ai/next-best-action', {});
}

export async function fetchDailySummary(date: string) {
  const query = `?date=${encodeURIComponent(date)}`;
  return api.get<{ aiSummary: string | null }>(`/ai/daily-summary${query}`);
}
