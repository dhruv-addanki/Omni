import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../context/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import TodayScreen from '../screens/TodayScreen';
import ReviewScreen from '../screens/ReviewScreen';
import ProfileScreen from '../screens/ProfileScreen';
import AlarmScreen from '../screens/AlarmScreen';
import WakeUpScreen from '../screens/WakeUpScreen';
import PlanTomorrowScreen from '../screens/PlanTomorrowScreen';

export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
  WakeUp: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
};

export type AppTabParamList = {
  Today: undefined;
  Alarm: undefined;
  Review: undefined;
  Profile: undefined;
  Plan: undefined;
};

const RootStack = createNativeStackNavigator<RootStackParamList>();
const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const Tabs = createBottomTabNavigator<AppTabParamList>();

function HomeTabs() {
  return (
    <Tabs.Navigator>
      <Tabs.Screen name="Today" component={TodayScreen} />
      <Tabs.Screen name="Alarm" component={AlarmScreen} />
       <Tabs.Screen name="Plan" component={PlanTomorrowScreen} options={{ title: 'Plan' }} />
      <Tabs.Screen name="Review" component={ReviewScreen} />
      <Tabs.Screen name="Profile" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator>
      <AuthStack.Screen name="Login" component={LoginScreen} options={{ title: 'Login' }} />
      <AuthStack.Screen name="Register" component={RegisterScreen} options={{ title: 'Register' }} />
    </AuthStack.Navigator>
  );
}

export default function AppNavigator() {
  const { user, loading } = useAuth();

  if (loading) return null;

  return (
    <RootStack.Navigator screenOptions={{ headerShown: false }}>
      {user ? (
        <>
          <RootStack.Screen name="App" component={HomeTabs} />
          <RootStack.Screen
            name="WakeUp"
            component={WakeUpScreen}
            options={{ headerShown: true, title: 'Wake Up' }}
          />
        </>
      ) : (
        <RootStack.Screen name="Auth" component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
}
