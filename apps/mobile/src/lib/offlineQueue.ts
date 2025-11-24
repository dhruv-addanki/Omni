import AsyncStorage from '@react-native-async-storage/async-storage';

type QueueItem =
  | { type: 'REFLECTION'; payload: { rating: number; notes: string; date: string } }
  | { type: 'ALARM_LOG'; payload: { type: 'SET' | 'SNOOZE' | 'DISMISS'; timestamp: string; metadata?: Record<string, unknown> } };

const STORAGE_KEY = 'omni_offline_queue';

async function loadQueue(): Promise<QueueItem[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueueItem[]) : [];
  } catch {
    return [];
  }
}

async function saveQueue(items: QueueItem[]) {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // ignore
  }
}

export async function enqueue(item: QueueItem) {
  const queue = await loadQueue();
  queue.push(item);
  await saveQueue(queue);
}

// Skeleton flush helper; wire to app start/network restore.
export async function flushQueue(
  handlers: {
    reflection: (payload: QueueItem & { type: 'REFLECTION' }) => Promise<void>;
    alarmLog: (payload: QueueItem & { type: 'ALARM_LOG' }) => Promise<void>;
  }
) {
  const queue = await loadQueue();
  const remaining: QueueItem[] = [];

  for (const item of queue) {
    try {
      if (item.type === 'REFLECTION') {
        await handlers.reflection(item as QueueItem & { type: 'REFLECTION' });
      } else if (item.type === 'ALARM_LOG') {
        await handlers.alarmLog(item as QueueItem & { type: 'ALARM_LOG' });
      }
    } catch (_err) {
      remaining.push(item); // keep failed items for next attempt
    }
  }

  await saveQueue(remaining);
}
