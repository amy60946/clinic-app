import 'react-native-url-polyfill/auto';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

// Değerler proje kökündeki .env dosyasından gelir (bkz. .env.example).
// Gerçek anahtarları koda veya depoya yazma.
const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const isSupabaseConfigured = !!url && !!key;

if (!isSupabaseConfigured) {
  console.warn('Supabase ayarlı değil: .env içinde EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_KEY tanımla.');
}

export const supabase = createClient(url ?? 'https://ayarlanmadi.supabase.co', key ?? 'ayarlanmadi', {
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

