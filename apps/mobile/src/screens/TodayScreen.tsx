import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { fetchDashboard, Dashboard } from '../api/client';

export default function TodayScreen() {
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setError(null);
    try {
      const data = await fetchDashboard();
      setDashboard(data);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const renderTask = ({ item }: { item: Dashboard['tasks'][number] }) => (
    <View style={styles.taskItem}>
      <Text style={styles.taskTitle}>{item.title}</Text>
      <Text style={styles.taskStatus}>{item.status}</Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.greeting}>Hi there 👋</Text>
      {error && <Text style={styles.error}>{error}</Text>}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Next alarm</Text>
        <Text style={styles.cardBody}>
          {dashboard?.alarms?.[0]?.nextAlarmAt
            ? new Date(dashboard.alarms[0].nextAlarmAt).toLocaleString()
            : 'No alarm scheduled'}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Reflection</Text>
        <Text style={styles.cardBody}>
          {dashboard?.reflection ? 'Reflection complete for today' : 'Pending reflection'}
        </Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Today’s tasks</Text>
        <FlatList
          data={dashboard?.tasks ?? []}
          keyExtractor={(item) => item.id}
          renderItem={renderTask}
          ListEmptyComponent={<Text style={styles.cardBody}>No tasks for today</Text>}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} />}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  greeting: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  cardBody: { color: '#475569' },
  taskItem: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  taskTitle: { fontSize: 15, fontWeight: '600' },
  taskStatus: { color: '#475569' },
  error: { color: 'red', marginBottom: 8 },
});
