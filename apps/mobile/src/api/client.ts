import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config/api';

const TOKEN_KEY = 'omni_token';

export async function saveToken(token: string) {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function clearToken() {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(errorText || res.statusText);
  }

  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body ?? {}) }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body ?? {}) }),
};

export interface User {
  id: string;
  email: string;
  name?: string | null;
}

export interface Dashboard {
  tasks: Array<{
    id: string;
    title: string;
    status: string;
  }>;
  alarms: Array<{
    id: string;
    nextAlarmAt: string;
  }>;
  focusBlocks: Array<{
    id: string;
    plannedStart: string;
  }>;
  screenTime: { totalMs: number };
  reflection?: {
    id: string;
    rating: number;
    notes: string;
  } | null;
}

export async function login(email: string, password: string) {
  const res = await api.post<{ token: string; user: User }>('/auth/login', { email, password });
  await saveToken(res.token);
  return res.user;
}

export async function register(email: string, password: string, name: string) {
  const res = await api.post<{ token: string; user: User }>('/auth/register', {
    email,
    password,
    name,
  });
  await saveToken(res.token);
  return res.user;
}

export async function fetchMe() {
  return api.get<User>('/me');
}

export async function fetchDashboard() {
  return api.get<Dashboard>('/me/dashboard');
}

export async function createReflection(payload: { rating: number; notes: string }) {
  return api.post('/reflections', payload);
}

export async function createTask(payload: {
  title: string;
  description?: string;
  scheduledStart?: string;
  scheduledEnd?: string;
}) {
  return api.post('/tasks', payload);
}
