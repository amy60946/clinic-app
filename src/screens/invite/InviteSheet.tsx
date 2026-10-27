import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Card, Label, Input, Cta, IconButton, Segmented, InfoText, SmallButton } from '../../components/ui';
import PlanEditor from '../plan/PlanEditor';
import { track } from '../../lib/track';
import {
  NewInvite, ChildAgeGroup, EmailStatus, CHILD_AGE_GROUPS, ageGroupLabel, createInvite, markInvite, inviteLink, inviteMessage, shareInvite,
  leftText, sendInviteEmail, emailReasonText, INVITE_HELP,
} from '../../lib/invites';

// Aileyi davet et (ortak akislar.md 10): 1) ebeveynin e-postası (zorunlu), isteğe bağlı çocuğun adı + yaş grubu, kendi notun
// → 2) "E-posta gönder": sistem senin adınla e-posta gönderir (Edge Function invite-email); yedek: kodu / davet metnini kopyala
// → 3) isteğe bağlı taslak takip planı (aile çocuğunu paylaşınca o çocuğa taşınır). Davet 3 gün geçerli.
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
      : existing?.email_status === 'failed' ? { sent: false, text: 'Son e-posta gönderilemedi. Yeniden gönderebilir ya da kodu kendin iletebilirsin.' }
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

  // Yedek: uzman kodu ya da davet metnini kendisi iletir
  const copy = async (what: 'code' | 'text') => {
    if (!inv) return;
    await Clipboard.setStringAsync(what === 'code' ? inv.code : inviteMessage(inv, clinicianName));
    Alert.alert('Kopyalandı', what === 'code' ? 'Kodu aileye iletebilirsin.' : 'Davet metnini istediğin uygulamaya yapıştırabilirsin.');
    if (!mail?.sent) markInvite(inv.code, 'copy').catch(() => {});
    track('invite.share', { channel: 'copy' });
  };
  const openMailApp = async () => {
    if (!inv) return;
    try {
      const r = await shareInvite('email', inviteMessage(inv, clinicianName), inv.parent_email);
      if (r === 'shared') markInvite(inv.code, 'email').catch(() => {});
    } catch (e) {
      Alert.alert('Açılamadı', (e as Error).message);
    }
  };

  const link = inviteLink(inv?.token ?? null);
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
              <Card style={{ gap: 8 }}>
                <Text style={styles.small}>Davet kodu</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={styles.code}>{inv.code}</Text>
                  <Pressable onPress={() => copy('code')} hitSlop={8} accessibilityLabel="Kodu kopyala" style={styles.round}>
                    <Ionicons name="copy-outline" size={18} color={colors.navy} />
                  </Pressable>
                </View>
                <Text style={[styles.small, { fontWeight: '600' }]}>
                  {leftText(inv.expires_at)}{inv.parent_email && !mail?.sent ? ` · ${inv.parent_email}` : ''}{inv.label ? ` · ${inv.label}` : ''}
                </Text>
                {(!!inv.child_name || !!inv.child_age_group) && (
                  <Text style={styles.small}>Çocuk: {[inv.child_name, ageGroupLabel(inv.child_age_group) && `${ageGroupLabel(inv.child_age_group)} yaş`].filter(Boolean).join(' · ')} (yalnız daveti kabul eden ebeveyn görür)</Text>
                )}
                {!!link && <Text style={styles.small} selectable>{link}</Text>}
              </Card>
              <View style={styles.actions}>
                {!!inv.parent_email && (
                  <SmallButton label={mail ? 'E-postayı yeniden gönder' : 'E-posta gönder'} onPress={resend} busy={busy} />
                )}
                <Pressable onPress={() => copy('text')} hitSlop={8} accessibilityRole="button">
                  <Text style={styles.link}>Davet metnini kopyala</Text>
                </Pressable>
                {!!mail && !mail.sent && !!inv.parent_email && (
                  <Pressable onPress={openMailApp} hitSlop={8} accessibilityRole="button">
                    <Text style={styles.link}>E-posta uygulamasında aç</Text>
                  </Pressable>
                )}
              </View>

              <Label>Takip planı (isteğe bağlı)</Label>
              {!plan ? (
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
  code: { fontSize: 30, fontWeight: '800', letterSpacing: 5, color: colors.navy },
  round: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, padding: 14, marginBottom: 8 },
  statusTitle: { fontSize: 14, fontWeight: '700', color: colors.text },
  statusText: { fontSize: 13, color: colors.text, lineHeight: 18 },
  actions: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginTop: 12 },
  planBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.line },
  planTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
});
