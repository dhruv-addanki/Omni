import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, FlatList, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { fetchDashboard } from '../api/client';
import { confirmDayPlan, getDayPlanStatus, getTaskSuggestions, wakeUnlock } from '../api/dayPlan';
import { todayLocalDateString } from '../utils/date';
import type { DayPlanStatus } from '../api/dayPlan';

interface TopTask {
  id?: string;
  title: string;
}

export default function WakeUpScreen() {
  const [tasks, setTasks] = useState<TopTask[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [newTasks, setNewTasks] = useState<string[]>(['', '', '']);
  const [loading, setLoading] = useState(true);
  const [confirmedToday, setConfirmedToday] = useState(false);
  const [planStatus, setPlanStatus] = useState<DayPlanStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const today = todayLocalDateString();
      const [dashboard, status, suggestions] = await Promise.all([
        fetchDashboard(),
        getDayPlanStatus(today),
        getTaskSuggestions(today)
      ]);
      const existing = (dashboard.tasks || []).map((t) => ({ id: t.id, title: t.title }));
      const suggestionTasks = suggestions.suggestions || [];

      // If plan already exists, preselect its top tasks.
      if (status.plan?.tasks?.length) {
        const planTasks = status.plan.tasks.map((t) => ({ id: t.task.id, title: t.task.title }));
        setTasks(planTasks);
        setSelectedIds(new Set(planTasks.map((t) => t.id!)));
      } else if (suggestionTasks.length) {
        setTasks(suggestionTasks.map((t) => ({ id: t.id, title: t.title })));
        setSelectedIds(new Set(suggestionTasks.slice(0, 3).map((t) => t.id!)));
      } else {
        setTasks(existing);
        setSelectedIds(new Set(existing.slice(0, 3).map((t) => t.id!)));
      }

      setPlanStatus(status);
      setConfirmedToday(status.confirmed);
    } catch (err) {
      const message = (err as Error).message || 'Failed to load dashboard';
      setError(message);
      Alert.alert('Error', message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleSelect = (id?: string) => {
    if (!id) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const onSubmit = async () => {
    const newTaskTitles = newTasks.map((t) => t.trim()).filter(Boolean);
    const selectedExistingIds = Array.from(selectedIds);
    const totalCount = newTaskTitles.length + selectedExistingIds.length;

    if (totalCount < 3) {
      Alert.alert('Need 3 tasks', 'Please select or add at least 3 top tasks.');
      return;
    }

    try {
      const topTasks = [
        ...selectedExistingIds.map((id, idx) => ({ taskId: id, order: idx })),
        ...newTaskTitles.map((title, idx) => ({ title, order: selectedExistingIds.length + idx }))
      ];

      const result = await confirmDayPlan({ date: todayLocalDateString(), topTasks });
      setConfirmedToday(true);
      setPlanStatus((prev) => ({
        ...(prev || { confirmed: true, compressed: false }),
        confirmed: true,
        plan: result.plan || null
      }));

      await wakeUnlock();

      const compressed = result.plan?.compressed;
      Alert.alert(
        'Day confirmed',
        compressed
          ? 'Your plan is set and compressed because you started late.'
          : 'Your top tasks are set.'
      );
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Could not confirm day plan');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Good morning ☀️</Text>
      <Text style={styles.subtitle}>Set your top tasks to start the day.</Text>
      {planStatus?.compressed && (
        <Text style={styles.warning}>You’re starting late, we’ve compressed your plan.</Text>
      )}
      {confirmedToday && <Text style={styles.badge}>Day plan already confirmed</Text>}
      {error && <Text style={styles.warning}>{error}</Text>}

      <Text style={styles.sectionTitle}>Today’s tasks</Text>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id || item.title}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.taskItem, selectedIds.has(item.id || '') && styles.taskSelected]}
            onPress={() => toggleSelect(item.id)}
          >
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text>{selectedIds.has(item.id || '') ? 'Selected' : 'Tap to select'}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.muted}>No tasks yet.</Text>}
      />

      <Text style={styles.sectionTitle}>Quick add tasks</Text>
      {newTasks.map((val, idx) => (
        <TextInput
          key={idx}
          style={styles.input}
          placeholder={`Task ${idx + 1}`}
          value={val}
          onChangeText={(text) => {
            const next = [...newTasks];
            next[idx] = text;
            setNewTasks(next);
          }}
        />
      ))}

      <Button title={confirmedToday ? 'Update Day Plan' : 'Confirm Day Plan'} onPress={onSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', marginBottom: 6 },
  subtitle: { color: '#475569', marginBottom: 12 },
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#dcfce7',
    color: '#166534',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginBottom: 12
  },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  taskItem: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 8
  },
  taskSelected: { borderColor: '#38bdf8', backgroundColor: '#e0f2fe' },
  taskTitle: { fontWeight: '600' },
  muted: { color: '#94a3b8', marginBottom: 8 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  warning: { color: '#f97316', marginBottom: 8 }
});
