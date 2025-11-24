import 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import * as Notifications from 'expo-notifications';
import { useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { navigationRef, navigate, flushPendingNavigation } from './src/navigation/navigationRef';
import { useAuth } from './src/context/AuthContext';
import { getDayPlanStatus } from './src/api/dayPlan';

function NotificationHandler() {
  const { user } = useAuth();

  useEffect(() => {
    const handleResponse = async () => {
      if (!user) return;
      try {
        const status = await getDayPlanStatus();
        if (!status.confirmed) {
          navigate('WakeUp', undefined);
        }
      } catch (_err) {
        // If status check fails, still navigate to be safe.
        navigate('WakeUp', undefined);
      }
    };

    const sub = Notifications.addNotificationResponseReceivedListener(handleResponse);

    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response && user) {
        handleResponse();
      }
    });

    return () => {
      sub.remove();
    };
  }, [user]);

  return null;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer ref={navigationRef} onReady={flushPendingNavigation}>
          <StatusBar style="auto" />
          <AppNavigator />
          <NotificationHandler />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
