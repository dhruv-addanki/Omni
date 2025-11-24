import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { fetchDashboard, createTask } from '../api/client';
import { confirmDayPlan, getDayPlanStatus } from '../api/dayPlan';
import { todayLocalDateString } from '../utils/date';

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

  const load = async () => {
    setLoading(true);
    try {
      const [dashboard, status] = await Promise.all([fetchDashboard(), getDayPlanStatus()]);
      const existing = (dashboard.tasks || []).map((t) => ({ id: t.id, title: t.title }));
      setTasks(existing);
      setSelectedIds(new Set(existing.slice(0, 3).map((t) => t.id!))); // auto-select up to 3
      setConfirmedToday(status.confirmed);
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to load dashboard');
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
      const created = await Promise.all(
        newTaskTitles.map((title) => createTask({ title }))
      );

      // Optional: could mark selected tasks as pinned; for now just confirm day plan.
      await confirmDayPlan(todayLocalDateString());
      setConfirmedToday(true);
      Alert.alert('Day confirmed', 'Your top tasks are set.');
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Could not confirm day plan');
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Good morning ☀️</Text>
      <Text style={styles.subtitle}>Set your top tasks to start the day.</Text>
      {confirmedToday && <Text style={styles.badge}>Day plan already confirmed</Text>}

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
  }
});
