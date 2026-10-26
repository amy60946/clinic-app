import { Platform, Share, Linking } from 'react-native';
import { supabase } from './supabase';

// Aile davet bağlantısı (ortak/sozlesme/akislar.md 10, proposed/20261026100000_family_invite_links.sql):
// 48 saat geçerli; bağlantı (token) + yazılabilir 6 karakter kod aynı davettir. Uzman WhatsApp / e-posta / SMS ile gönderir.
// Bağlantı adresi alan adı alınınca EXPO_PUBLIC_INVITE_BASE_URL ile verilir (ör. https://alanadi.com/d/); yoksa mesajda yalnız kod.
const BASE = (process.env.EXPO_PUBLIC_INVITE_BASE_URL ?? '').replace(/\/?$/, '/');
const HAS_BASE = !!process.env.EXPO_PUBLIC_INVITE_BASE_URL;
const PARENTAPP_STORE_URL = process.env.EXPO_PUBLIC_PARENTAPP_STORE_URL ?? '';

export type InviteStatus = 'sent' | 'opened' | 'claimed' | 'shared' | 'expired' | 'revoked';
export type FamilyInvite = {
  code: string; token: string | null; clinician_id: string; clinician: string; label: string;
  parent_name: string; parent_email: string | null; channel: string | null; status: InviteStatus;
  created_at: string; expires_at: string; opened_at: string | null; claimed_at: string | null; used_at: string | null;
  has_plan: boolean;
};
export type NewInvite = { code: string; token: string | null; expires_at: string };
export type InviteStats = {
  clinician_id: string; clinician: string; sent: number; opened: number; claimed: number; shared: number; expired: number; open_now: number;
};
export type Channel = 'whatsapp' | 'email' | 'sms' | 'copy' | 'other';

export const STATUS_TEXT: Record<InviteStatus, string> = {
  sent: 'Gönderildi',
  opened: 'Bağlantı açıldı',
  claimed: 'Aile kayıt oldu',
  shared: 'Çocuk paylaşıldı',
  expired: 'Süresi doldu',
  revoked: 'İptal edildi',
};

const missing = (e: { code?: string } | null) => e?.code === 'PGRST202' || e?.code === '42883';

export async function createInvite(label: string, parentName: string, parentEmail: string): Promise<NewInvite> {
  const r = await supabase.rpc('clinic_create_invite', {
    p_kind: 'family', p_label: label.trim(), p_parent_name: parentName.trim(), p_parent_email: parentEmail.trim() || null,
  });
  if (missing(r.error)) {
    // eski sunucu: yalnız kod (15 dk)
    const old = await supabase.rpc('clinic_create_invite', { p_kind: 'family', p_label: label.trim() });
    if (old.error) throw new Error(old.error.message);
    return { ...(old.data as NewInvite), token: null };
  }
  if (r.error) throw new Error(r.error.message);
  return r.data as NewInvite;
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
    link ? `Uygulama kod sorarsa: ${inv.code}` : `2) Kayıt olurken ya da Aile › Hesap › Uzmanım bölümünde bu kodu yazın: ${inv.code}`,
    `Davet ${until} tarihine kadar geçerli.`,
  ];
  return lines.join('\n');
}

const SUBJECT = 'ParentApp daveti';

export async function shareInvite(channel: Channel, message: string, email?: string | null): Promise<boolean> {
  const text = encodeURIComponent(message);
  if (channel === 'whatsapp') {
    const url = `https://wa.me/?text=${text}`;
    if (Platform.OS === 'web') window.open(url, '_blank', 'noopener');
    else await Linking.openURL(url);
    return true;
  }
  if (channel === 'email') {
    const url = `mailto:${email ?? ''}?subject=${encodeURIComponent(SUBJECT)}&body=${text}`;
    if (Platform.OS === 'web') window.location.href = url;
    else await Linking.openURL(url);
    return true;
  }
  if (channel === 'sms') {
    const url = Platform.OS === 'ios' ? `sms:&body=${text}` : `sms:?body=${text}`;
    await Linking.openURL(url);
    return true;
  }
  if (channel === 'other') {
    if (Platform.OS === 'web') {
      const nav = navigator as Navigator & { share?: (d: { title?: string; text?: string }) => Promise<void> };
      if (!nav.share) return false;
      await nav.share({ title: SUBJECT, text: message }).catch(() => {});
      return true;
    }
    const r = await Share.share({ message, title: SUBJECT });
    return r.action === Share.sharedAction;
  }
  return false;
}

// Kalan süre metni
export function leftText(expiresAt: string, now = Date.now()) {
  const ms = new Date(expiresAt).getTime() - now;
  if (ms <= 0) return 'süresi doldu';
  const h = Math.floor(ms / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  return h > 0 ? `${h} sa ${m} dk kaldı` : `${m} dk kaldı`;
}
