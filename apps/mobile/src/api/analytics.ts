import { api } from './client';

export async function fetchWeeklyAnalytics() {
  return api.get<{ metrics: Array<any>; streaks: any }>('/analytics/weekly');
}

export async function fetchWeeklyChangeBrief(date: string) {
  const query = `?endDate=${encodeURIComponent(date)}`;
  return api.get<{ brief: string }>('/ai/weekly-change-brief' + query);
}
