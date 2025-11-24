import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { fetchMe, clearToken, getToken, saveToken } from '../api/client';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  user: { id: string; email: string; name?: string | null } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const session = await supabase.auth.getSession();
        const token = session.data.session?.access_token || (await getToken());
        if (token) await saveToken(token);
        if (token) setUser(await fetchMe());
      } catch (err) {
        await clearToken();
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error || !data.session?.access_token) throw error || new Error('Login failed');
    await saveToken(data.session.access_token);
    setUser(await fetchMe());
  };

  const register = async (email: string, password: string, name: string) => {
    const [firstName, ...rest] = name.trim().split(' ');
    const lastName = rest.join(' ').trim() || undefined;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name: name.trim(), firstName, lastName } }
    });
    if (error || !data.session?.access_token) throw error || new Error('Register failed');
    await saveToken(data.session.access_token);
    setUser(await fetchMe());
  };

  const logout = async () => {
    setUser(null);
    await supabase.auth.signOut();
    await clearToken();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
