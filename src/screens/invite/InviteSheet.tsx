import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Card, Label, Input, Cta, IconButton, Segmented } from '../../components/ui';
import PlanEditor from '../plan/PlanEditor';
import { track } from '../../lib/track';
import {
  NewInvite, Channel, ChildAgeGroup, CHILD_AGE_GROUPS, ageGroupLabel, createInvite, markInvite, inviteLink, inviteMessage, shareInvite, leftText,
} from '../../lib/invites';

// Aileyi davet et (ortak akislar.md 10): 1) isteğe bağlı ebeveyn adı / e-posta / not → 2) bağlantı + kod, WhatsApp / e-posta / diğer
// → 3) isteğe bağlı taslak takip planı (aile çocuğunu paylaşınca o çocuğa taşınır). Davet 48 saat geçerli.
export type SheetInvite = NewInvite & {
  parent_name?: string; parent_email?: string | null; label?: string; child_name?: string | null; child_age_group?: string | null;
};

export default function InviteSheet({ visible, onClose, clinicId, clinicianName, existing }: {
  visible: boolean; onClose: () => void; clinicId: string; clinicianName: string; existing?: SheetInvite | null;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible && <Body onClose={onClose} clinicId={clinicId} clinicianName={clinicianName} existing={existing ?? null} />}
    </Modal>
  );
}

function Body({ onClose, clinicId, clinicianName, existing }: {
  onClose: () => void; clinicId: string; clinicianName: string; existing: SheetInvite | null;
}) {
  const [inv, setInv] = useState<SheetInvite | null>(existing);
  const [parentName, setParentName] = useState('');
  const [email, setEmail] = useState('');
  const [label, setLabel] = useState('');
  const [childName, setChildName] = useState('');
  const [childAge, setChildAge] = useState<ChildAgeGroup | 'none'>('none');
  const [busy, setBusy] = useState(false);
  const [plan, setPlan] = useState(false);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 30_000); return () => clearInterval(t); }, []);

  const create = async () => {
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return Alert.alert('E-posta adresi geçersiz.');
    setBusy(true);
    try {
      const age = childAge === 'none' ? null : childAge;
      const r = await createInvite({ label, parentName, parentEmail: email, childName, childAgeGroup: age });
      setInv({ ...r, parent_name: parentName.trim(), parent_email: email.trim() || null, label: label.trim(),
        child_name: r.childSaved ? childName.trim() || null : null, child_age_group: r.childSaved ? age : null });
      track('invite.family', { email: !!email.trim(), link: !!r.token, child: !!childName.trim() || !!age });
    } catch (e) {
      Alert.alert('Davet oluşturulamadı', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const share = async (ch: Channel) => {
    if (!inv) return;
    const msg = inviteMessage(inv, clinicianName, inv.parent_name ?? '');
    try {
      if (ch === 'copy') {
        await Clipboard.setStringAsync(msg);
        Alert.alert('Kopyalandı', 'Mesajı istediğin uygulamaya yapıştırabilirsin.');
      } else {
        const ok = await shareInvite(ch, msg, inv.parent_email);
        if (!ok && ch === 'other') { await Clipboard.setStringAsync(msg); Alert.alert('Kopyalandı', 'Bu cihazda paylaşım menüsü yok; mesaj panoya kopyalandı.'); }
      }
      markInvite(inv.code, ch).catch(() => {});
      track('invite.share', { channel: ch });
    } catch (e) {
      Alert.alert('Paylaşılamadı', (e as Error).message);
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
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 4 }} keyboardShouldPersistTaps="handled">
          {!inv ? (
            <>
              <Text style={styles.body}>
                Aileye bir davet bağlantısı gönder. Ebeveyn bağlantıdan ParentApp'i yükleyip kayıt olur; sen kendiliğinden tanımlı gelirsin. Çocuğunu paylaşma kararı ebeveynin. Davet 48 saat geçerli.
              </Text>
              <Label>Ebeveynin adı (isteğe bağlı)</Label>
              <Input value={parentName} onChangeText={setParentName} placeholder="Mesajda selam için" maxLength={60} />
              <Label>Ebeveynin e-postası (isteğe bağlı)</Label>
              <Input value={email} onChangeText={setEmail} placeholder="ornek@eposta.com" keyboardType="email-address" autoCapitalize="none" maxLength={160} />
              <Text style={styles.small}>Ebeveyn bu e-postayla kayıt olursa davet bağlantıya dokunmasa da kendiliğinden eşleşir.</Text>
              <Label>Çocuğun adı ya da takma adı (isteğe bağlı)</Label>
              <Input value={childName} onChangeText={setChildName} placeholder="Ör. Efe" maxLength={40} />
              <Label>Yaş grubu (isteğe bağlı)</Label>
              <Segmented options={[{ id: 'none' as const, label: 'Belirtme' }, ...CHILD_AGE_GROUPS]} value={childAge} onChange={setChildAge} />
              <Text style={styles.small}>
                Ebeveyn kayıt olunca bilgiler hazır gelir; kontrol edip onaylar, gerekirse düzeltir (düzeltirse sana bildirim gelir). Mesajda ve bağlantı sayfasında görünmez; davet bitince silinir. Yalnız ad ve yaş grubu gir, sağlık bilgisi yazma.
              </Text>
              <Label>Kendi notun (isteğe bağlı, aile görmez)</Label>
              <Input value={label} onChangeText={setLabel} placeholder="Ör. dosya no, görüşme günü" maxLength={60} />
              <View style={{ marginTop: 16 }}><Cta label="Daveti oluştur" onPress={create} busy={busy} /></View>
            </>
          ) : (
            <>
              <Card style={{ gap: 8 }}>
                <Text style={styles.small}>Uygulama kod sorarsa</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={styles.code}>{inv.code}</Text>
                  <Pressable onPress={() => Clipboard.setStringAsync(inv.code).then(() => Alert.alert('Kod kopyalandı'))} hitSlop={8}
                    accessibilityLabel="Kodu kopyala" style={styles.round}>
                    <Ionicons name="copy-outline" size={18} color={colors.navy} />
                  </Pressable>
                </View>
                <Text style={[styles.small, { fontWeight: '600' }]}>{leftText(inv.expires_at)}{inv.label ? ` · ${inv.label}` : ''}</Text>
                {(!!inv.child_name || !!inv.child_age_group) && (
                  <Text style={styles.small}>Çocuk: {[inv.child_name, ageGroupLabel(inv.child_age_group) && `${ageGroupLabel(inv.child_age_group)} yaş`].filter(Boolean).join(' · ')} (yalnız daveti kabul eden ebeveyn görür)</Text>
                )}
                {link ? <Text style={styles.small} selectable>{link}</Text> : (
                  <Text style={styles.small}>Bağlantı adresi henüz tanımlı değil (alan adı bekleniyor); mesajda yükleme yolu ve kod gider.</Text>
                )}
              </Card>
              <Label>Gönder</Label>
              <View style={styles.shareRow}>
                <ShareBtn icon="logo-whatsapp" label="WhatsApp" onPress={() => share('whatsapp')} primary />
                <ShareBtn icon="mail-outline" label="E-posta" onPress={() => share('email')} />
                {Platform.OS !== 'web' && <ShareBtn icon="chatbubble-outline" label="SMS" onPress={() => share('sms')} />}
                <ShareBtn icon="share-outline" label="Diğer" onPress={() => share('other')} />
                <ShareBtn icon="copy-outline" label="Kopyala" onPress={() => share('copy')} />
              </View>

              <Label>Takip planı (isteğe bağlı)</Label>
              {!plan ? (
                <Pressable style={styles.planBox} onPress={() => setPlan(true)} accessibilityRole="button">
                  <Ionicons name="clipboard-outline" size={20} color={colors.navy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.planTitle}>Hedefleri ve aile programını şimdi hazırla</Text>
                    <Text style={styles.small}>Aile çocuğunu paylaşınca plan o çocuğa taşınır ve ParentApp'te hazır bulunur.</Text>
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

function ShareBtn({ icon, label, onPress, primary }: { icon: keyof typeof Ionicons.glyphMap; label: string; onPress: () => void; primary?: boolean }) {
  return (
    <Pressable onPress={onPress} style={[styles.shareBtn, primary && { backgroundColor: colors.navy, borderColor: colors.navy }]} accessibilityRole="button">
      <Ionicons name={icon} size={20} color={primary ? '#fff' : colors.navy} />
      <Text style={[styles.shareText, primary && { color: '#fff' }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  code: { fontSize: 30, fontWeight: '800', letterSpacing: 5, color: colors.navy },
  round: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  shareRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shareBtn: { flexGrow: 1, flexBasis: 100, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', paddingHorizontal: 12 },
  shareText: { fontSize: 14, fontWeight: '700', color: colors.navy },
  planBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.line },
  planTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
});
