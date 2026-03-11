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
  member_sub_type: string | null;
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
  permissions: string[];
  roleNames: string[];
  hasPermission: (permission: string) => boolean;
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
  const [permissions, setPermissions] = useState<string[]>([]);
  const [roleNames, setRoleNames] = useState<string[]>([]);

  const fetchProfile = async (userId: string): Promise<void> => {
    try {
      const [profileResult, roleResult, customRolesResult] = await Promise.all([
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
          .maybeSingle(),
        supabase
          .from('user_custom_roles')
          .select(`
            roles (
              name,
              role_permissions (
                permission_id
              )
            )
          `)
          .eq('user_id', userId)
      ]);

      const isLegacyAdmin = !!roleResult.data;

      const fetchedPermissions = new Set<string>();
      const fetchedRoles = new Set<string>();

      if (customRolesResult.data) {
        customRolesResult.data.forEach((ucr: any) => {
          if (ucr.roles) {
            fetchedRoles.add(ucr.roles.name);
            if (ucr.roles.role_permissions) {
              ucr.roles.role_permissions.forEach((rp: any) => {
                if (rp.permission_id) {
                  fetchedPermissions.add(rp.permission_id);
                }
              });
            }
          }
        });
      }

      const extractedPermissions = Array.from(fetchedPermissions);
      const extractedRoles = Array.from(fetchedRoles);

      // If profile not found, retry once after a short delay
      if (!profileResult.data && !profileResult.error) {

        await new Promise(resolve => setTimeout(resolve, 1000));
        const retryResult = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .maybeSingle();

        if (retryResult.data) {
          let retryProfile = retryResult.data;
          let memberSubType = null;
          if (retryProfile.member_type === 'farm') {
            const { data } = await supabase.from('farm_details').select('position').eq('profile_id', retryProfile.id).maybeSingle();
            if (data?.position) memberSubType = data.position;
          } else if (retryProfile.member_type === 'company_employee') {
            const { data } = await supabase.from('company_details').select('business_type').eq('profile_id', retryProfile.id).maybeSingle();
            if (data?.business_type) memberSubType = data.business_type;
          } else if (retryProfile.member_type === 'veterinarian') {
            const { data } = await supabase.from('vet_details').select('vet_type').eq('profile_id', retryProfile.id).maybeSingle();
            if (data?.vet_type) memberSubType = data.vet_type;
          }
          (retryProfile as Record<string, any>).member_sub_type = memberSubType;

          setProfile(retryProfile as unknown as Profile);
          setIsAdmin(isLegacyAdmin);
          setPermissions(extractedPermissions);
          setRoleNames(extractedRoles);
          return;
        }
      }

      let baseProfile = profileResult.data;
      if (baseProfile) {
        let memberSubType = null;
        if (baseProfile.member_type === 'farm') {
          const { data } = await supabase.from('farm_details').select('position').eq('profile_id', baseProfile.id).maybeSingle();
          if (data?.position) memberSubType = data.position;
        } else if (baseProfile.member_type === 'company_employee') {
          const { data } = await supabase.from('company_details').select('business_type').eq('profile_id', baseProfile.id).maybeSingle();
          if (data?.business_type) memberSubType = data.business_type;
        } else if (baseProfile.member_type === 'veterinarian') {
          const { data } = await supabase.from('vet_details').select('vet_type').eq('profile_id', baseProfile.id).maybeSingle();
          if (data?.vet_type) memberSubType = data.vet_type;
        }
        (baseProfile as Record<string, any>).member_sub_type = memberSubType;
      }

      setProfile(baseProfile as unknown as Profile);
      setIsAdmin(isLegacyAdmin);
      setPermissions(extractedPermissions);
      setRoleNames(extractedRoles);
    } catch (error) {
      console.error('[AuthContext] Error fetching profile:', error);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await fetchProfile(user.id);
    }
  };

  // Auth state listener + session init
  useEffect(() => {
    let isMounted = true;

    const handleProfileLoad = (userId: string) => {
      // Defer fetchProfile to let Supabase client sync auth headers
      setTimeout(async () => {
        if (!isMounted) return;
        await fetchProfile(userId);
        if (isMounted) setIsLoading(false);
      }, 0);
    };

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          handleProfileLoad(session.user.id);
        } else {
          setProfile(null);
          setIsAdmin(false);
          setPermissions([]);
          setRoleNames([]);
          setIsLoading(false);
        }
      }
    );

    // Check for existing session
    const initSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!isMounted) return;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        handleProfileLoad(session.user.id);
      } else {
        setIsLoading(false);
      }
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
    setPermissions([]);
    setRoleNames([]);
  };

  const hasPermission = (permission: string) => {
    if (isAdmin) return true;
    return permissions.includes(permission);
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
      permissions,
      roleNames,
      hasPermission,
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

export function usePermissions() {
  const { permissions, roleNames, hasPermission, isAdmin } = useAuth();
  return { permissions, roleNames, hasPermission, isAdmin };
}
