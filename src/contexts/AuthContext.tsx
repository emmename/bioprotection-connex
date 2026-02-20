import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  user_id: string;
  member_id: string | null;
  nickname: string | null;
  first_name: string;
  last_name: string;
  member_type: string;
  approval_status: string;
  tier: string;
  total_points: number;
  total_coins: number;
  avatar_url: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isAdmin: boolean;
  isLoading: boolean;
  isApproved: boolean;
  isRejected: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string) => Promise<{ error: Error | null; data: { user: User | null; session: Session | null } | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchProfile = async (userId: string): Promise<void> => {
    try {
      console.log('[AuthContext] fetchProfile called for userId:', userId);
      const [profileResult, roleResult] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle(),
        supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', userId)
          .eq('role', 'admin')
          .maybeSingle()
      ]);

      console.log('[AuthContext] fetchProfile result:', {
        profileData: profileResult.data ? 'found' : 'null',
        profileError: profileResult.error?.message || 'none',
        profileStatus: profileResult.status,
      });

      // If profile not found, retry once after a short delay
      if (!profileResult.data && !profileResult.error) {
        console.log('[AuthContext] Profile not found, retrying in 1s...');
        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResult = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();
        console.log('[AuthContext] Retry result:', {
          data: retryResult.data ? 'found' : 'null',
          error: retryResult.error?.message || 'none',
        });
        if (retryResult.data) {
          setProfile(retryResult.data);
          setIsAdmin(!!roleResult.data);
          return;
        }
      }

      setProfile(profileResult.data);
      setIsAdmin(!!roleResult.data);
    } catch (error) {
      console.error('[AuthContext] Error fetching profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  useEffect(() => {
    let isMounted = true;

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setProfile(null);
          setIsAdmin(false);
        }
        setIsLoading(false);
      }
    );

    // THEN check for existing session
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;

      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchProfile(session.user.id);
      }
      setIsLoading(false);
    };

    initSession();

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (email: string, password: string) => {
    const redirectUrl = `${window.location.origin}/`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
      },
    });
    return { data: data ? { user: data.user, session: data.session } : null, error };
  };

  const resetPassword = async (email: string) => {
    const redirectUrl = `${window.location.origin}/auth?reset=true`;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsAdmin(false);
  };

  const isApproved = profile?.approval_status === 'approved';
  const isRejected = profile?.approval_status === 'rejected';

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      isAdmin,
      isLoading,
      isApproved,
      isRejected,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      resetPassword,
    }}>
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
