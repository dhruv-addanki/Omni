import Constants from 'expo-constants';

// Allow overriding via env for deployed builds; otherwise infer the dev host from Expo.
const envUrl =
  process.env.EXPO_PUBLIC_API_URL ||
  process.env.EXPO_PUBLIC_API_BASE_URL ||
  process.env.EXPO_PUBLIC_API_HOST;

const hostUri =
  Constants.expoConfig?.hostUri ||
  (Constants as any).manifest2?.extra?.expoClient?.hostUri ||
  (Constants as any).manifest?.hostUri;

const inferredUrl = hostUri ? `http://${hostUri.split(':')[0]}:3001` : undefined;

export const API_BASE_URL = (envUrl || inferredUrl || 'http://localhost:3001').replace(/\/$/, '');
