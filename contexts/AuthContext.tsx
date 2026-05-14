import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase, Profile } from '@/lib/supabase';
import { Session, User } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, name: string, age: number) => Promise<{ error: any }>;
  signInAnonymously: () => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // If getSession or token refresh hangs (stale/dead refresh token,
    // network failure on refresh endpoint), nuke local storage so the
    // user can log in fresh instead of being trapped on a spinner.
    const failsafe = setTimeout(async () => {
      if (!mounted) return;
      console.warn('[Auth] Initial session check exceeded 5s. Clearing stale session.');
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          const keysToRemove: string[] = [];
          for (let i = 0; i < window.localStorage.length; i++) {
            const k = window.localStorage.key(i);
            if (k && (k.startsWith('sb-') || k.includes('supabase'))) {
              keysToRemove.push(k);
            }
          }
          keysToRemove.forEach((k) => window.localStorage.removeItem(k));
        }
      } catch (e) {
        console.error('[Auth] Failed to clear local storage:', e);
      }
      try {
        await supabase.auth.signOut({ scope: 'local' } as any);
      } catch {}
      if (mounted) {
        setSession(null);
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    }, 5000);

    supabase.auth.getSession().then(async ({ data: { session }, error }) => {
      if (!mounted) return;
      clearTimeout(failsafe);
      if (error) {
        console.error('[Auth] getSession error:', error);
      }
      console.log('[Auth] getSession resolved. Has session:', !!session, 'User:', session?.user?.id ?? 'none');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user.id);
      } else {
        setLoading(false);
      }
    }).catch((err) => {
      console.error('[Auth] getSession threw:', err);
      clearTimeout(failsafe);
      if (mounted) setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer all work out of the auth lock to prevent deadlocks.
      setTimeout(() => {
        if (!mounted) return;
        console.log('[Auth] onAuthStateChange:', event, 'Has session:', !!session, 'User:', session?.user?.id ?? 'none');
        setSession(session);
        setUser(session?.user ?? null);
        if (session?.user) {
          loadProfile(session.user.id);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const loadProfile = async (userId: string) => {
    console.log('[Auth] loadProfile starting for user:', userId);
    try {
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      const result = await Promise.race([
        queryPromise,
        new Promise<{ data: null; error: { message: string; code?: string } }>((resolve) =>
          setTimeout(
            () => resolve({ data: null, error: { message: 'Profile query timed out after 10s', code: 'TIMEOUT' } }),
            10000
          )
        ),
      ]);

      const { data, error } = result as any;

      if (error) {
        console.error('[Auth] loadProfile error:', error);
        // If the session is invalid (401/JWT errors), force sign out so the
        // user can log in cleanly. This recovers from stale sessions left
        // over from a previous flowType or schema change.
        const msg = String(error.message || '').toLowerCase();
        if (msg.includes('jwt') || msg.includes('invalid') || msg.includes('expired') || msg.includes('401')) {
          console.warn('[Auth] Stale/invalid session detected, signing out');
          await supabase.auth.signOut().catch(() => {});
        }
        setProfile(null);
      } else {
        console.log('[Auth] loadProfile success. Profile found:', !!data);
        setProfile(data);
      }
    } catch (err) {
      console.error('[Auth] loadProfile threw:', err);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user.id);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const result = await Promise.race([
        supabase.auth.signInWithPassword({ email, password }),
        new Promise<{ error: { message: string } }>((resolve) =>
          setTimeout(
            () => resolve({ error: { message: 'Request timed out. Please try again.' } }),
            15000
          )
        ),
      ]);
      return { error: (result as any).error ?? null };
    } catch (e: any) {
      return { error: { message: e?.message ?? 'Sign in failed' } };
    }
  };

  const signUp = async (email: string, password: string, name: string, age: number) => {
    try {
      const result = await Promise.race([
        supabase.auth.signUp({
          email,
          password,
          options: { data: { name, age } },
        }),
        new Promise<{ error: { message: string } }>((resolve) =>
          setTimeout(
            () => resolve({ error: { message: 'Request timed out. Please try again.' } }),
            15000
          )
        ),
      ]);
      return { error: (result as any).error ?? null };
    } catch (e: any) {
      return { error: { message: e?.message ?? 'Sign up failed' } };
    }
  };

  const signInAnonymously = async () => {
    try {
      const result = await Promise.race([
        supabase.auth.signInAnonymously(),
        new Promise<{ error: { message: string } }>((resolve) =>
          setTimeout(
            () => resolve({ error: { message: 'Request timed out. Please try again.' } }),
            15000
          )
        ),
      ]);
      return { error: (result as any).error ?? null };
    } catch (e: any) {
      return { error: { message: e?.message ?? 'Anonymous sign in failed' } };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // silent
    }
  };

  return (
    <AuthContext.Provider value={{ user, profile, session, loading, signIn, signUp, signInAnonymously, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
