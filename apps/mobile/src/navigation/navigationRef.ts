import { createNavigationContainerRef } from '@react-navigation/native';
import { RootStackParamList } from './AppNavigator';

export const navigationRef = createNavigationContainerRef<RootStackParamList>();

let pendingRoute: { name: keyof RootStackParamList; params?: RootStackParamList[keyof RootStackParamList] } | null = null;

export function navigate(name: keyof RootStackParamList, params?: RootStackParamList[typeof name]) {
  if (navigationRef.isReady()) {
    navigationRef.navigate(name, params as never);
    pendingRoute = null;
  } else {
    pendingRoute = { name, params };
  }
}

export function flushPendingNavigation() {
  if (pendingRoute && navigationRef.isReady()) {
    navigationRef.navigate(pendingRoute.name, pendingRoute.params as never);
    pendingRoute = null;
  }
}
