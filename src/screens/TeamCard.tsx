import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet, Share, Platform } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Card, Label, Input, SmallButton, Toggle } from '../components/ui';
import {
  ClinicianMe, Member, Team, loadTeam, personalCode, requestMember, cancelTeamRequest, removeMember, leaveClinic,
  setInvitePolicy, REQUEST_ERROR, RequestResult,
} from '../lib/clinic';
import { track } from '../lib/track';

const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const daysTo = (iso: string) => Math.max(0, Math.ceil((new Date(iso).getTime() - Date.now()) / 864e5));

// Kişisel kod (ortak akislar.md 21): uzmanın tek, kalıcı kodu. Klinik sahibi bu kodla ekibine ekleme isteği gönderir;
// uzman kabul etmeden hiçbir şey açılmaz.
export function PersonalCodeCard({ compact }: { compact?: boolean }) {
  const [code, setCode] = useState<string | null | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  useEffect(() => { personalCode().then(setCode).catch(() => setCode(null)); }, []);
  if (code === null) return null;     // sunucu eski
  const copy = () => { if (code) Clipboard.setStringAsync(code).then(() => Alert.alert('Kopyalandı')); track('team.code_copy'); };
  const share = async () => {
    if (!code) return;
    track('team.code_copy', { share: true });
    if (Platform.OS === 'web') return copy();
    await Share.share({ message: `ClinicApp kişisel uzman kodum: ${code}\nKlinik sahibi Ayarlar › Ekip › "Uzman ekle"ye yazınca ben onaylarım.` }).catch(() => {});
  };
  const rotate = () => Alert.alert('Kod yenilensin mi?', 'Eski kod çalışmaz. Gönderilmiş istekler geçerli kalır.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Yenile', onPress: async () => {
      setBusy(true);
      try { setCode(await personalCode(true)); track('team.code_rotate'); } catch (e) { Alert.alert('Yenilenemedi', (e as Error).message); } finally { setBusy(false); }
    } },
  ]);
  return (
    <Card style={{ gap: 8 }}>
      <View style={styles.codeRow}>
        <Text style={styles.code} selectable>{code ?? '········'}</Text>
        <Pressable onPress={copy} accessibilityLabel="Kodu kopyala" hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="copy-outline" size={18} color={colors.navy} />
        </Pressable>
        {Platform.OS !== 'web' && (
          <Pressable onPress={share} accessibilityLabel="Kodu paylaş" hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="share-outline" size={18} color={colors.navy} />
          </Pressable>
        )}
      </View>
      <Text style={styles.small}>Bir klinikle çalışacaksan bu kodu klinik sahibine ver. Seni ekibine eklemek istediğinde onay sana gelir.</Text>
      {!compact && (
        <Pressable onPress={rotate} hitSlop={8} style={{ alignSelf: 'flex-start' }} disabled={busy}>
          <Text style={styles.link}>{busy ? 'Yenileniyor…' : 'Kodu yenile'}</Text>
        </Pressable>
      )}
    </Card>
  );
}

// Ekip (seçili klinik alanı): üyeler, bekleyen istekler, uzman ekle (kişisel kodla), aile daveti ayarı, ayrıl / çıkar.
export default function TeamCard({ me, team: initial, onChanged, onUpgrade, onLeft }: {
  me: ClinicianMe; team: Member[]; onChanged: () => void; onUpgrade: () => void; onLeft: () => void;
}) {
  const owner = me.role === 'owner';
  const [team, setTeam] = useState<Team | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<RequestResult | null>(null);
  const reload = useCallback(() => { loadTeam().then(setTeam).catch(() => setTeam(null)); }, []);
  useEffect(() => { reload(); }, [reload]);
  const members = team?.members ?? initial;
  const requests = team?.requests ?? [];
  const seats = team?.seat_limit ?? me.seat_limit;
  const canInvite = team?.members_can_invite ?? me.members_can_invite ?? true;

  const send = async () => {
    const k = code.replace(/[^A-Za-z0-9]/g, '');
    if (k.length !== 8) return Alert.alert('Uzmanın kişisel kodu 8 karakterdir.');
    setBusy('send');
    try {
      const r = await requestMember(k);
      setResult(r);
      track('team.request', { result: r.status ?? r.error ?? 'unknown' });
      if (r.status) { setCode(''); reload(); }
    } catch (e) {
      Alert.alert('İstek gönderilemedi', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };
  const cancel = (id: string) => Alert.alert('İstek geri çekilsin mi?', '', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Geri çek', style: 'destructive', onPress: async () => {
      try { await cancelTeamRequest(id); track('team.request_cancel'); reload(); } catch (e) { Alert.alert('Geri çekilemedi', (e as Error).message); }
    } },
  ]);
  const remove = (m: Member) => Alert.alert(`${m.name || 'Uzman'} ekipten çıkarılsın mı?`,
    'Kliniğin danışanlarını artık görmez. Sorumlu olduğu danışanlar ve kayıtlar klinikte kalır; bekleyen davetleri iptal olur.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Ekipten çıkar', style: 'destructive', onPress: async () => {
        try { await removeMember(m.id); track('team.remove'); reload(); onChanged(); } catch (e) { Alert.alert('Çıkarılamadı', (e as Error).message); }
      } },
    ]);
  const leave = () => Alert.alert(`${me.clinic} ekibinden ayrılmak istiyor musun?`,
    'Bu kliniğin danışanlarını artık görmezsin. Kliniğin kayıtları klinikte kalır. Bireysel çalışmana dokunulmaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Ayrıl', style: 'destructive', onPress: async () => {
        try { await leaveClinic(); track('team.leave'); onLeft(); } catch (e) { Alert.alert('Ayrılınamadı', (e as Error).message); }
      } },
    ]);
  const togglePolicy = async (on: boolean) => {
    setBusy('policy');
    try { await setInvitePolicy(on); track('team.invite_policy', { on }); reload(); onChanged(); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); } finally { setBusy(null); }
  };

  return (
    <>
      <Label>{`Ekip (${members.length} / ${seats} uzman)`}</Label>
      <Card style={{ gap: 10 }}>
        {!owner && (
          <View style={styles.memberInfo}>
            {!!me.owner_name && <Text style={styles.body}><Text style={{ fontWeight: '600' }}>Klinik sahibi: </Text>{me.owner_name}</Text>}
            {!!me.invited_by_name && <Text style={styles.body}><Text style={{ fontWeight: '600' }}>Seni ekleyen: </Text>{me.invited_by_name}</Text>}
            {!!me.joined_at && <Text style={styles.small}>Ekibe katılma: {dateText(me.joined_at)}</Text>}
            <Text style={styles.small}>Bu klinikte davet ettiğin aileleri ve klinik sahibinin sana atadığı danışanları görürsün.</Text>
          </View>
        )}
        {members.map((m) => (
          <View key={m.id} style={styles.row}>
            <Text style={[styles.body, { flex: 1 }]} numberOfLines={2}>
              {m.name || 'Adsız'}{m.title ? ` · ${m.title}` : ''}{m.id === me.id ? ' (sen)' : ''}
            </Text>
            <Text style={[styles.badge, m.role === 'owner' && styles.badgeOwner]}>{m.role === 'owner' ? 'Sahip' : 'Ekip üyesi'}</Text>
            {owner && m.role !== 'owner' && (
              <Pressable onPress={() => remove(m)} accessibilityLabel={`${m.name} ekipten çıkar`} hitSlop={8}>
                <Text style={[styles.link, { fontSize: 12, color: colors.danger }]}>Çıkar</Text>
              </Pressable>
            )}
          </View>
        ))}
        {owner && requests.map((r) => (
          <View key={r.id} style={styles.row}>
            <Text style={[styles.body, { flex: 1, color: colors.muted }]} numberOfLines={2}>
              {r.name || 'Uzman'}{r.title ? ` · ${r.title}` : ''}
            </Text>
            <Text style={styles.badge}>{`Onay bekliyor · ${daysTo(r.expires_at)} gün kaldı`}</Text>
            <Pressable onPress={() => cancel(r.id)} accessibilityLabel="İsteği geri çek" hitSlop={8}>
              <Ionicons name="close-circle-outline" size={18} color={colors.muted} />
            </Pressable>
          </View>
        ))}

        {owner && (members.length + requests.length < seats ? (
          <View style={styles.add}>
            <Text style={styles.addTitle}>Uzman ekle</Text>
            <Text style={styles.small}>Uzmandan kişisel kodunu iste (onun Ayarlar sayfasında). Kodu yaz; uzman onaylayınca ekibine katılır.</Text>
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <View style={styles.field}>
                <Input value={code} onChangeText={(t) => { setCode(t.toUpperCase()); setResult(null); }} placeholder="Uzmanın kodu"
                  autoCapitalize="characters" autoCorrect={false} maxLength={10} accessibilityLabel="Uzmanın kişisel kodu" />
              </View>
              <SmallButton label="İstek gönder" onPress={send} busy={busy === 'send'} />
            </View>
            {!!result && (
              <Text style={[styles.small, { color: result.error ? colors.danger : colors.text }]}>
                {result.error ? (REQUEST_ERROR[result.hint ?? result.error] ?? REQUEST_ERROR[result.error] ?? result.message ?? 'İstek gönderilemedi.')
                  : `${result.name || 'Uzman'}${result.title ? ` (${result.title})` : ''} için istek ${result.status === 'pending' ? 'zaten bekliyor' : 'gönderildi'}. Onaylayınca ekibinde görünür.`}
              </Text>
            )}
          </View>
        ) : (
          <Pressable onPress={onUpgrade} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Text style={styles.link}>{seats <= 1 ? 'Bu pakette ekip yok. Klinik paketine geç (10 uzmana kadar)' : 'Koltuklar dolu. Paketleri gör'}</Text>
          </Pressable>
        ))}

        {owner && (
          <View style={styles.policy}>
            <View style={{ flex: 1 }}>
              <Text style={styles.body}>Ekip üyeleri aile davet edebilir</Text>
              <Text style={styles.small}>Kapalıyken bu klinik adına aile davetini yalnız sen gönderirsin.</Text>
            </View>
            <Toggle value={canInvite} onChange={(v) => { if (busy !== 'policy') togglePolicy(v); }} />
          </View>
        )}
        {!owner && (
          <Pressable onPress={leave} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Text style={[styles.link, { color: colors.danger }]}>Bu klinikten ayrıl</Text>
          </Pressable>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  code: { flex: 1, fontSize: 26, fontWeight: '800', letterSpacing: 4, color: colors.navy, fontVariant: ['tabular-nums'] },
  memberInfo: { gap: 4, paddingBottom: 10, marginBottom: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  badge: { fontSize: 11, fontWeight: '700', color: colors.text, backgroundColor: '#E9ECF3', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  field: { flex: 1, borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, overflow: 'hidden' },
  badgeOwner: { color: '#fff', backgroundColor: colors.navy },
  add: { gap: 6, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  addTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  policy: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
