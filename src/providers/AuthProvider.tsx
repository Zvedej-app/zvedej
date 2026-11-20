import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, type Session } from '../lib/api';
import type { Profile } from '../lib/types';

interface Ctx {
  session: Session | null;
  profile: Profile | null;
  ready: boolean;
  refreshProfile: () => Promise<void>;
  saveProfile: (patch: Partial<Profile>) => Promise<Profile>;
}

const AuthContext = createContext<Ctx | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  const loadProfile = useCallback(async (s: Session | null) => {
    if (!s) {
      setProfile(null);
      return;
    }
    try {
      setProfile(await api.getProfile(s.userId));
    } catch {
      // offline – profil se načte později
    }
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .getSession()
      .then(async (s) => {
        if (!alive) return;
        setSession(s);
        await loadProfile(s);
      })
      .finally(() => alive && setReady(true));
    const off = api.onAuthChange((s) => {
      setSession((prev) => {
        if (prev?.userId !== s?.userId) loadProfile(s);
        return s;
      });
    });
    return () => {
      alive = false;
      off();
    };
  }, [loadProfile]);

  const value = useMemo<Ctx>(
    () => ({
      session,
      profile,
      ready,
      refreshProfile: () => loadProfile(session),
      saveProfile: async (patch) => {
        if (!session) throw new Error('not signed in');
        const p = await api.updateProfile(session.userId, patch);
        setProfile(p);
        return p;
      },
    }),
    [session, profile, ready, loadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const c = useContext(AuthContext);
  if (!c) throw new Error('useAuth outside provider');
  return c;
}
