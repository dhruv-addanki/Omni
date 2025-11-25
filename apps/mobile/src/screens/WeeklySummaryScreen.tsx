import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Alert } from 'react-native';
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
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const analytics = await fetchWeeklyAnalytics();
      setData(analytics);
      const change = await fetchWeeklyChangeBrief(todayDateString());
      setBrief(change.brief);
      setError(null);
    } catch (err) {
      const msg = (err as Error).message || 'Failed to load weekly summary';
      setError(msg);
      Alert.alert('Error', msg);
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

  const header = (
    <View>
      <Text style={styles.title}>Weekly summary</Text>
      {error && <Text style={styles.error}>{error}</Text>}
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
      <Text style={styles.sectionTitle}>Last 7 days</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={data?.metrics || []}
        keyExtractor={(item) => item.date}
        ListHeaderComponent={header}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.date}>{item.date}</Text>
            <Text style={styles.stat}>Tasks: {item.tasksCompleted}/{item.tasksPlanned}</Text>
            <Text style={styles.stat}>Focus: {item.focusMinutes}m</Text>
            <Text style={styles.stat}>Distractions: {item.distractionMinutes}m</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginVertical: 8 },
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
  date: { fontWeight: '700' },
  stat: { color: '#475569' },
  error: { color: 'red', marginBottom: 8 }
});
