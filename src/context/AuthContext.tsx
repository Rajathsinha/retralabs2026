import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** True while a valid PASSWORD_RECOVERY token is active (user clicked a reset link). */
  recoveryMode: boolean;
  signInWithPassword: (email: string, password: string) => Promise<AuthError | null>;
  signInWithGoogle: () => Promise<void>;
  signInWithMagicLink: (email: string) => Promise<AuthError | null>;
  signUp: (email: string, password: string, name: string) => Promise<AuthError | null>;
  signOut: () => Promise<void>;
  updateProfile: (data: { name?: string; phone?: string; address?: string }) => Promise<AuthError | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user,         setUser]         = useState<User | null>(null);
  const [session,      setSession]      = useState<Session | null>(null);
  const [loading,      setLoading]      = useState(true);
  // Set to true when Supabase fires PASSWORD_RECOVERY (user clicked a reset link).
  // Consumed by ResetPasswordPage to show the new-password form.
  const [recoveryMode, setRecoveryMode] = useState(false);

  useEffect(() => {
    /* Listen for auth state changes BEFORE calling getSession so we never
       miss the PASSWORD_RECOVERY event that fires when the hash is processed. */
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, s) => {
      if (event === 'PASSWORD_RECOVERY') {
        // User arrived via a password-reset email link
        setRecoveryMode(true);
      } else if (event === 'USER_UPDATED' || event === 'SIGNED_OUT') {
        // Password was updated or user signed out — clear recovery mode
        setRecoveryMode(false);
      }
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    /* getSession triggers processing of the URL hash fragment (access_token,
       refresh_token, type) and causes onAuthStateChange to fire above. */
    supabase.auth.getSession().then(({ data }) => {
      // Only update if onAuthStateChange hasn't already done so
      setSession(prev => prev ?? data.session);
      setUser(prev => prev ?? (data.session?.user ?? null));
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  /* ── Email + Password ── */
  const signInWithPassword = async (email: string, password: string): Promise<AuthError | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error;
  };

  /* ── Google OAuth ── */
  const signInWithGoogle = async (): Promise<void> => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    });
  };

  /* ── Magic Link ── */
  const signInWithMagicLink = async (email: string): Promise<AuthError | null> => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    return error;
  };

  /* ── Sign Up ── */
  const signUp = async (email: string, password: string, name: string): Promise<AuthError | null> => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name } },
    });
    return error;
  };

  /* ── Sign Out ── */
  const signOut = async (): Promise<void> => {
    await supabase.auth.signOut();
  };

  /* ── Update profile metadata ── */
  const updateProfile = async (data: { name?: string; phone?: string; address?: string }): Promise<AuthError | null> => {
    const { error } = await supabase.auth.updateUser({ data });
    return error;
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, recoveryMode,
      signInWithPassword, signInWithGoogle, signInWithMagicLink,
      signUp, signOut, updateProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
