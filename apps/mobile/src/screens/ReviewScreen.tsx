import { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Button, Alert } from 'react-native';
import Slider from '@react-native-community/slider';
import { createReflection } from '../api/client';

export default function ReviewScreen() {
  const [rating, setRating] = useState(5);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setLoading(true);
    try {
      await createReflection({ rating, notes });
      Alert.alert('Saved', 'Reflection submitted');
      setNotes('');
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Failed to save reflection');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Nightly reflection</Text>
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
