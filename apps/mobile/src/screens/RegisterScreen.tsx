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

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

export default function RegisterScreen({ navigation }: Props) {
  const { register } = useAuth();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const canSubmit =
    firstName.trim().length > 0 &&
    lastName.trim().length > 0 &&
    email.trim().length > 3 &&
    password.length >= 6 &&
    !loading;

  const validate = () => {
    setError(null);
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedFirst = firstName.trim();
    const trimmedLast = lastName.trim();
    if (!trimmedFirst || !trimmedLast) {
      setError('Please add your first and last name.');
      return null;
    }
    if (!trimmedEmail.includes('@')) {
      setError('Enter a valid email address.');
      return null;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return null;
    }
    return { email: trimmedEmail, fullName: `${trimmedFirst} ${trimmedLast}`.trim() };
  };

  const onSubmit = async () => {
    const payload = validate();
    if (!payload) return;
    setLoading(true);
    try {
      await register(payload.email, password, payload.fullName);
    } catch (err) {
      setError((err as Error).message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

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
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>Add your name so we can personalize your plan.</Text>
            {error && <Text style={styles.error}>{error}</Text>}

            <View style={styles.row}>
              <View style={[styles.field, styles.half]}>
                <Text style={styles.label}>First name</Text>
                <TextInput
                  placeholder="Alex"
                  style={styles.input}
                value={firstName}
                onChangeText={(value) => {
                  setFirstName(value);
                  if (error) setError(null);
                }}
                autoCapitalize="words"
                textContentType="givenName"
                autoComplete="given-name"
                returnKeyType="next"
              />
              </View>
              <View style={[styles.field, styles.halfLast]}>
                <Text style={styles.label}>Last name</Text>
                <TextInput
                  placeholder="Johnson"
                  style={styles.input}
                value={lastName}
                onChangeText={(value) => {
                  setLastName(value);
                  if (error) setError(null);
                }}
                autoCapitalize="words"
                textContentType="familyName"
                autoComplete="family-name"
                returnKeyType="next"
              />
              </View>
            </View>

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
                textContentType="emailAddress"
                autoComplete="email"
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrapper}>
                <TextInput
                  placeholder="At least 6 characters"
                  style={styles.input}
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={(value) => {
                    setPassword(value);
                    if (error) setError(null);
                  }}
                  textContentType="newPassword"
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
              <Text style={styles.helper}>Use a strong password to keep your account secure.</Text>
            </View>

            <Pressable
              style={[styles.button, !canSubmit && styles.buttonDisabled]}
              onPress={onSubmit}
              disabled={!canSubmit}
            >
              <Text style={styles.buttonText}>
                {loading ? 'Creating account...' : 'Create account'}
              </Text>
            </Pressable>

            <View style={styles.linkRow}>
              <Text style={styles.linkLabel}>Already have an account?</Text>
              <TouchableOpacity onPress={() => navigation.navigate('Login')}>
                <Text style={styles.linkText}>Sign in</Text>
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
  row: { flexDirection: 'row' },
  field: { marginBottom: 14 },
  half: { flex: 1, marginRight: 10 },
  halfLast: { flex: 1 },
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
  helper: { color: '#64748b', fontSize: 12, marginTop: 6 },
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
    marginTop: 4,
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
