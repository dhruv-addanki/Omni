import { api } from './client';

export async function startFocusBlock(payload: {
  blockId?: string;
  taskId?: string;
  expectedApp?: string;
  expectedCategory?: 'SOCIAL' | 'PRODUCTIVITY' | 'ENTERTAINMENT' | 'OTHER';
}) {
  return api.post('/focus-blocks/start', payload);
}

export async function endFocusBlock(blockId: string) {
  return api.post('/focus-blocks/end', { blockId });
}

export async function getFocusCurrentStatus() {
  return api.get<{
    active: {
      id: string;
      expectedApp?: string | null;
      expectedCategory?: string | null;
      actualStart?: string | null;
      status: string;
    } | null;
    lastEvent?: { appName: string; appCategory: string } | null;
    onPlan: boolean;
  }>('/focus-blocks/current-status');
}
