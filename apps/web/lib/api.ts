const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const STATIC_TOKEN = process.env.NEXT_PUBLIC_API_TOKEN; // optional for local testing

function getRuntimeToken() {
  if (typeof window === 'undefined') return undefined;
  try {
    return window.localStorage.getItem('omni_token') || undefined;
  } catch {
    return undefined;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getRuntimeToken() || STATIC_TOKEN;
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    },
    cache: 'no-cache'
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export interface WeeklyAnalyticsDay {
  date: string;
  tasksPlanned: number;
  tasksCompleted: number;
  focusMinutes: number;
  reflectionRating: number | null;
  aiSummary?: string | null;
}

export interface DashboardData {
  tasks: Array<{ id: string; title: string; status: string }>;
  focusBlocks: Array<{ id: string; plannedStart: string; plannedEnd: string; actualStart: string | null; actualEnd: string | null }>;
  reflection?: { id: string; rating: number; notes: string; aiSummary?: string | null } | null;
}

export const api = {
  getDashboard: () => request<DashboardData>('/me/dashboard'),
  getWeekly: () => request<WeeklyAnalyticsDay[]>('/analytics/weekly'),
  getReflection: (date: string) => request<{ rating: number; notes: string; aiSummary?: string | null }>(`/reflections/${date}`),
  getTasksForDate: (date: string) => request<{ tasks: Array<{ id: string; title: string; status: string; scheduledStart?: string; scheduledEnd?: string; actualEnd?: string }> }>(`/analytics/tasks?date=${date}`),
  getDayTimeline: (date: string) =>
    request<{
      plannedBlocks: Array<{ id: string; start: string; end: string; taskId?: string | null }>;
      actualBlocks: Array<{ id: string; start: string; end: string; taskId?: string | null }>;
      screenTimeEvents: Array<{ id: string; appName: string; category: string; start: string; end: string }>;
      summary: { plannedMinutes: number; actualMinutes: number; distractionMinutesDuringFocus: number };
    }>(`/analytics/day-timeline?date=${date}`),
  getPlanningDay: (date: string) => request<{ date: string; plan: any; tasks: any[]; focusBlocks: any[]; events: any[] }>(`/planning/day?date=${date}`),
  patchPlanningDay: (body: { date: string; tasks?: Array<{ taskId: string; order?: number }>; focusBlocks?: Array<{ id: string; plannedStart: string; plannedEnd: string }> }) =>
    request('/planning/day', { method: 'PATCH', body: JSON.stringify(body) }),
  resolveConflicts: (body: { date: string; focusBlocks: Array<{ id?: string; plannedStart: string; plannedEnd: string; taskId?: string }> }) =>
    request<{ overlaps: any[]; eventConflicts: any[]; suggestions: string[] }>('/planning/resolve-conflicts', {
      method: 'POST',
      body: JSON.stringify(body)
    }),
  getReviewDay: (date: string) => request<{ reflection: any; planCritique: any; deviation: any }>(`/review/day?date=${date}`),
  getSettings: () => request<any>('/settings'),
  patchSettings: (body: any) => request<any>('/settings', { method: 'PATCH', body: JSON.stringify(body) }),
  getIntegrations: () => request<any[]>('/integrations'),
  getWeeklyChangeBrief: (endDate: string) => request<{ brief: string }>(`/ai/weekly-change-brief?endDate=${endDate}`)
};
