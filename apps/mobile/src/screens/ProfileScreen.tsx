import { View, Text, Button, StyleSheet } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function ProfileScreen() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <Text style={styles.label}>Email</Text>
      <Text style={styles.value}>{user?.email}</Text>
      <Text style={styles.label}>Name</Text>
      <Text style={styles.value}>{user?.name || 'Not set'}</Text>
      <Button title="Logout" onPress={logout} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  label: { fontWeight: '600', marginTop: 12 },
  value: { color: '#475569', marginTop: 4 },
});
