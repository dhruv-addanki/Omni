import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Button, Alert, ActivityIndicator } from 'react-native';
import { fetchPlanningDraft, applyPlanning, DraftBlock } from '../api/planning';

function tomorrowDateString() {
  const now = new Date();
  now.setDate(now.getDate() + 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function PlanTomorrowScreen() {
  const [draft, setDraft] = useState<{
    tasks: Array<{ id: string; title: string; status: string }>;
    blocks: DraftBlock[];
    warnings: string[];
  } | null>(null);
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const tomorrow = tomorrowDateString();
      const res = await fetchPlanningDraft(tomorrow);
      setDraft(res);
      setSelectedTasks(new Set(res.tasks.map((t) => t.id)));
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to load draft');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const toggleTask = (id: string) => {
    const next = new Set(selectedTasks);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedTasks(next);
  };

  const onConfirm = async () => {
    if (!draft) return;
    if (selectedTasks.size === 0) {
      Alert.alert('Select tasks', 'Please keep at least one task selected.');
      return;
    }
    setSubmitting(true);
    try {
      const tomorrow = tomorrowDateString();
      await applyPlanning({
        date: tomorrow,
        tasks: draft.tasks
          .filter((t) => selectedTasks.has(t.id))
          .map((t) => ({ taskId: t.id })),
        blocks: draft.blocks.filter((b) => !b.taskId || selectedTasks.has(b.taskId))
      });
      Alert.alert('Plan saved', 'Your draft plan has been applied.');
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to apply plan');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Loading draft...</Text>
      </View>
    );
  }

  if (!draft) {
    return (
      <View style={styles.center}>
        <Text>No draft available.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Plan for tomorrow</Text>
      {draft.warnings.map((w, idx) => (
        <Text key={idx} style={styles.warning}>{w}</Text>
      ))}

      <Text style={styles.sectionTitle}>Tasks</Text>
      <FlatList
        data={draft.tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.taskRow, selectedTasks.has(item.id) && styles.taskSelected]}
            onPress={() => toggleTask(item.id)}
          >
            <Text style={styles.taskTitle}>{item.title}</Text>
            <Text>{selectedTasks.has(item.id) ? 'Included' : 'Excluded'}</Text>
          </TouchableOpacity>
        )}
      />

      <Text style={styles.sectionTitle}>Focus blocks</Text>
      <View style={styles.blocksContainer}>
        {draft.blocks.map((b, idx) => (
          <View key={`${b.start}-${idx}`} style={styles.blockRow}>
            <Text style={styles.blockTime}>
              {new Date(b.start).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} -{' '}
              {new Date(b.end).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={styles.blockTask}>{b.taskTitle || 'Unassigned'}</Text>
            {b.conflict && <Text style={styles.conflict}>Conflict</Text>}
          </View>
        ))}
      </View>

      <Button title={submitting ? 'Saving...' : 'Apply Plan'} onPress={onConfirm} disabled={submitting} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
  warning: { color: '#f97316', marginBottom: 4 },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginTop: 12, marginBottom: 6 },
  taskRow: {
    padding: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    marginBottom: 6
  },
  taskSelected: { backgroundColor: '#e0f2fe', borderColor: '#38bdf8' },
  taskTitle: { fontWeight: '600' },
  blocksContainer: { gap: 6 },
  blockRow: { padding: 8, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8 },
  blockTime: { fontWeight: '600' },
  blockTask: { color: '#475569' },
  conflict: { color: '#ef4444', fontWeight: '700' }
});
