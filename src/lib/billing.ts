import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { ClinicianMe } from './clinic';

// Üyelik: ortak/supabase/migrations/20261022200000_clinic_billing.sql (paketler, durum) + functions/billing-webhook.
// Plan/süre yalnız sunucuda yazılır: App Store satın alması RevenueCat'ten webhook'la gelir (store.ios.ts),
// uygulama yalnız satın almayı başlatır ve sonra clinician_me'yi yeniden okur. Fiyat iOS'ta mağazadan okunur.

export type PackageId = 'solo' | 'clinic';
export type Period = 'monthly' | 'yearly';
export type BillingPlan = {
  id: string;
  package: PackageId;
  period: Period;
  seat_limit: number;
  price_try: number | null;   // sunucudaki katalog fiyatı (web'de gösterilir); iOS'ta fiyat mağazadan
  apple_product_id: string | null;
  iyzico_plan_ref: string | null;
};

// Paket tablosu okunamazsa gösterilecek katalog (fiyatsız: fiyat sabit yazılmaz, mağazadan ya da sunucudan gelir)
const DEFAULT_PLANS: BillingPlan[] = [
  { id: 'solo_monthly', package: 'solo', period: 'monthly', seat_limit: 1, price_try: null, apple_product_id: 'com.clinicapp.uzman.solo.monthly', iyzico_plan_ref: null },
  { id: 'solo_yearly', package: 'solo', period: 'yearly', seat_limit: 1, price_try: null, apple_product_id: 'com.clinicapp.uzman.solo.yearly', iyzico_plan_ref: null },
  { id: 'clinic_monthly', package: 'clinic', period: 'monthly', seat_limit: 10, price_try: null, apple_product_id: 'com.clinicapp.uzman.clinic.monthly', iyzico_plan_ref: null },
  { id: 'clinic_yearly', package: 'clinic', period: 'yearly', seat_limit: 10, price_try: null, apple_product_id: 'com.clinicapp.uzman.clinic.yearly', iyzico_plan_ref: null },
];

// Paket içerikleri (üyelik ekranında sade liste); yalnız ClinicApp'te gerçekten olanlar yazılır.
export const PACKAGES: Record<PackageId, { title: string; who: string; features: string[] }> = {
  solo: {
    title: 'Bireysel',
    who: 'Tek başına çalışan uzman için',
    features: [
      'Sınırsız danışan; aileler Moyo ile ücretsiz bağlanır',
      'Evdeki rutin verisi: maceralar, tamamlama, "Yapamam" nedenleri',
      'Hedef davranışlar ve ebeveynin bildirdiği olaylar',
      'Ebeveyn eğitimi: öğrenme modülleri, uygulama görevleri, hızlı yapılacaklar',
      'Aileye macera önerisi; karar ebeveynde',
      'Yazdırılabilir gözlem raporu (PDF)',
      'Yalnız sana görünen klinik notları (aile görmez)',
      'Yeni kayıt ve davranış kaydında anlık bildirim',
    ],
  },
  clinic: {
    title: 'Klinik',
    who: 'Ekiple çalışan klinikler için · 10 uzmana kadar',
    features: [
      'Bireysel paketteki her şey',
      '10 uzmana kadar ekip; uzmanı kişisel koduyla ekle',
      'Kliniğin bütün danışanları ortak listede',
      'Danışan başına sorumlu uzman ve ona giden bildirimler',
      'Ekip notları: herkes okur, yalnız yazarı değiştirir',
      'Tek üyelik, klinik sahibi yönetir',
    ],
  },
};

// Yıllıkta kaç ay hediye: fiyatlardan hesaplanır (fiyat değişince metin de değişir; bilinmiyorsa 0)
export function yearlyGift(monthly: number | null | undefined, yearly: number | null | undefined): number {
  if (!monthly || !yearly) return 0;
  return Math.max(0, Math.floor(12 - yearly / monthly + 0.05));
}

export const commonTerms = (gift: number) => [
  'İlk 14 gün ücretsiz, kart gerekmez',
  gift ? `Aylık ya da yıllık; yıllıkta ${gift} ay hediye` : 'Aylık ya da yıllık',
  'Dilediğin an iptal; dönem sonuna kadar açık kalır',
  'Veriler yalnız ebeveyn izniyle görünür; izin geri alınınca erişim biter',
];

export const tl = (n: number) =>
  `₺${n.toLocaleString('tr-TR', { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 })}`;

export async function listPlans(): Promise<BillingPlan[]> {
  const { data, error } = await supabase.from('billing_plans')
    .select('id, package, period, seat_limit, price_try, apple_product_id, iyzico_plan_ref').order('sort');
  if (error || !data?.length) return DEFAULT_PLANS;
  return (data as BillingPlan[]).map((p) => ({ ...p, price_try: p.price_try == null ? null : Number(p.price_try) }));
}

export type Status = 'trial' | 'active' | 'expired';
export function billingStatus(me: ClinicianMe): Status {
  if (me.status) return me.status;
  // eski sunucu (üyelik SQL'i uygulanmadan önce)
  if (me.plan === 'trial') return me.active ? 'trial' : 'expired';
  return me.active ? 'active' : 'expired';
}
export const hasAccess = (me: ClinicianMe) => me.access ?? me.active;

export function daysLeft(iso: string | null | undefined): number {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 86400e3));
}

export const packageName = (me: ClinicianMe) =>
  me.plan === 'solo' ? 'Bireysel' : me.plan === 'clinic' ? 'Klinik' : me.plan === 'trial' ? 'Deneme' : 'Kurumsal';

// Edge Function çağrısı (clinic-billing; bugün kullanılmıyor: iyzico yolu ileride kendi sisteme geçiş için duruyor)
async function call<T>(route: string, body: unknown): Promise<T> {
  const { data, error } = await supabase.functions.invoke(`clinic-billing/${route}`, { body: body as Record<string, unknown> });
  if (error) {
    let msg = error.message;
    if (error instanceof FunctionsHttpError) {
      msg = ((await error.context.json().catch(() => ({}))) as { error?: string }).error ?? msg;
    }
    throw new Error(msg === 'Failed to send a request to the Edge Function' ? 'Ödeme sunucusuna ulaşılamadı. İnternet bağlantını kontrol et.' : msg);
  }
  return data as T;
}

// Web ödemesi (iyzico): bugün kullanılmıyor — web'de satış yok (kullanıcı kararı 22 Ekim 2026)
export type Buyer = { name: string; surname: string; identityNumber: string; gsmNumber: string; city: string; address: string };
export const startWebCheckout = (planId: string, buyer: Buyer) =>
  call<{ token: string; checkoutFormContent: string }>('iyzico-start', { plan_id: planId, buyer });
export const cancelWeb = () => call<{ ok: boolean }>('iyzico-cancel', {});
