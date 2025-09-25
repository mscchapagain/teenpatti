import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type User = { id: string; displayName: string };

type AuthCtx = {
  user: User | null;
  loading: boolean;
  signInGuest: (displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const Ctx = createContext<AuthCtx>({
  user: null,
  loading: true,
  signInGuest: async () => {},
  signOut: async () => {},
});

const STORAGE_KEY = 'auth:user';

function genId() {
  // Simple unique-ish id; replace with UUID later if desired
  return 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) setUser(JSON.parse(raw));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const signInGuest = async (displayName: string) => {
    const newUser = { id: genId(), displayName: displayName.trim() || 'Guest' } as User;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    setUser(newUser);
  };

  const signOut = async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setUser(null);
  };

  const value = useMemo(() => ({ user, loading, signInGuest, signOut }), [user, loading]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useAuth = () => useContext(Ctx);
