import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Button, TextInput, Alert } from 'react-native';
import { startFocusBlock, endFocusBlock, getFocusCurrentStatus } from '../api/focus';

export default function FocusSessionScreen() {
  const [blockId, setBlockId] = useState<string | null>(null);
  const [taskId, setTaskId] = useState<string | undefined>(undefined);
  const [expectedApp, setExpectedApp] = useState('');
  const [expectedCategory, setExpectedCategory] = useState<'PRODUCTIVITY' | 'SOCIAL' | 'ENTERTAINMENT' | 'OTHER' | undefined>('PRODUCTIVITY');
  const [elapsed, setElapsed] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    startTimer();
    startPolling();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  const startTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => setElapsed((e) => e + 1), 1000);
  };

  const startPolling = () => {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      try {
        const status = await getFocusCurrentStatus();
        if (status.active?.id) setBlockId(status.active.id);
        setWarning(status.onPlan ? null : 'You are off-plan (distracting app detected).');
      } catch {
        // ignore
      }
    }, 15000);
  };

  const onStart = async () => {
    try {
      const res = await startFocusBlock({
        taskId,
        expectedApp: expectedApp || undefined,
        expectedCategory
      });
      setBlockId((res as any).id);
      setElapsed(0);
      startTimer();
      startPolling();
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Could not start focus');
    }
  };

  const onEnd = async () => {
    if (!blockId) {
      Alert.alert('No active focus', 'Start a focus session first.');
      return;
    }
    try {
      await endFocusBlock(blockId);
      setWarning(null);
      setBlockId(null);
      if (intervalRef.current) clearInterval(intervalRef.current);
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Could not end focus');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Focus session</Text>
      {warning && <Text style={styles.warning}>{warning}</Text>}
      <Text style={styles.label}>Task ID (optional)</Text>
      <TextInput style={styles.input} value={taskId} onChangeText={setTaskId} placeholder="Task ID" />
      <Text style={styles.label}>Expected app (optional)</Text>
      <TextInput style={styles.input} value={expectedApp} onChangeText={setExpectedApp} placeholder="e.g. Notion" />
      <Text style={styles.label}>Expected category</Text>
      <TextInput style={styles.input} value={expectedCategory} onChangeText={(text) => setExpectedCategory(text as any)} placeholder="PRODUCTIVITY" />
      <Text style={styles.elapsed}>Elapsed: {Math.floor(elapsed / 60)}m {elapsed % 60}s</Text>
      <View style={styles.row}>
        <Button title="Start focus" onPress={onStart} />
        <Button title="End focus" onPress={onEnd} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  label: { fontWeight: '600', marginTop: 12 },
  input: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 10,
    marginTop: 6
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 12 },
  elapsed: { marginTop: 12, fontWeight: '600' },
  warning: { color: '#f97316', marginBottom: 8 }
});
