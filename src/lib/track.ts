import { AppState, Platform } from 'react-native';
import * as Application from 'expo-application';
import Constants from 'expo-constants';
import { supabase } from './supabase';

// Birinci taraf kullanım kaydı (ortak/sozlesme/akislar.md 9): oturum + olaylar sunucuya, üçüncü taraf SDK yok.
// Olaylarda kişisel veri ya da serbest metin YOK: yalnız ekran/eylem adı ve küçük alanlar (sekme, tür, sayı).
// Sunucu fonksiyonları henüz yoksa sessizce vazgeçer; uygulamayı asla durdurmaz.
const APP = 'clinic';
const platform = Platform.OS === 'ios' || Platform.OS === 'android' ? Platform.OS : 'web';
const version = Application.nativeApplicationVersion
  ? `${Application.nativeApplicationVersion} (${Application.nativeBuildVersion ?? '?'})`
  : Constants.expoConfig?.version ?? null;

type Ev = { event: string; props?: Record<string, string | number | boolean>; at: string; session_id: string };

const uuid = () => 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
  const r = (Math.random() * 16) | 0;
  return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
});

let session = uuid();
let queue: Ev[] = [];
let off = false; // sunucuda fonksiyon yoksa bu oturumda bir daha deneme
let started = false;

export function track(event: string, props?: Ev['props']) {
  if (off) return;
  queue.push({ event, props, at: new Date().toISOString(), session_id: session });
  if (queue.length >= 20) flush();
}

export async function flush() {
  if (off || !queue.length) return;
  // Oturum yoksa (çıkış / hesap silme) gönderilmez; sunucu zaten reddeder
  if (!(await supabase.auth.getSession()).data.session) { queue = []; return; }
  const batch = queue.splice(0, 50);
  const { error } = await supabase.rpc('track_events', { p_app: APP, p_events: batch, p_platform: platform, p_version: version });
  if (error && (error.code === 'PGRST202' || error.code === '42883')) off = true;
}

async function session_ping() {
  if (off) return;
  const { error } = await supabase.rpc('track_session', { p_app: APP, p_platform: platform, p_version: version });
  if (error && (error.code === 'PGRST202' || error.code === '42883')) off = true;
}

// Giriş yapıldığında bir kez: oturum sayımı, 20 sn'de bir toplu gönderim, arka plana geçince gönder
export function startTracking() {
  if (started) return () => {};
  started = true;
  off = false;
  session_ping();
  track('app.open');
  const timer = setInterval(flush, 20_000);
  const sub = AppState.addEventListener('change', (s) => {
    if (s === 'active') { session = uuid(); session_ping(); track('app.open'); }
    else flush();
  });
  return () => { flush(); clearInterval(timer); sub.remove(); started = false; };
}
