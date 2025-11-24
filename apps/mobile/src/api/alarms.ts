import { api } from './client';

export type AlarmMode = 'STRICT' | 'LIGHT';

export interface AlarmSetting {
  id: string;
  userId: string;
  wakeTime: string;
  nextAlarmAt: string;
  mode: AlarmMode;
  createdAt: string;
  updatedAt: string;
}

export async function getCurrentAlarm() {
  return api.get<AlarmSetting | { nextAlarmAt: null }>('/alarms/current');
}

export async function setAlarm(payload: { wakeTime: string; mode: AlarmMode }) {
  return api.post<AlarmSetting>('/alarms', payload);
}

export async function logAlarmEvent(payload: {
  type: 'SET' | 'SNOOZE' | 'DISMISS';
  alarmId?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}) {
  return api.post('/alarms/log', payload);
}
