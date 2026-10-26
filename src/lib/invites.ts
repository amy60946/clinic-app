import { Platform, Share, Linking } from 'react-native';
import { supabase } from './supabase';

// Aile daveti (ortak/sozlesme/akislar.md 10): 3 gün geçerli; bağlantı (token) + yazılabilir 6 karakter kod aynı davettir.
// Ana yol sistem e-postası (Edge Function invite-email, ortak migrations/20261027000000_invite_email.sql); yedek: uzman kodu kopyalar.
// Bağlantı adresi alan adı alınınca EXPO_PUBLIC_INVITE_BASE_URL ile verilir (ör. https://alanadi.com/d/); yoksa mesajda yalnız kod.
const BASE = (process.env.EXPO_PUBLIC_INVITE_BASE_URL ?? '').replace(/\/?$/, '/');
export const HAS_BASE = !!process.env.EXPO_PUBLIC_INVITE_BASE_URL;
const PARENTAPP_STORE_URL = process.env.EXPO_PUBLIC_PARENTAPP_STORE_URL ?? '';

export type InviteStatus = 'sent' | 'opened' | 'claimed' | 'shared' | 'expired' | 'revoked' | 'declined';
export type FamilyInvite = {
  code: string; token: string | null; clinician_id: string; clinician: string; label: string;
  parent_name: string; parent_email: string | null; channel: string | null; status: InviteStatus;
  created_at: string; expires_at: string; opened_at: string | null; claimed_at: string | null; used_at: string | null;
  has_plan: boolean; child_name?: string | null; child_age_group?: ChildAgeGroup | null;
  // sistem e-postası (ortak 20261027000000); eski sunucuda yok
  email_status?: EmailStatus | null; email_count?: number; email_sent_at?: string | null;
};
export type EmailStatus = 'sending' | 'sent' | 'failed';
// Çocuk önerisi (ortak akislar.md 10): ad/takma ad + yaş grubu; yalnız daveti kabul eden ebeveyn görür, mesajda gitmez
export type ChildAgeGroup = 'K' | 'A' | 'B' | 'C';
export const CHILD_AGE_GROUPS: { id: ChildAgeGroup; label: string }[] = [
  { id: 'K', label: '5 ve altı' }, { id: 'A', label: '6–8' }, { id: 'B', label: '9–12' }, { id: 'C', label: '13+' },
];
export const ageGroupLabel = (g?: string | null) => CHILD_AGE_GROUPS.find((x) => x.id === g)?.label ?? '';
export type InviteInput = { label: string; parentName: string; parentEmail: string; childName: string; childAgeGroup: ChildAgeGroup | null };
export type NewInvite = { code: string; token: string | null; expires_at: string };
export type InviteStats = {
  clinician_id: string; clinician: string; sent: number; opened: number; claimed: number; shared: number; expired: number; open_now: number;
};
export type Channel = 'whatsapp' | 'email' | 'sms' | 'copy' | 'other';

// "i" açıklaması (ana ekran kartı ve davet penceresi)
export const INVITE_HELP = [
  'Davet e-postası senin adınla ebeveynin e-postasına gider; yanıtlarsa yanıtı sana gelir.',
  HAS_BASE
    ? 'Ebeveyn e-postadaki bağlantıdan ParentApp\'i yükleyip kayıt olur; sen kendiliğinden tanımlı gelirsin.'
    : 'Ebeveyn ParentApp\'e kayıt olunca açılan "Kodun var mı?" ekranına e-postadaki 6 karakterlik kodu yazar; sen kendiliğinden tanımlı gelirsin.',
  'Hangi çocuğu paylaşacağına ebeveyn karar verir; paylaşımı istediği an durdurabilir.',
  'Çocuğun adını ve yaş grubunu yazarsan yalnız daveti kabul eden ebeveyn görür; kontrol edip onaylar, düzeltirse sana bildirim gelir. E-postada görünmez, davet bitince silinir.',
  'Davet 3 gün geçerli. Davetlerim\'den e-postayı yeniden gönderebilir ya da daveti iptal edebilirsin. E-posta ulaşmazsa kodu kopyalayıp kendin ilet.',
  'İstersen takip planını davetle birlikte hazırla; aile çocuğu paylaşınca plan hazır gelir.',
];

export const STATUS_TEXT: Record<InviteStatus, string> = {
  sent: 'Gönderildi',
  opened: 'Bağlantı açıldı',
  claimed: 'Aile kayıt oldu',
  shared: 'Çocuk paylaşıldı',
  expired: 'Süresi doldu',
  revoked: 'İptal edildi',
  declined: 'Aile reddetti',
};

const missing = (e: { code?: string } | null) => e?.code === 'PGRST202' || e?.code === '42883';

export async function createInvite(i: InviteInput): Promise<NewInvite & { childSaved: boolean }> {
  const base = { p_kind: 'family', p_label: i.label.trim(), p_parent_name: i.parentName.trim(), p_parent_email: i.parentEmail.trim() || null };
  const r = await supabase.rpc('clinic_create_invite', { ...base, p_child_name: i.childName.trim(), p_child_age_group: i.childAgeGroup });
  if (!missing(r.error)) {
    if (r.error) throw new Error(r.error.message);
    return { ...(r.data as NewInvite), childSaved: true };
  }
  // çocuk önerisi olmayan sunucu
  const mid = await supabase.rpc('clinic_create_invite', base);
  if (!missing(mid.error)) {
    if (mid.error) throw new Error(mid.error.message);
    return { ...(mid.data as NewInvite), childSaved: false };
  }
  // eski sunucu: yalnız kod (15 dk)
  const old = await supabase.rpc('clinic_create_invite', { p_kind: 'family', p_label: i.label.trim() });
  if (old.error) throw new Error(old.error.message);
  return { ...(old.data as NewInvite), token: null, childSaved: false };
}

export async function markInvite(code: string, channel: Channel): Promise<void> {
  await supabase.rpc('clinic_invite_mark', { p_code: code, p_channel: channel, p_revoke: false });
}

export async function revokeInvite(code: string): Promise<void> {
  const { error } = await supabase.rpc('clinic_invite_mark', { p_code: code, p_channel: null, p_revoke: true });
  if (error) throw new Error(error.message);
}

// Liste ve istatistik: sunucu güncellemesi yoksa boş
export async function listInvites(days = 90): Promise<FamilyInvite[] | null> {
  const { data, error } = await supabase.rpc('clinic_invites_list', { p_days: days });
  if (missing(error)) return null;
  if (error) throw new Error(error.message);
  return (data ?? []) as FamilyInvite[];
}

export async function inviteStats(days = 30): Promise<InviteStats[]> {
  const { data, error } = await supabase.rpc('clinic_invite_stats', { p_days: days });
  if (error) return [];
  return ((data ?? []) as InviteStats[]).map((s) => ({
    ...s, sent: Number(s.sent), opened: Number(s.opened), claimed: Number(s.claimed), shared: Number(s.shared),
    expired: Number(s.expired), open_now: Number(s.open_now),
  }));
}

// Süresi dolan davetler için uzmana bildirim (sunucuda zamanlayıcı yoksa açılışta)
export async function sweepInvites(): Promise<void> {
  await supabase.rpc('clinic_invites_sweep');
}

export const inviteLink = (token: string | null) => (token && HAS_BASE ? `${BASE}${token}` : null);

export function inviteMessage(inv: { code: string; token: string | null; expires_at: string }, clinician: string, parentName = '') {
  const link = inviteLink(inv.token);
  const until = new Date(inv.expires_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const lines = [
    `Merhaba${parentName ? ' ' + parentName : ''},`,
    `${clinician || 'Uzmanınız'} sizi ParentApp'te çocuğunuzun takibine davet ediyor. Hangi çocuğunuzu paylaşacağınıza siz karar verirsiniz; istediğiniz an durdurabilirsiniz.`,
    '',
    link ? `Daveti açın: ${link}` : `1) ParentApp'i yükleyin${PARENTAPP_STORE_URL ? `: ${PARENTAPP_STORE_URL}` : ' (App Store)'}`,
    link ? `Uygulama kod sorarsa: ${inv.code}` : `2) Kayıt olun; açılan "Kodun var mı?" ekranına bu kodu yazın (hesabınız varsa Aile › Hesap › Kod gir): ${inv.code}`,
    `Davet ${until} tarihine kadar geçerli.`,
  ];
  return lines.join('\n');
}

const SUBJECT = 'ParentApp daveti';

// Sistem e-postası (Edge Function invite-email). İşlev yayında değilse ya da e-posta ayarı yoksa gönderilmez; uzman kodu kopyalar.
export type EmailResult = { sent: boolean; reason?: string; detail?: string };
export async function sendInviteEmail(code: string): Promise<EmailResult> {
  const { data, error } = await supabase.functions.invoke('invite-email', { body: { code } });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    return { sent: false, reason: status === 404 || !status ? 'not_deployed' : 'error' };
  }
  return (data ?? { sent: false, reason: 'error' }) as EmailResult;
}

export function emailReasonText(r: EmailResult): string {
  switch (r.reason) {
    case 'not_deployed': case 'not_configured': return 'Otomatik e-posta henüz açık değil. Kodu kopyalayıp aileye kendin iletebilirsin.';
    case 'too_soon': return 'Aynı davete bir dakika içinde yeniden e-posta gönderilemez.';
    case 'limit_invite': return 'Bu davete en çok 3 e-posta gönderilebilir. Kodu kopyalayıp kendin ilet.';
    case 'limit_day': return 'Bugün çok fazla davet e-postası gönderdin; yarın tekrar dene ya da kodu kendin ilet.';
    case 'expired': return 'Davetin süresi doldu; yeni davet oluştur.';
    case 'closed': return 'Aile daveti zaten aldı ya da davet kapandı; e-posta gerekmez.';
    case 'no_email': return 'Bu davette e-posta adresi yok. Kodu kopyalayıp kendin ilet.';
    case 'no_access': return 'Üyelik etkin değil.';
    case 'send_failed': return r.detail === 'EAUTH'
      ? 'E-posta gönderilemedi: gönderim hesabının ayarı hatalı (uygulama şifresi). Kodu kopyalayıp kendin iletebilirsin.'
      : 'E-posta gönderilemedi. Adresi kontrol et ya da kodu kopyalayıp kendin ilet.';
    default: return 'E-posta gönderilemedi. Kodu kopyalayıp kendin iletebilirsin.';
  }
}

// 'shared': gönderim uygulaması açıldı · 'dismissed': kullanıcı paylaşım menüsünü kapattı · 'unsupported': cihazda menü yok
export type ShareResult = 'shared' | 'dismissed' | 'unsupported';
export async function shareInvite(channel: Channel, message: string, email?: string | null): Promise<ShareResult> {
  const text = encodeURIComponent(message);
  if (channel === 'whatsapp') {
    const url = `https://wa.me/?text=${text}`;
    if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
    else await Linking.openURL(url);
    return 'shared';
  }
  if (channel === 'email') {
    const url = `mailto:${email ?? ''}?subject=${encodeURIComponent(SUBJECT)}&body=${text}`;
    if (Platform.OS === 'web') window.location.href = url;
    else await Linking.openURL(url);
    return 'shared';
  }
  if (channel === 'sms') {
    const url = Platform.OS === 'ios' ? `sms:&body=${text}` : `sms:?body=${text}`;
    await Linking.openURL(url);
    return 'shared';
  }
  if (channel === 'other') {
    if (Platform.OS === 'web') {
      const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
      if (!nav.share) return 'unsupported';
      return nav.share({ title: SUBJECT, text: message }).then(() => 'shared' as const, () => 'dismissed' as const);
    }
    const r = await Share.share({ message, title: SUBJECT });
    return r.action === Share.sharedAction ? 'shared' : 'dismissed';
  }
  return 'unsupported';
}

// Kalan süre metni
export function leftText(expiresAt: string, now = Date.now()) {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return 'süresi doldu';
  const h = Math.floor(ms / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  return h > 0 ? `${h} sa ${m} dk kaldı` : `${m} dk kaldı`;
}
