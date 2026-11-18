import { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, Platform } from 'react-native';
import * as store from './store';
import type { StoreSubscription } from './storeTypes';

// App Store aboneliğinin mağazadaki durumu (yenileme kapatıldı mı, ödeme alınamadı mı): yalnız klinik sahibinde ve
// `cancel_flow` bayrağı açıkken okunur (üyelik ekranı + ana ekrandaki tek satır). Uygulama ön plana gelince yenilenir
// (kullanıcı Apple'ın sayfasından ya da Ayarlar'dan dönmüş olabilir). Web'de ve abonelik yokken null.
export function useStoreSubscription(userId: string | null, on: boolean) {
  const [sub, setSub] = useState<StoreSubscription | null>(null);
  const refresh = useCallback(async (fresh = false) => {
    if (!userId || !on) { setSub(null); return; }
    setSub(await store.storeSubscription(userId, fresh).catch(() => null));
  }, [userId, on]);
  useEffect(() => {
    refresh();
    if (!userId || !on) return;
    const s = AppState.addEventListener('change', (st) => { if (st === 'active') refresh(true); });
    return () => s.remove();
  }, [refresh, userId, on]);
  return { sub, refresh };
}

// Apple'ın abonelik sayfası (iptal, sürdürme, ödeme yöntemi). Uygulama içi sayfa açılamıyorsa App Store abonelikler adresi.
export async function openAppleSubscriptions(userId: string): Promise<void> {
  if (await store.storeOpenSubscriptions(userId)) return;
  if (Platform.OS === 'web' && typeof window !== 'undefined') { window.open(store.MANAGE_URL, '_blank', 'noopener'); return; }
  await Linking.openURL(store.MANAGE_URL).catch(() => {});
}
