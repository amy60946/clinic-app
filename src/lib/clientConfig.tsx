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

// Takip Planı bayrağı (lansman odağı "A", kullanıcı kararı 11 Kasım 2026): açık değilse ClinicApp'te Takip Planı menüde yok,
// tek plan ekranı Ebeveyn Eğitimi'dir (ortak sozlesme/admin.md bayrak listesi). Verisi durur; bayrak açılınca geri gelir.
export const CARE_PLAN_FLAG = 'care_plan';
// Ebeveyn eğitimi bayrağı (kullanıcı kararı 23 Kasım 2026): açık değilse Ebeveyn Eğitimi bölümü, Kaynak kütüphanesi (alt menü dahil),
// Başlarken'deki eğitim maddeleri, eğitim turu, "Senin sıran"daki eğitim nedenleri ve seans kaydındaki "Ebeveyn Eğitimi'ni aç" görünmez;
// danışan sayfası Ev rutinleri ile açılır. Verisi durur; sunucu da bu bayrakla eğitim hatırlatmalarını susturur (ortak admin.md).
export const PARENT_TRAINING_FLAG = 'parent_training';
// Kayıt türü çoklu seçim bayrağı (kullanıcı kararı 23 Kasım 2026; ortak akislar.md 27.3): açık değilse hedef davranış formunda
// tek kayıt türü seçilir (yine log_types: [tür] yazılır). Eski Moyo çok türlü davranışa olay gönderemediği için Moyo güncellenince açılır.
export const BEHAVIOR_LOG_TYPES_FLAG = 'behavior_log_types';

const EMPTY: ClientConfig = { minVersion: null, maintenance: false, banner: null, flags: {} };

export const appVersion = Application.nativeApplicationVersion ?? Constants.expoConfig?.version ?? '0';

// status: ilk okuma sürüyor ('loading') · en az bir kez okundu ('ok') · okunamadı ('failed': eski sunucu, ağ yok ya da 5 sn doldu).
// Bayrağın "kapalı" olduğu ancak 'ok' iken bilinir (bayrağa göre geri alınamaz bir iş yapanlar buna bakar).
export type ConfigStatus = 'loading' | 'ok' | 'failed';
type Ctx = ClientConfig & { needsUpdate: boolean; status: ConfigStatus; flag: (key: string) => boolean; reload: () => Promise<void> };
const C = createContext<Ctx>({ ...EMPTY, needsUpdate: false, status: 'failed', flag: () => false, reload: async () => {} });

export function ClientConfigProvider({ children }: { children: React.ReactNode }) {
  const [cfg, setCfg] = useState<ClientConfig>(EMPTY);
  const [status, setStatus] = useState<ConfigStatus>('loading');

  const reload = useCallback(async () => {
    const { data, error } = await supabase.rpc('client_config', { p_app: 'clinic' }).then((r) => r, () => ({ data: null, error: true }));
    if (error || !data) { setStatus((s) => (s === 'ok' ? s : 'failed')); return; } // eski sunucu ya da ağ yok: son bilinen ayar kalır
    setStatus('ok');
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
    const slow = setTimeout(() => setStatus((s) => (s === 'loading' ? 'failed' : s)), 5000);   // ağ yanıt vermiyorsa bekleyenler takılmasın
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') reload(); });
    // Web: sekmeye geri dönülünce
    const onVisible = () => { if (document.visibilityState === 'visible') reload(); };
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearTimeout(slow);
      sub.remove();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [reload]);

  const needsUpdate = !!cfg.minVersion && versionLess(appVersion, cfg.minVersion);
  const flag = useCallback((key: string) => cfg.flags[key] === true, [cfg.flags]);
  return <C.Provider value={{ ...cfg, needsUpdate, status, flag, reload }}>{children}</C.Provider>;
}

export const useClientConfig = () => useContext(C);
