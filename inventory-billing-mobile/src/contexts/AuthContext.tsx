import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@lib/supabase';
import { AuthError, Session, User } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { startAutoSync, stopAutoSync } from '../services/sync';

const CACHED_ORG_KEY = 'cached_organization_id';
const CACHED_ORG_USER_KEY = 'cached_organization_user_id';
const CACHED_SESSION_KEY = 'cached_session_data';
const CACHED_USER_KEY = 'cached_user_data';

interface AuthContextType {
  session: Session | null;
  user: User | null;
  organizationId: string | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, userData: Record<string, unknown>) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function safeParse<T>(json: string | null): T | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

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
        
        const cachedUser = safeParse<User>(cachedUserStr);
        if (cachedUser) {
          console.warn('[AUTH] Restoring cached user:', cachedUser.email);
          setUser(cachedUser);
        }

        if (cachedOrgId) {
          console.warn('[AUTH] Restoring cached organization:', cachedOrgId);
          setOrganizationId(cachedOrgId);
        }

        const cachedSession = safeParse<Session>(cachedSessionStr);
        if (cachedSession) {
          console.warn('[AUTH] Restoring cached session');
          setSession(cachedSession);
        }

        if (cachedUser && cachedOrgId) {
          console.warn('[AUTH] Using cached auth state - app ready');
          setLoading(false);
        }
      } catch (e) {
        console.warn('[AUTH] Failed to restore cached state:', e);
      }
    };

    // Start restoring cached data immediately
    restoreCachedState();

    const resolveOrganizationId = async (
      userId: string,
      userMetadata?: Record<string, unknown>,
    ): Promise<string | null> => {
      try {
        const result = await resolveOrgIdInner(userId, userMetadata);
        if (result) return result;

        console.warn('[AUTH] Org resolution returned null, refreshing session and retrying...');
        await supabase.auth.refreshSession();
        return await resolveOrgIdInner(userId, userMetadata);
      } catch (error: unknown) {
        console.error('Failed to resolve organization id:', error);
        return null;
      }
    };

    const resolveOrgIdInner = async (
      userId: string,
      userMetadata?: Record<string, unknown>,
    ): Promise<string | null> => {
      const cachedUserId = await AsyncStorage.getItem(CACHED_ORG_USER_KEY);
      const cachedOrgId = await AsyncStorage.getItem(CACHED_ORG_KEY);

      if (cachedUserId === userId && cachedOrgId) {
        console.warn('[AUTH] Organization from cache (same user):', cachedOrgId);
        return cachedOrgId;
      }

      if (userMetadata?.organization_id) {
        const metaOrgId = String(userMetadata.organization_id);
        console.warn('[AUTH] Organization from metadata:', metaOrgId);
        await AsyncStorage.setItem(CACHED_ORG_KEY, metaOrgId);
        await AsyncStorage.setItem(CACHED_ORG_USER_KEY, userId);
        return metaOrgId;
      }

      console.warn('[AUTH] Resolving organization from DB for user:', userId);

      const dbResult = await queryOrgFromDb(userId, true, cachedOrgId);
      if (dbResult) return dbResult;

      const fallbackResult = await queryOrgFromDb(userId, false, null);
      return fallbackResult;
    };

    type OrgRow = { organization_id: string };

    const queryOrgFromDb = async (
      userId: string,
      filterActive: boolean,
      fallbackCacheValue: string | null,
    ): Promise<string | null> => {
      try {
        let query = supabase
          .from('app_user_organizations')
          .select('organization_id')
          .eq('user_id', userId);

        if (filterActive) {
          query = query.eq('is_active', true);
        }

        const { data, error } = await query
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('[AUTH] Org DB query error:', error.message, error.code);
          if (fallbackCacheValue) return fallbackCacheValue;
          return null;
        }

        const row = data as OrgRow | null;
        if (row?.organization_id) {
          console.warn('[AUTH] Organization from DB:', row.organization_id);
          await AsyncStorage.setItem(CACHED_ORG_KEY, row.organization_id);
          await AsyncStorage.setItem(CACHED_ORG_USER_KEY, userId);
          return row.organization_id;
        }

        console.warn('[AUTH] No org row found, user:', userId, 'active:', filterActive);
        return null;
      } catch (dbErr: unknown) {
        console.error('[AUTH] DB query exception:', dbErr);
        if (fallbackCacheValue) return fallbackCacheValue;
        return null;
      }
    };

    const applySession = async (activeSession: Session) => {
      setSession(activeSession);
      setUser(activeSession.user);
      await AsyncStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(activeSession));
      await AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(activeSession.user));
      const orgId = await resolveOrganizationId(
        activeSession.user.id,
        activeSession.user.user_metadata as Record<string, unknown>,
      );
      if (isMounted && orgId) {
        setOrganizationId(orgId);
      } else if (isMounted) {
        console.warn('[AUTH] Organization could not be resolved');
      }
    };

    const getValidSession = async (): Promise<Session | null> => {
      const { data, error } = await supabase.auth.refreshSession();
      if (!error && data?.session) return data.session;
      console.warn('[AUTH] refreshSession failed, trying getSession...');
      const { data: fallback } = await supabase.auth.getSession();
      return fallback.session ?? null;
    };

    const refreshSessionInBackground = async () => {
      try {
        console.warn('[AUTH] Background session refresh starting...');
        const validSession = await getValidSession();
        if (!isMounted) return;

        if (validSession) {
          await applySession(validSession);
        } else {
          console.warn('[AUTH] No valid session available');
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
        
        console.warn('[AUTH] Auth state changed:', event);

        if (session) {
          setSession(session);
          setUser(session.user);

          AsyncStorage.setItem(CACHED_SESSION_KEY, JSON.stringify(session));
          AsyncStorage.setItem(CACHED_USER_KEY, JSON.stringify(session.user));

          setLoading(false);

          resolveOrganizationId(
            session.user.id,
            session.user.user_metadata as Record<string, unknown>,
          )
            .then((orgId) => {
              if (isMounted && orgId) {
                console.warn('[AUTH] Organization resolved (async):', orgId);
                setOrganizationId(orgId);
              } else if (isMounted) {
                console.warn('[AUTH] Org resolution returned null after auth state change:', event);
              }
            })
            .catch((e: unknown) => console.error('[AUTH] Org resolution failed:', e));
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

  useEffect(() => {
    if (organizationId) {
      startAutoSync(organizationId);
    }
    return () => {
      stopAutoSync();
    };
  }, [organizationId]);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error: unknown) {
      return { error: error as AuthError };
    }
  };

  const signUp = async (email: string, password: string, userData: Record<string, unknown>) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: userData,
        },
      });

      if (error) throw error;

      return { error: null };
    } catch (error: unknown) {
      return { error: error as AuthError };
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
    } catch (error: unknown) {
      return { error: error as AuthError };
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
