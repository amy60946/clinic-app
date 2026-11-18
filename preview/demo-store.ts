// Önizleme (web) için deneme mağazası: src/lib/store.ts'in yerine kopyalanır (preview/build.sh). Gerçek App Store'a
// bağlanmaz, satın alma yok. `cancel_flow` bayrağını denemek için App Store aboneliğinin durumunu TAKLİT eder:
// varsayılan Klinik · Aylık, kendiliğinden yenileniyor (sunucudaki deneme hesabı deneme süresinde kalır; yalnız
// "Aboneliği yönet" penceresi ve mağaza kartları bu taklide bakar). Durum tarayıcı deposundaki `demo.membership` JSON'undan:
//   { "plan": "clinic" | "solo" | "none", "period": "monthly" | "yearly", "state": "active" | "cancelled" | "billing" }
// Konsoldan: onizlemeUyelik('iptal') · onizlemeUyelik('odeme') · onizlemeUyelik('etkin', 'bireysel', 'yillik') · onizlemeUyelik() (sıfırla)
import type { StorePrices, StoreResult, StoreSubscription } from './storeTypes';

export const storeKind: 'web' | 'app_store' = 'web';
export const storeEnabled = false;
export const storePreview = true;
export const MANAGE_URL = 'https://apps.apple.com/account/subscriptions';

export async function storeLogOut(): Promise<void> {}
export async function storePrices(_userId: string, _productIds: string[]): Promise<StorePrices | null> { return null; }
export async function storePurchase(_userId: string, _productId: string, _clinicId: string): Promise<StoreResult> { return { ok: false, reason: 'not_connected' }; }
export async function storeRestore(_userId: string, _clinicId: string): Promise<StoreResult> { return { ok: false, reason: 'not_connected' }; }
export async function storeManage(_userId: string): Promise<void> {}
export async function storeOpenSubscriptions(_userId: string): Promise<boolean> { return false; }

const KEY = 'demo.membership';
type Demo = { plan?: 'clinic' | 'solo' | 'none'; period?: 'monthly' | 'yearly'; state?: 'active' | 'cancelled' | 'billing' };
const day = (n: number) => { const d = new Date(Date.now() + n * 864e5); d.setHours(12, 0, 0, 0); return d.toISOString(); };

export async function storeSubscription(_userId: string, _fresh = false): Promise<StoreSubscription | null> {
  let d: Demo = {};
  try { d = JSON.parse(localStorage.getItem(KEY) || '{}') ?? {}; } catch { /* varsayılan */ }
  if (d.plan === 'none') return null;
  const period = d.period === 'yearly' ? 'yearly' : 'monthly';
  return {
    productId: `com.clinicapp.uzman.${d.plan === 'solo' ? 'solo' : 'clinic'}.${period}`,
    willRenew: d.state !== 'cancelled',
    expiresAt: day(period === 'yearly' ? 143 : 20),
    billingIssueAt: d.state === 'billing' ? day(-2) : null,
  };
}

(globalThis as any).onizlemeUyelik = (state?: string, plan?: string, period?: string) => {
  const d: Demo = {
    state: state === 'iptal' ? 'cancelled' : state === 'odeme' ? 'billing' : 'active',
    plan: plan === 'bireysel' ? 'solo' : plan === 'yok' ? 'none' : 'clinic',
    period: period === 'yillik' ? 'yearly' : 'monthly',
  };
  try { if (state === undefined) localStorage.removeItem(KEY); else localStorage.setItem(KEY, JSON.stringify(d)); } catch { /* yok say */ }
  location.reload();
};
