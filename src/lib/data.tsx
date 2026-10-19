import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { overview, Overview } from './api';
import { useAuth } from './auth';

// Danışan listesi + görev kayıtları (tüm ekranlar ortak kullanır)
type Data = Overview & { ready: boolean; refresh: () => Promise<void> };
const Ctx = createContext<Data | null>(null);

export function DataProvider({ children }: { children: React.ReactNode }) {
  const { me } = useAuth();
  const [data, setData] = useState<Overview>({ clients: [], tasks: [], comps: [] });
  const [ready, setReady] = useState(false);

  const refresh = useCallback(async () => {
    if (!me) return;
    try { setData(await overview(me.clinicId)); } catch { /* bağlantı yoksa eldeki veri kalır */ }
    setReady(true);
  }, [me]);

  useEffect(() => { refresh(); }, [refresh]);
  // Uygulamaya dönünce (ör. aile yeni bir kodu onayladıktan sonra) tazele
  useEffect(() => {
    const s = AppState.addEventListener('change', (st) => { if (st === 'active') refresh(); });
    return () => s.remove();
  }, [refresh]);

  return <Ctx.Provider value={{ ...data, ready, refresh }}>{children}</Ctx.Provider>;
}

export const useData = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('DataProvider eksik');
  return v;
};

export const ageOf = (birthday?: string) => {
  if (!birthday) return null;
  const b = new Date(birthday), n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return a;
};
