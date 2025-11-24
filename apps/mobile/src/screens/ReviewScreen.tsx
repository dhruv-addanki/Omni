import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert, ActivityIndicator } from 'react-native';
import Slider from '@react-native-community/slider';
import { createReflection, fetchReflection } from '../api/client';
import { todayLocalDateString } from '../utils/date';

export default function ReviewScreen() {
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);
  const [hasReflection, setHasReflection] = useState(false);

  const load = async () => {
    setFetching(true);
    try {
      const existing = await fetchReflection(todayLocalDateString());
      setHasReflection(true);
      setRating(existing.rating);
      setNotes(existing.notes);
    } catch (_err) {
      setHasReflection(false);
      setRating(5);
      setNotes('');
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await createReflection({ rating, notes });
      Alert.alert('Saved', 'Reflection submitted');
      setHasReflection(true);
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to save reflection');
    } finally {
      setLoading(false);
    }
  };

  if (fetching) {
    return (
      <View style={styles.container}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nightly reflection</Text>
      <Text style={styles.status}>
        {hasReflection ? 'Reflection complete for today' : 'Pending reflection for today'}
      </Text>
      <Text style={styles.label}>How did today go? ({rating}/10)</Text>
      <Slider
        minimumValue={1}
        maximumValue={10}
        step={1}
        value={rating}
        onValueChange={(v) => setRating(Math.round(v))}
      />
      <Text style={styles.label}>Notes</Text>
      <TextInput
        placeholder="What went well? What to improve?"
        style={styles.input}
        multiline
        numberOfLines={4}
        value={notes}
        onChangeText={setNotes}
      />
      <Button title={loading ? 'Saving...' : 'Submit reflection'} onPress={onSubmit} disabled={loading} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  status: { color: '#475569', marginBottom: 8 },
  label: { fontWeight: '600', marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    minHeight: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
});
