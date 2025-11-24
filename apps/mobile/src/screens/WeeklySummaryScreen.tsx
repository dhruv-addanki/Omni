import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { fetchWeeklyAnalytics, fetchWeeklyChangeBrief } from '../api/analytics';

function todayDateString() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function WeeklySummaryScreen() {
  const [data, setData] = useState<{ metrics: any[]; streaks: any } | null>(null);
  const [brief, setBrief] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const analytics = await fetchWeeklyAnalytics();
      setData(analytics);
      const change = await fetchWeeklyChangeBrief(todayDateString());
      setBrief(change.brief);
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to load weekly summary');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
        <Text>Loading weekly summary...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Weekly summary</Text>
      {brief && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>What changed this week?</Text>
          <Text style={styles.cardBody}>{brief}</Text>
        </View>
      )}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Streaks</Text>
        <Text style={styles.cardBody}>Reflection: {data?.streaks.reflection || 0} days</Text>
        <Text style={styles.cardBody}>Day plan: {data?.streaks.dayPlan || 0} days</Text>
        <Text style={styles.cardBody}>Focus 60+: {data?.streaks.focus60 || 0} days</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Last 7 days</Text>
        <FlatList
          data={data?.metrics || []}
          keyExtractor={(item) => item.date}
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.date}>{item.date}</Text>
              <Text style={styles.stat}>Tasks: {item.tasksCompleted}/{item.tasksPlanned}</Text>
              <Text style={styles.stat}>Focus: {item.focusMinutes}m</Text>
              <Text style={styles.stat}>Distractions: {item.distractionMinutes}m</Text>
            </View>
          )}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardBody: { color: '#475569' },
  row: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  date: { fontWeight: '700' },
  stat: { color: '#475569' }
});
