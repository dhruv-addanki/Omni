import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Button, Alert, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Notifications from 'expo-notifications';
import { setAlarm, getCurrentAlarm, AlarmMode } from '../api/alarms';
import { api } from '../api/client';
import { todayLocalDateString } from '../utils/date';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false
  })
});

export default function AlarmScreen() {
  const [wakeTime, setWakeTime] = useState<Date>(new Date());
  const [mode, setMode] = useState<AlarmMode>('LIGHT');
  const [reflectionDone, setReflectionDone] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentAlarm, setCurrentAlarm] = useState<string | null>(null);

  const checkReflection = async () => {
    setLoading(true);
    try {
      const reflection = await api.get(`/reflections/${todayLocalDateString()}`);
      setReflectionDone(!!reflection);
    } catch (err) {
      setReflectionDone(false);
    } finally {
      setLoading(false);
    }
  };

  const loadAlarm = async () => {
    try {
      const alarm = await getCurrentAlarm();
      if (alarm && 'nextAlarmAt' in alarm && alarm.nextAlarmAt) {
        setCurrentAlarm(alarm.nextAlarmAt);
      }
    } catch (err) {
      // ignore
    }
  };

  useEffect(() => {
    checkReflection();
    loadAlarm();
  }, []);

  const scheduleNotification = async (date: Date) => {
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Enable notifications to set alarms.');
      return null;
    }
    const id = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Omni Alarm',
        body: 'Wake up! Time to start your day.',
        data: { route: 'WakeUp' }
      },
      trigger: date
    });
    return id;
  };

  const onSubmit = async () => {
    if (!reflectionDone) {
      Alert.alert('Nightly review required', 'Complete your review before setting an alarm.');
      return;
    }
    try {
      const wakeIso = wakeTime.toISOString();
      await setAlarm({ wakeTime: wakeIso, mode });
      await scheduleNotification(wakeTime);
      setCurrentAlarm(wakeIso);
      Alert.alert('Alarm set', 'Your alarm has been scheduled.');
    } catch (err) {
      Alert.alert('Error', (err as Error).message || 'Could not set alarm');
    }
  };

  if (loading || reflectionDone === null) {
    return (
      <View style={styles.containerCenter}>
        <Text>Loading...</Text>
      </View>
    );
  }

  if (!reflectionDone) {
    return (
      <View style={styles.containerCenter}>
        <Text style={styles.warning}>You must complete your nightly review before setting your alarm.</Text>
        <Button title="Refresh" onPress={checkReflection} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Set your alarm</Text>
      <Text>Wake time</Text>
      <DateTimePicker
        value={wakeTime}
        mode="time"
        is24Hour
        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
        onChange={(_, date) => {
          if (date) setWakeTime(date);
        }}
      />
      <View style={styles.modeRow}>
        <Text style={styles.label}>Mode:</Text>
        <View style={styles.modeButtons}>
          <Button
            title={`Strict${mode === 'STRICT' ? ' ✓' : ''}`}
            onPress={() => setMode('STRICT')}
          />
        </View>
        <View style={styles.modeButtons}>
          <Button
            title={`Light${mode === 'LIGHT' ? ' ✓' : ''}`}
            onPress={() => setMode('LIGHT')}
          />
        </View>
      </View>
      <Button title="Set Alarm" onPress={onSubmit} />
      {currentAlarm && (
        <Text style={styles.info}>Current alarm: {new Date(currentAlarm).toLocaleString()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f8fafc' },
  containerCenter: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 12 },
  warning: { color: 'red', textAlign: 'center', marginBottom: 12 },
  modeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  modeButtons: { marginRight: 8 },
  label: { fontWeight: '600', marginRight: 8 },
  info: { marginTop: 12, color: '#475569' }
});
