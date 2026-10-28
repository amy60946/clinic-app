import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Card, Label, Input, SmallButton } from '../components/ui';
import { createTeamInvite, joinTeam, ClinicianMe, Invite, Member } from '../lib/clinic';
import { track } from '../lib/track';

const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

// Ekip: sahip 15 dakikalık ekip kodu üretir, koltuk sınırı; tek başına sahip başka bir kliniğin koduyla katılabilir.
// Kodlar 15 dakika geçerli, tek kullanımlık (ortak 20261022100000_codes_15min): geri sayım, süre dolunca "Yeni kod al"
function useSecondsLeft(expiresAt: string | undefined) {
  const calc = () => (expiresAt ? Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)) : 0);
  const [left, setLeft] = useState(calc);
  useEffect(() => {
    setLeft(calc());
    if (!expiresAt) return;
    const t = setInterval(() => setLeft(calc()), 1000);
    return () => clearInterval(t);
  }, [expiresAt]); // eslint-disable-line react-hooks/exhaustive-deps
  return left;
}

function CodeBox({ invite, onRenew, busy, children }: { invite: Invite; onRenew: () => void; busy?: boolean; children?: React.ReactNode }) {
  const left = useSecondsLeft(invite.expires_at);
  const expired = left <= 0;
  const mm = Math.floor(left / 60);
  const ss = String(left % 60).padStart(2, '0');
  return (
    <View style={{ gap: 6 }}>
      <View style={styles.codeRow}>
        <Text style={[styles.code, expired && { color: colors.faint, textDecorationLine: 'line-through' }]}>{invite.code}</Text>
        {!expired && (
          <Pressable
            onPress={() => Clipboard.setStringAsync(invite.code).then(() => Alert.alert('Kopyalandı'))}
            accessibilityLabel="Kodu kopyala" hitSlop={8} style={styles.iconBtn}
          >
            <Ionicons name="copy-outline" size={18} color={colors.navy} />
          </Pressable>
        )}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Text style={[styles.small, { marginTop: 0, fontWeight: '600' }, expired && { color: colors.danger }]}>
          {expired ? 'Kodun süresi doldu' : `${mm}:${ss} geçerli`}
        </Text>
        <SmallButton label="Yeni kod al" onPress={onRenew} busy={busy} />
      </View>
      {children}
    </View>
  );
}

export default function TeamCard({ me, team, onJoined, onUpgrade }: { me: ClinicianMe; team: Member[]; onJoined: () => void; onUpgrade: () => void }) {
  const [invite, setInvite] = useState<Invite | null>(null);
  const [busy, setBusy] = useState(false);
  const [joining, setJoining] = useState(false);
  const [code, setCode] = useState('');
  const create = async () => {
    setBusy(true);
    try {
      setInvite(await createTeamInvite());
      track('invite.team');
    } catch (e) {
      Alert.alert('Kod üretilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const join = async () => {
    if (![6, 8].includes(code.trim().length)) return Alert.alert('Ekip kodu 8 karakterdir.');
    setBusy(true);
    try {
      await joinTeam(code);
      track('team.join');
      setJoining(false);
      setCode('');
      onJoined();
    } catch (e) {
      Alert.alert('Ekibe katılınamadı', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  // Tek başına sahip (henüz ekibi yok): başka bir kliniğin ekip koduyla katılabilir
  const canJoin = me.role === 'owner' && team.length <= 1;
  return (
    <>
      <Label>{`Ekip (${team.length} / ${me.seat_limit} uzman)`}</Label>
      <Card style={{ gap: 10 }}>
        {me.role === 'member' && (
          <View style={styles.memberInfo}>
            <Text style={styles.body}><Text style={{ fontWeight: '600' }}>Klinik: </Text>{me.clinic}</Text>
            {!!me.owner_name && <Text style={styles.body}><Text style={{ fontWeight: '600' }}>Klinik sahibi: </Text>{me.owner_name}</Text>}
            {!!me.invited_by_name && <Text style={styles.body}><Text style={{ fontWeight: '600' }}>Seni davet eden: </Text>{me.invited_by_name}</Text>}
            {!!me.joined_at && <Text style={styles.small}>Ekibe katılma: {dateText(me.joined_at)}</Text>}
            <Text style={styles.small}>Kendi davet ettiğin aileleri ve klinik sahibinin sana atadığı danışanları görürsün. Bildirimler danışanın sorumlu uzmanına ve atanan uzmanlara gider.</Text>
          </View>
        )}
        {team.map((m) => (
          <Text key={m.id} style={styles.body}>
            {m.name || 'Adsız'}{m.title ? ` · ${m.title}` : ''}{m.role === 'owner' ? ' · sahip' : ''}{m.id === me.id ? ' (sen)' : ''}
          </Text>
        ))}
        {me.role === 'owner' && (invite ? (
          <CodeBox invite={invite} onRenew={create} busy={busy && !joining}>
            <Text style={styles.small}>Yeni uzman ClinicApp'te kayıt olurken "Kodum var"ı seçip bu kodu yazar. Kod 15 dakika geçerli, tek kullanımlık.</Text>
          </CodeBox>
        ) : me.seat_limit <= 1 ? (
          <Pressable onPress={onUpgrade} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Text style={styles.link}>Bireysel pakette ekip yok. Ekip için Klinik paketine geç (10 uzmana kadar)</Text>
          </Pressable>
        ) : team.length < me.seat_limit ? (
          <View style={{ alignItems: 'flex-start' }}>
            <SmallButton label="Ekibe uzman davet et" onPress={create} busy={busy && !joining} />
          </View>
        ) : (
          <Text style={styles.small}>Koltuk sınırı dolu.</Text>
        ))}
        {canJoin && (joining ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.small}>Başka bir kliniğin ekibine katıl: sahibinden aldığın 8 karakterli kodu yaz. Bu boş klinik kapanır.</Text>
            <Input value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="Ekip kodu" autoCapitalize="characters" maxLength={8} />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <SmallButton label="Katıl" onPress={join} busy={busy} />
              <SmallButton label="Vazgeç" onPress={() => setJoining(false)} />
            </View>
          </View>
        ) : (
          <Pressable onPress={() => setJoining(true)} hitSlop={8} style={{ alignSelf: 'flex-start' }}>
            <Text style={styles.link}>Ekip kodun mu var? Başka bir kliniğin ekibine katıl</Text>
          </Pressable>
        ))}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, marginTop: 2 },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: colors.navy },
  memberInfo: { gap: 4, paddingBottom: 10, marginBottom: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
});
