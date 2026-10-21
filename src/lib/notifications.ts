import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from './supabase';

// Bildirimler: satırları sunucu tetikleyicileri yazar (ortak/supabase/migrations/20261019130000_notifications.sql);
// burada iPhone/iPad'in Apple (APNs) cihaz anahtarı kaydedilir ve uygulama açıkken gelen bildirim gösterilir.
// Gönderimi Supabase Edge Function push-apns yapar (ortak/supabase/functions/push-apns, konu com.clinicapp.uzman).
// ParentApp'in src/lib/notifications.ts dosyasıyla aynı; yalnız uygulama 'clinic'.
const TOKEN_KEY = 'push-token';
const OFF_KEY = 'push-off'; // uzman cihaza bildirimi kapattıysa '1'

export type AppNotification = {
  id: number; kind: string; title: string; body: string; data: Record<string, any>;
  childId?: string; createdAt: string; readAt?: string;
};

export const toNotification = (r: any): AppNotification => ({
  id: r.id, kind: r.kind, title: r.title, body: r.body ?? '', data: r.data ?? {},
  childId: r.child_id ?? undefined, createdAt: r.created_at, readAt: r.read_at ?? undefined,
});

// Bildirimin ilgilendirdiği çocuklar: tek çocukta child_id, toplu paylaşım / zor anda data.links / data.items
export function notificationChildren(n: Pick<AppNotification, 'childId' | 'data'>): string[] {
  const ids = new Set<string>();
  if (n.childId) ids.add(n.childId);
  if (typeof n.data?.child_id === 'string') ids.add(n.data.child_id);
  for (const key of ['links', 'items']) {
    const list = n.data?.[key];
    if (Array.isArray(list)) list.forEach((x) => { if (typeof x?.child_id === 'string') ids.add(x.child_id); });
  }
  return [...ids];
}

// Uygulama açıkken de üstte göster
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: true,
    }),
  });
}

export async function pushEnabled() {
  return (await AsyncStorage.getItem(OFF_KEY)) !== '1';
}

// Girişten sonra çağrılır: izin ister, anahtarı sunucuya kaydeder. Hata uygulamayı durdurmaz.
export async function registerForPush(): Promise<'ok' | 'denied' | 'off' | 'unavailable'> {
  if (Platform.OS === 'web') return 'unavailable';
  if (!(await pushEnabled())) return 'off';
  try {
    let { status } = await Notifications.getPermissionsAsync();
    if (status !== 'granted') ({ status } = await Notifications.requestPermissionsAsync());
    if (status !== 'granted') return 'denied';
    const { data: token } = await Notifications.getDevicePushTokenAsync();
    if (typeof token !== 'string' || !token) return 'unavailable';
    const { error } = await supabase.rpc('register_push_token', { p_token: token, p_app: 'clinic', p_platform: Platform.OS });
    if (error) throw error;
    await AsyncStorage.setItem(TOKEN_KEY, token);
    return 'ok';
  } catch (e) {
    console.warn('Push kaydı yapılamadı', e);
    return 'unavailable';
  }
}

// Çıkışta ya da uzman kapatınca: bu cihaza artık push gitmez (uygulama içi liste sürer)
export async function unregisterPush() {
  const token = await AsyncStorage.getItem(TOKEN_KEY);
  if (!token) return;
  await supabase.rpc('unregister_push_token', { p_token: token });
  await AsyncStorage.removeItem(TOKEN_KEY);
}

export async function setPushEnabled(on: boolean) {
  if (on) {
    await AsyncStorage.removeItem(OFF_KEY);
    return registerForPush();
  }
  await AsyncStorage.setItem(OFF_KEY, '1');
  await unregisterPush();
  return 'off' as const;
}

export async function setBadge(n: number) {
  if (Platform.OS === 'web') return;
  try { await Notifications.setBadgeCountAsync(n); } catch { /* izin yoksa önemsiz */ }
}

// Bildirime (telefonda) dokununca: data.kind'a göre hangi ekran açılacak
export function onNotificationTap(handler: (data: Record<string, any>) => void) {
  if (Platform.OS === 'web') return () => {};
  const seen = new Set<string>();
  const handle = (r: Notifications.NotificationResponse | null) => {
    if (!r || seen.has(r.notification.request.identifier)) return;
    seen.add(r.notification.request.identifier);
    handler(r.notification.request.content.data ?? {});
  };
  Notifications.getLastNotificationResponseAsync().then(handle).catch(() => {});
  const sub = Notifications.addNotificationResponseReceivedListener(handle);
  return () => sub.remove();
}
