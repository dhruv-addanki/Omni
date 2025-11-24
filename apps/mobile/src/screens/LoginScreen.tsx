import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Pressable,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { AuthStackParamList } from '../navigation/AppNavigator';
import { useAuth } from '../context/AuthContext';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

export default function LoginScreen({ navigation }: Props) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError(null);
    const trimmedEmail = email.trim();
    if (!trimmedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length === 0) {
      setError('Enter your password to continue.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login(trimmedEmail, password);
    } catch (err) {
      setError((err as Error).message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = email.trim().length > 3 && password.length > 0 && !loading;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>
            <Text style={styles.subtitle}>Log in to get your day’s plan and alarms.</Text>
            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                placeholder="you@example.com"
                style={styles.input}
                autoCapitalize="none"
                keyboardType="email-address"
                value={email}
                onChangeText={(value) => {
                  setEmail(value);
                  if (error) setError(null);
                }}
                textContentType="username"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="Your password"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) setError(null);
                  }}
                  textContentType="password"
                  autoComplete="password"
                  returnKeyType="done"
                />
                <Pressable
                  style={styles.toggle}
                  onPress={() => setShowPassword((v) => !v)}
                  hitSlop={8}
                >
                  <Text style={styles.toggleText}>{showPassword ? 'Hide' : 'Show'}</Text>
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.buttonText}>{loading ? 'Logging in...' : 'Continue'}</Text>
            </Pressable>

            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>New here?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Register')}>
                <Text style={styles.linkText}>Create an account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: '#e6eeff' },
  scrollContent: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 3,
  },
  title: { fontSize: 26, fontWeight: '700', color: '#0f172a', textAlign: 'center' },
  subtitle: {
    marginTop: 6,
    marginBottom: 16,
    fontSize: 15,
    textAlign: 'center',
    color: '#475569',
  },
  field: { marginBottom: 14 },
  label: { fontSize: 13, fontWeight: '600', color: '#1f2937', marginBottom: 6 },
  inputWrapper: { position: 'relative' },
  input: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    fontSize: 16,
  },
  error: {
    color: '#dc2626',
    marginBottom: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  toggle: { position: 'absolute', right: 12, top: 14, padding: 4 },
  toggleText: { color: '#0f172a', fontWeight: '700', fontSize: 13 },
  button: {
    backgroundColor: '#0f172a',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
  },
  buttonDisabled: { backgroundColor: '#cbd5e1' },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  linkRow: {
    marginTop: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  linkLabel: { color: '#475569', fontSize: 14 },
  linkText: { color: '#0f172a', fontWeight: '700', fontSize: 14, marginLeft: 6 },
});
