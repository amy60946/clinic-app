import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { getWorkspace } from './workspace';

// Değerler proje kökündeki .env dosyasından gelir (bkz. .env.example).
// Gerçek anahtarları koda veya depoya yazma.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const isSupabaseConfigured = !!url && !!key;

if (!isSupabaseConfigured) {
  console.warn('Supabase ayarlı değil: .env içinde EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_KEY tanımla.');
}

// Seçili çalışma alanı (workspace.tsx) veritabanı isteklerine ve üyelik işlevine `x-clinic-id` başlığıyla eklenir.
// Öteki Edge Function'lar ve Storage başlığı almaz (tarayıcıda izin verilmeyen başlık isteği bozmasın).
const workspaceFetch: typeof fetch = (input, init) => {
  const ws = getWorkspace();
  const target = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url;
  if (!ws || !(target.includes('/rest/v1/') || target.includes('/functions/v1/clinic-billing'))) return fetch(input, init);
  const headers = new Headers(init?.headers ?? (typeof Request !== 'undefined' && input instanceof Request ? input.headers : undefined));
  headers.set('x-clinic-id', ws);
  return fetch(input, { ...init, headers });
};

export const supabase = createClient(url ?? 'https://ayarlanmadi.supabase.co', key ?? 'ayarlanmadi', {
  global: { fetch: workspaceFetch },
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    // E-posta bağlantıları ?code= ile gelir; kod yalnız bağlantıyı isteyen cihazda oturuma çevrilebilir
    // (başkasının bağlantısıyla sessizce onun hesabına girilemez).
    flowType: 'pkce',
  },
});

// Uygulama ön plandayken oturum yenilemesi açık, arka planda kapalı.
AppState.addEventListener('change', (state) => {
  if (state === 'active') supabase.auth.startAutoRefresh();
  else supabase.auth.stopAutoRefresh();
});

