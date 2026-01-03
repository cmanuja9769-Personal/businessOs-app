import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@lib/supabase';
import { Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHED_ORG_KEY = 'cached_organization_id';
const CACHED_ORG_USER_KEY = 'cached_organization_user_id';
const CACHED_SESSION_KEY = 'cached_session_data';
const CACHED_USER_KEY = 'cached_user_data';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  organizationId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (email: string, password: string, userData: any) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    // Immediately restore cached state for instant app start
    const restoreCachedState = async () => {
      try {
        const [cachedOrgId, cachedSessionStr, cachedUserStr] = await Promise.all([
          AsyncStorage.getItem(CACHED_ORG_KEY),
          AsyncStorage.getItem(CACHED_SESSION_KEY),
          AsyncStorage.getItem(CACHED_USER_KEY),
        ]);
        
        if (!isMounted) return;
        
        // Restore cached user first for immediate access
        if (cachedUserStr) {
          try {
            const cachedUser = JSON.parse(cachedUserStr);
            console.log('[AUTH] Restoring cached user:', cachedUser.email);
            setUser(cachedUser);
          } catch (e) {
            console.warn('[AUTH] Failed to parse cached user');
          }
        }
        
        if (cachedOrgId) {
          console.log('[AUTH] Restoring cached organization:', cachedOrgId);
          setOrganizationId(cachedOrgId);
        }
        
        if (cachedSessionStr) {
          try {
            const cachedSession = JSON.parse(cachedSessionStr);
            console.log('[AUTH] Restoring cached session');
            setSession(cachedSession);
          } catch (e) {
            console.warn('[AUTH] Failed to parse cached session');
          }
        }
        
        // If we have cached data, we can stop loading immediately
        if (cachedUserStr && cachedOrgId) {
          console.log('[AUTH] Using cached auth state - app ready');
          setLoading(false);
        }
      } catch (e) {
        console.warn('[AUTH] Failed to restore cached state:', e);
      }
    };

    // Start restoring cached data immediately
    restoreCachedState();

    const resolveOrganizationId = async (userId: string, userMetadata?: any): Promise<string | null> => {
      try {
        // 0. CACHE CHECK: Return cached org if same user
        const cachedUserId = await AsyncStorage.getItem(CACHED_ORG_USER_KEY);
        const cachedOrgId = await AsyncStorage.getItem(CACHED_ORG_KEY);
        
        if (cachedUserId === userId && cachedOrgId) {
          console.log('[AUTH] Organization from cache (same user):', cachedOrgId);
          return cachedOrgId;
        }

        // 1. FAST PATH: Check user metadata first
        if (userMetadata?.organization_id) {
          console.log('[AUTH] Organization from metadata:', userMetadata.organization_id);
          await AsyncStorage.setItem(CACHED_ORG_KEY, userMetadata.organization_id);
          await AsyncStorage.setItem(CACHED_ORG_USER_KEY, userId);
          return userMetadata.organization_id;
        }

        console.log('[AUTH] Resolving organization from DB for user:', userId);
        
        // 2. DB PATH: Query organization
        try {
          const { data, error } = await supabase
            .from('app_user_organizations')
            .select('organization_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          
          if (!error && (data as any)?.organization_id) {
            const orgId = (data as any).organization_id as string;
            console.log('[AUTH] Organization from DB:', orgId);
            await AsyncStorage.setItem(CACHED_ORG_KEY, orgId);
            await AsyncStorage.setItem(CACHED_ORG_USER_KEY, userId);
            return orgId;
          }
        } catch (e) {
          console.warn('[AUTH] DB query failed:', e);
          if (cachedOrgId) {
            console.log('[AUTH] Using stale cache after DB failure');
            return cachedOrgId;
          }
        }

        // 3. FALLBACK: Try without is_active filter
        try {
          const { data: anyData, error: anyError } = await supabase
            .from('app_user_organizations')
            .select('organization_id')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!anyError && (anyData as any)?.organization_id) {
            const resolvedOrgId = (anyData as any).organization_id as string;
            console.log('[AUTH] Organization from fallback query:', resolvedOrgId);
            await AsyncStorage.setItem(CACHED_ORG_KEY, resolvedOrgId);
            await AsyncStorage.setItem(CACHED_ORG_USER_KEY, userId);
            return resolvedOrgId;
          }
        } catch (e) {
          console.error('[AUTH] Fallback query failed:', e);
        }

        return null;
      } catch (error) {
        console.error('Failed to resolve organization id:', error);
        return null;
      }
    };

    // Background refresh of session - update cache if successful
    const refreshSessionInBackground = async () => {
      try {
        console.log('[AUTH] Background session refresh starting...');
        const { data, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (error) {
          console.warn('[AUTH] Background session refresh error:', error.message);
          return;
        }
        
        if (data.session) {
          console.log('[AUTH] Background refresh got valid session');
          setSession(data.session);
          setUser(data.session.user);
          
          // Update cache
          await AsyncStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(data.session));
          await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(data.session.user));
          
          const orgId = await resolveOrganizationId(data.session.user.id, data.session.user.user_metadata);
          if (isMounted && orgId) {
            setOrganizationId(orgId);
          }
        } else {
          console.log('[AUTH] No valid session from background refresh');
          // Only clear state if we didn't have cached data
          const hadCachedUser = await AsyncStorage.getItem(CACHED_USER_KEY);
          if (!hadCachedUser) {
            setSession(null);
            setUser(null);
            setOrganizationId(null);
          }
        }
        
        setLoading(false);
      } catch (e) {
        console.error('[AUTH] Background refresh exception:', e);
        setLoading(false);
      }
    };

    // Start background refresh after a small delay (let cached state render first)
    const refreshTimer = setTimeout(() => {
      refreshSessionInBackground();
    }, 100);

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        
        console.log('[AUTH] Auth state changed:', event);
        
        if (session) {
          setSession(session);
          setUser(session.user);
          
          // Cache the session and user immediately (non-blocking)
          AsyncStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(session));
          AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(session.user));
          
          // Set loading false IMMEDIATELY when we have a session
          // Don't wait for org resolution - we'll update it when ready
          setLoading(false);
          
          // Resolve org in background (non-blocking)
          resolveOrganizationId(session.user.id, session.user.user_metadata)
            .then((orgId) => {
              if (isMounted && orgId) {
                console.log('[AUTH] Organization resolved (async):', orgId);
                setOrganizationId(orgId);
              }
            })
            .catch((e) => console.error('[AUTH] Org resolution failed:', e));
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
          setOrganizationId(null);
          setLoading(false);
          AsyncStorage.multiRemove([
            CACHED_ORG_KEY, 
            CACHED_ORG_USER_KEY, 
            CACHED_SESSION_KEY,
            CACHED_USER_KEY,
          ]);
        }
      }
    );

    return () => {
      isMounted = false;
      clearTimeout(refreshTimer);
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signUp = async (email: string, password: string, userData: any) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Clear all cached data
      await AsyncStorage.multiRemove([
        CACHED_ORG_KEY, 
        CACHED_ORG_USER_KEY, 
        CACHED_SESSION_KEY,
        CACHED_USER_KEY,
        'hasSession'
      ]);
      setOrganizationId(null);
      setSession(null);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);

      if (error) throw error;

      return { error: null };
    } catch (error: any) {
      return { error };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        organizationId,
        loading,
        signIn,
        signUp,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
