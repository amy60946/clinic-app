import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Card, Label, Input, Cta, IconButton, Segmented, InfoText } from '../../components/ui';
import PlanEditor from '../plan/PlanEditor';
import { track } from '../../lib/track';
import {
  NewInvite, ChildAgeGroup, EmailStatus, CHILD_AGE_GROUPS, ageGroupLabel, createInvite, markInvite,
  leftText, sendInviteEmail, emailReasonText, INVITE_HELP,
} from '../../lib/invites';

// Aileyi davet et (ortak akislar.md 10): 1) ebeveynin e-postası (zorunlu), isteğe bağlı çocuğun adı + yaş grubu, kendi notun
// → 2) "E-posta gönder": sistem senin adınla e-posta gönderir (Edge Function invite-email). Kullanıcı kararı 28 Ekim 2026:
// süreç sistem üzerinden; davet metnini kopyalama ve e-posta uygulamasında açma kalktı. Kod yalnız e-posta gönderilemezse
// yedek olarak görünür (26 Ekim kararı "kodu kopyala yedeği kalsın"). Davet 3 gün geçerli.
// Taslak takip planı bu pencerede GİZLİ (kullanıcı kararı 28 Ekim 2026; ortak DURUM HATIRLATMA): uzman planı aile bağlanınca
// danışan › Takip planı'nda kurar. Geri açmak için PLAN_IN_INVITE = true (sunucu invite_code taslağını hâlâ destekler).
const PLAN_IN_INVITE = false;
export type SheetInvite = NewInvite & {
  parent_name?: string; parent_email?: string | null; label?: string; child_name?: string | null; child_age_group?: string | null;
  email_status?: EmailStatus | null;
};
// sent: bu davete en az bir e-posta gitti · text: son denemenin uyarısı (ör. 60 sn dolmadı)
type Mail = { sent: boolean; text: string };

export default function InviteSheet({ visible, onClose, clinicId, clinicianName, existing }: {
  visible: boolean; onClose: () => void; clinicId: string; clinicianName: string; existing?: SheetInvite | null;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible && <Body onClose={onClose} clinicId={clinicId} clinicianName={clinicianName} existing={existing ?? null} />}
    </Modal>
  );
}

const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

function Body({ onClose, clinicId, clinicianName, existing }: {
  onClose: () => void; clinicId: string; clinicianName: string; existing: SheetInvite | null;
}) {
  const [inv, setInv] = useState<SheetInvite | null>(existing);
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<ChildAgeGroup | 'none'>('none');
  const [busy, setBusy] = useState(false);
  const [mail, setMail] = useState<Mail | null>(
    existing?.email_status === 'sent' ? { sent: true, text: '' }
      : existing?.email_status === 'failed' ? { sent: false, text: 'Son e-posta gönderilemedi. Adresi kontrol edip yeniden gönder.' }
      : null);
  const [plan, setPlan] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(t); }, []);

  const send = async (code: string) => {
    const r = await sendInviteEmail(code).catch(() => ({ sent: false, reason: 'error' }));
    setMail((prev) => ({ sent: r.sent || !!prev?.sent, text: r.sent ? '' : emailReasonText(r) }));
    track('invite.email', { sent: r.sent, reason: r.reason ?? '' });
  };

  const create = async () => {
    const to = email.trim();
    if (!to) return Alert.alert('Ebeveynin e-postasını yaz.');
    if (!isEmail(to)) return Alert.alert('E-posta adresi geçersiz.');
    setBusy(true);
    try {
      const age = childAge === 'none' ? null : childAge;
      const r = await createInvite({ label, parentName: '', parentEmail: to, childName, childAgeGroup: age });
      setInv({ ...r, parent_email: to.toLowerCase(), label: label.trim(),
        child_name: r.childSaved ? childName.trim() || null : null, child_age_group: r.childSaved ? age : null });
      track('invite.family', { email: true, link: !!r.token, child: !!childName.trim() || !!age });
      if (!r.childSaved && (childName.trim() || age)) {
        Alert.alert('Çocuk bilgisi kaydedilmedi', 'Sunucu güncellemesi beklendiği için davete çocuğun adı ve yaş grubu eklenemedi. Davet yine geçerli; ebeveyn çocuğu kendisi ekler.');
      }
      await send(r.code);
    } catch (e) {
      Alert.alert('Davet oluşturulamadı', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    if (!inv) return;
    setBusy(true);
    await send(inv.code);
    setBusy(false);
  };

  // Yedek (yalnız e-posta gönderilemediyse): uzman kodu kendisi iletir
  const copyCode = async () => {
    if (!inv) return;
    await Clipboard.setStringAsync(inv.code);
    Alert.alert('Kopyalandı', 'Kodu aileye iletebilirsin.');
    markInvite(inv.code, 'copy').catch(() => {});
    track('invite.share', { channel: 'copy' });
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <IconButton name="close" onPress={onClose} label="Kapat" />
          <Text style={styles.title}>Aileyi davet et</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 4 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          {!inv ? (
            <>
              <InfoText text="Ebeveynin e-postasını yaz; davet senin adınla e-postayla gider. Davet 3 gün geçerli." detail={INVITE_HELP} />
              <Label>Ebeveynin e-postası</Label>
              <Input value={email} onChangeText={setEmail} placeholder="ornek@eposta.com" keyboardType="email-address" autoCapitalize="none"
                autoCorrect={false} maxLength={160} />
              <Text style={styles.small}>Bu adrese senin adına davet e-postası gider; çocuğun adı ve notun e-postada yer almaz. Aile yanıtlarsa yanıt senin e-posta adresine gelir. Daveti yalnız tanıdığın ve hizmet verdiğin aileye gönder.</Text>
              <Label>Çocuğun adı (isteğe bağlı)</Label>
              <Input value={childName} onChangeText={setChildName} placeholder="Ör. Efe" maxLength={40} />
              <Label>Yaş grubu (isteğe bağlı)</Label>
              <Segmented options={[{ id: 'none' as const, label: 'Belirtme' }, ...CHILD_AGE_GROUPS]} value={childAge} onChange={setChildAge} />
              <InfoText small text="Yalnız daveti kabul eden ebeveyn görür. Sağlık bilgisi yazma."
                detail={['Çocuğun adını ve yaş grubunu yazarsan yalnız daveti kabul eden ebeveyn görür; kontrol edip onaylar, düzeltirse sana bildirim gelir. Mesajda görünmez, davet bitince silinir.']} />
              <Label>Kendi notun (isteğe bağlı, aile görmez)</Label>
              <Input value={label} onChangeText={setLabel} placeholder="Ör. dosya no, görüşme günü" maxLength={60} />
              <View style={{ marginTop: 16 }}><Cta label="E-posta gönder" onPress={create} busy={busy} /></View>
            </>
          ) : (
            <>
              {mail?.sent && (
                <View style={[styles.status, { backgroundColor: colors.easy.bg }]}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.easy.fg} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.statusTitle}>Davet e-postası gönderildi</Text>
                    <Text style={styles.statusText}>{inv.parent_email} · Gelmezse ebeveyn gereksiz (spam) klasörüne baksın.</Text>
                  </View>
                </View>
              )}
              {!!mail?.text && (
                <View style={[styles.status, { backgroundColor: colors.medium.bg }]}>
                  <Ionicons name="alert-circle" size={22} color={colors.medium.fg} />
                  <Text style={[styles.statusText, { flex: 1 }]}>{mail.text}</Text>
                </View>
              )}
              <Card style={{ gap: 6 }}>
                {!!inv.parent_email && <Text style={styles.to}>{inv.parent_email}</Text>}
                <Text style={[styles.small, { fontWeight: '600' }]}>{leftText(inv.expires_at)}{inv.label ? ` · ${inv.label}` : ''}</Text>
                {(!!inv.child_name || !!inv.child_age_group) && (
                  <Text style={styles.small}>Çocuk: {[inv.child_name, ageGroupLabel(inv.child_age_group) && `${ageGroupLabel(inv.child_age_group)} yaş`].filter(Boolean).join(' · ')} (yalnız daveti kabul eden ebeveyn görür)</Text>
                )}
                {!mail?.sent && (
                  <View style={styles.codeRow}>
                    <Text style={styles.small}>Yedek davet kodu</Text>
                    <Text style={styles.code}>{inv.code}</Text>
                    <Pressable onPress={copyCode} hitSlop={8} accessibilityLabel="Kodu kopyala" style={styles.round}>
                      <Ionicons name="copy-outline" size={16} color={colors.navy} />
                    </Pressable>
                  </View>
                )}
              </Card>
              {!!inv.parent_email && (
                <Pressable onPress={resend} disabled={busy} accessibilityRole="button"
                  style={({ pressed }) => [styles.secondary, (busy || pressed) && { opacity: 0.6 }]}>
                  <Ionicons name="send-outline" size={18} color={colors.navy} />
                  <Text style={styles.secondaryText}>{busy ? 'Gönderiliyor…' : mail ? 'E-postayı yeniden gönder' : 'E-posta gönder'}</Text>
                </Pressable>
              )}

              {PLAN_IN_INVITE && <Label>Takip planı (isteğe bağlı)</Label>}
              {!PLAN_IN_INVITE ? null : !plan ? (
                <Pressable style={styles.planBox} onPress={() => setPlan(true)} accessibilityRole="button">
                  <Ionicons name="clipboard-outline" size={20} color={colors.navy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planTitle}>Hedefleri ve aile programını şimdi hazırla</Text>
                    <Text style={styles.small}>Aile çocuğunu paylaşınca plan o çocuğa (önerdiğin çocuk varsa yalnız ona) taşınır ve ParentApp'te hazır bulunur.</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                </Pressable>
              ) : (
                <PlanEditor target={{ kind: 'invite', code: inv.code, clinicId }} />
              )}
              <View style={{ marginTop: 20 }}><Cta label="Bitti" onPress={onClose} /></View>
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  to: { fontSize: 15, fontWeight: '700', color: colors.navy },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  code: { fontSize: 18, fontWeight: '800', letterSpacing: 3, color: colors.navy },
  round: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  secondary: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 50, borderRadius: radius.md,
    borderWidth: 1.5, borderColor: colors.navy, backgroundColor: '#fff', marginTop: 12 },
  secondaryText: { fontSize: 15, fontWeight: '700', color: colors.navy },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, padding: 14, marginBottom: 8 },
  statusTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  statusText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  planBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.line },
  planTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
});
