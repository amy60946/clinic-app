import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { supabase } from './supabase';
import { versionLess } from './version';

// Uzaktan uygulama ayarı (ortak/sozlesme/admin.md "client_config"): yönetim panelinden en düşük sürüm,
// bakım modu, duyuru bandı ve özellik bayrakları. Açılışta ve uygulama ön plana gelince okunur.
// Sunucu fonksiyonu yoksa ya da okunamazsa uygulama hiçbir şey olmamış gibi çalışır.
export type ClientConfig = {
  minVersion: string | null;
  maintenance: boolean;
  banner: string | null;
  flags: Record<string, boolean>;
};

const EMPTY: ClientConfig = { minVersion: null, maintenance: false, banner: null, flags: {} };

export const appVersion = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0';

type Ctx = ClientConfig & { needsUpdate: boolean; flag: (key: string) => boolean; reload: () => Promise<void> };
const C = createContext<Ctx>({ ...EMPTY, needsUpdate: false, flag: () => false, reload: async () => {} });

export function ClientConfigProvider({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = useState<ClientConfig>(EMPTY);

  const reload = useCallback(async () => {
    const { data, error } = await supabase.rpc('client_config', { p_app: 'clinic' });
    if (error || !data) return; // eski sunucu ya da ağ yok: son bilinen ayar kalır
    const app = (data as any).app ?? {};
    setCfg({
      minVersion: typeof app.min_version === 'string' ? app.min_version : null,
      maintenance: app.maintenance === true,
      banner: typeof app.banner === 'string' && app.banner.trim() ? app.banner.trim() : null,
      flags: (data as any).flags ?? {},
    });
  }, []);

  useEffect(() => {
    reload();
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') reload(); });
    // Web: sekmeye geri dönülünce
    const onVisible = () => { if (document.visibilityState === 'visible') reload(); };
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload]);

  const needsUpdate = !!cfg.minVersion && versionLess(appVersion, cfg.minVersion);
  const flag = useCallback((key: string) => cfg.flags[key] === true, [cfg.flags]);
  return <C.Provider value={{ ...cfg, needsUpdate, flag, reload }}>{children}</C.Provider>;
}

export const useClientConfig = () => useContext(C);
