import { useEffect, useState } from 'react';
import { Platform, Linking, Alert } from 'react-native';
import { supabase } from './supabase';

// Yasal metinler, onay kaydı, KVKK başvurusu (ortak/sozlesme/akislar.md 17, proposed/20261027200000_legal.sql;
// metinler ortak/hukuk, ekran metinleri hukuk/50-uygulama-ici-metinler.md). Sunucuda yoksa (PGRST202) hiçbiri görünmez.
export type LegalDoc = {
  key: string; version: string; title: string; status: 'draft' | 'published' | 'retired'; summary: string | null;
  requires_acceptance: boolean; published_at: string | null; accepted_at: string | null;
};
type PublicDoc = { key: string; version: string; title: string; status: string; apps: string[] };

// Kayıtta onaylanan metinler. Aydınlatma onay değildir (kutusuz satır); gösterildiği aynı çağrıyla kaydedilir.
export const SIGNUP_KEYS = ['sozlesme-uzman', 'veri-isleme-eki', 'aydinlatma-uzman'];
export const isNotice = (key: string) => key.startsWith('aydinlatma');
// Ayarlar › Yasal metinler sırası (hukuk/50 bölüm 3); çerez politikası yalnız web'de
const ORDER = ['sozlesme-uzman', 'veri-isleme-eki', 'aydinlatma-uzman', 'gizlilik', 'alt-isleyenler', 'kvkk-basvuru', 'cerez-clinicapp-web'];
const shown = (key: string) => Platform.OS === 'web' || key !== 'cerez-clinicapp-web';
const rank = (key: string) => (ORDER.indexOf(key) + 1 || 99);

const missing = (e: { code?: string } | null) => e?.code === 'PGRST202' || e?.code === '42883' || e?.code === 'PGRST205';

// Herkese açık metin adresi: Edge Function `legal` (alan adı alınınca EXPO_PUBLIC_LEGAL_URL ile kendi adresimize)
const BASE = process.env.EXPO_PUBLIC_LEGAL_URL
  || (process.env.EXPO_PUBLIC_SUPABASE_URL ? `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/legal` : '');
export const legalUrl = (key: string, version?: string) => `${BASE}?doc=${key}${version ? `&v=${version}` : ''}`;

export function openLegal(key: string, version?: string) {
  if (!BASE) return Alert.alert('Metin açılamadı', 'Yasal metin adresi ayarlı değil.');
  const url = legalUrl(key, version);
  if (Platform.OS === 'web' && typeof window !== 'undefined') window.open(url, '_blank', 'noopener');
  else Linking.openURL(url).catch(() => Alert.alert('Metin açılamadı', 'İnternet bağlantını kontrol et.'));
}

// Oturumsuz (kayıt ekranı, çerez bandı): `legal` işlevinin listesi. İşlev yayında değilse null → eski davranış.
let publicList: Promise<PublicDoc[] | null> | null = null;
export function publicLegal(): Promise<PublicDoc[] | null> {
  publicList ??= supabase.functions.invoke('legal?format=json', { method: 'GET' })
    .then(({ data, error }) => (!error && Array.isArray(data) && data.length ? (data as PublicDoc[]) : null))
    .catch(() => null)
    .then((list) => { if (!list) publicList = null; return list; });   // olmadıysa sonraki açılışta yeniden sorulur
  return publicList;
}

// Yasal metin adresi yayında mı (bağlantılar yalnız o zaman gösterilir)
export function useLegalOn(): boolean {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let live = true;
    publicLegal().then((l) => { if (live) setOn(!!l); });
    return () => { live = false; };
  }, []);
  return on;
}

// Kayıtta işaretlenen sürümler (kayıt bilgisine yazılır; ilk girişte legal_accept ile kaydedilir)
export async function signupVersions(): Promise<Record<string, string> | null> {
  const list = await publicLegal();
  const docs = (list ?? []).filter((d) => d.apps?.includes('clinic') && SIGNUP_KEYS.includes(d.key));
  return docs.some((d) => !isNotice(d.key)) ? Object.fromEntries(docs.map((d) => [d.key, d.version])) : null;
}

export async function legalDocuments(): Promise<LegalDoc[] | null> {
  const { data, error } = await supabase.rpc('legal_documents_for', { p_app: 'clinic' });
  if (missing(error)) return null;
  if (error) throw new Error(error.message);
  return ((data ?? []) as LegalDoc[]).filter((d) => shown(d.key)).sort((a, b) => rank(a.key) - rank(b.key));
}

// Açılışta: onay bekleyenler. Kayıtta işaretlenen sürümler önce sessizce kaydedilir; kalanlar yeniden onay ekranında.
// null: sunucuda yok ya da ulaşılamadı (kullanıcı bekletilmez)
export async function legalPending(signed?: unknown): Promise<LegalDoc[] | null> {
  const { data, error } = await supabase.rpc('legal_pending', { p_app: 'clinic' });
  if (error) return null;
  let pending = (data ?? []) as LegalDoc[];
  const meta = signed && typeof signed === 'object' ? (signed as Record<string, unknown>) : {};
  const ok = pending.filter((d) => meta[d.key] === d.version);
  if (ok.length) {
    const left = await acceptLegal(ok).catch(() => null);
    if (left) pending = left;
  }
  return pending.sort((a, b) => rank(a.key) - rank(b.key));
}

export async function acceptLegal(docs: Pick<LegalDoc, 'key' | 'version'>[]): Promise<LegalDoc[]> {
  const { data, error } = await supabase.rpc('legal_accept', { p_app: 'clinic', p_docs: docs.map(({ key, version }) => ({ key, version })) });
  if (error) throw new Error(error.message);
  return (data ?? []) as LegalDoc[];
}

/* ---------- KVKK başvurusu (hukuk/50 bölüm 4) ---------- */

export type KvkkKind = 'info' | 'access' | 'correct' | 'delete' | 'third_parties' | 'object' | 'damages' | 'other';
export const KVKK_KINDS: { kind: KvkkKind; label: string; hint?: string }[] = [
  { kind: 'info', label: 'Hakkımda hangi verileri, neden işlediğinizi öğrenmek' },
  { kind: 'access', label: 'Verilerimin bir kopyasını almak' },
  { kind: 'correct', label: 'Yanlış ya da eksik bir bilginin düzeltilmesi' },
  { kind: 'delete', label: 'Verilerimin silinmesi', hint: 'Hesabının tamamını silmek için Ayarlar\'daki "Hesabı sil" daha hızlıdır.' },
  { kind: 'third_parties', label: 'Verilerimin kimlere aktarıldığını öğrenmek' },
  { kind: 'object', label: 'Bir işlemeye itiraz etmek' },
  { kind: 'damages', label: 'Uğradığım bir zararın giderilmesi' },
  { kind: 'other', label: 'Başka bir talep' },
];
// Sunucuda açıklama zorunlu türler (kvkk_request_create)
export const KVKK_NEEDS_DETAIL: KvkkKind[] = ['correct', 'object', 'damages', 'other'];
export const KVKK_STATUS: Record<string, string> = {
  received: 'Alındı', in_progress: 'İnceleniyor', answered: 'Yanıtlandı', rejected: 'Gerekçeli yanıt verildi (e-postana bak)',
};
export type KvkkRequest = { id: string; kind: KvkkKind; status: string; received_at: string; due_at: string; answered_at: string | null };
export const kvkkNo = (id: string) => id.slice(0, 8).toUpperCase();

export async function myKvkkRequests(): Promise<KvkkRequest[] | null> {
  const { data, error } = await supabase.rpc('my_kvkk_requests');
  if (missing(error)) return null;
  if (error) throw new Error(error.message);
  return (data ?? []) as KvkkRequest[];
}

export async function createKvkkRequest(kind: KvkkKind, detail: string): Promise<{ id: string; due_at: string }> {
  const { data, error } = await supabase.rpc('kvkk_request_create', { p_app: 'clinic', p_kind: kind, p_detail: detail });
  if (missing(error)) throw new Error('Başvuru formu henüz açık değil.');
  if (error) throw new Error(error.message);
  return data as { id: string; due_at: string };
}
