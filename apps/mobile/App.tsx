import { StatusBar } from 'expo-status-bar';
import { SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Omni Mobile</Text>
        <Text style={styles.subtitle}>Alarms, reviews, and focus on the go.</Text>
      </View>
      <StatusBar style="auto" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#e0f2fe',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  card: {
    backgroundColor: '#fff',
    padding: 24,
    borderRadius: 16,
    width: '100%',
    maxWidth: 420,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 10 },
    elevation: 6
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 8
  },
  subtitle: {
    fontSize: 16,
    color: '#334155'
  }
});
