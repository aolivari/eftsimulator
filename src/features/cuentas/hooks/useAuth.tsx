import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { supabase, type Session } from '../../../shared/lib';
import type { AuthContextValue } from '../types';

const AuthContext = createContext<AuthContextValue | null>(null);

function requireClient() {
  if (!supabase) {
    throw new Error(
      'Las cuentas no están configuradas (faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY)'
    );
  }
  return supabase;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(Boolean(supabase));

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => data.subscription.unsubscribe();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      enabled: Boolean(supabase),
      loading,
      session,
      user: session?.user ?? null,
      async signInWithPassword(email, password) {
        const { error } = await requireClient().auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      async signUp(email, password) {
        const { data, error } = await requireClient().auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        return { needsConfirmation: !data.session };
      },
      async signInWithGoogle() {
        const { error } = await requireClient().auth.signInWithOAuth({
          provider: 'google',
          options: { redirectTo: window.location.origin },
        });
        if (error) throw error;
      },
      async resetPassword(email) {
        const { error } = await requireClient().auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin,
        });
        if (error) throw error;
      },
      async signOut() {
        await requireClient().auth.signOut();
      },
    }),
    [loading, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}
