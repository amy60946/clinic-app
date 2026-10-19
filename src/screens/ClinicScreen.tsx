import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { Card, Button, Field, Initials, Pill, Label } from '../components/ui';
import { useAuth } from '../lib/auth';
import { useData } from '../lib/data';
import { team, invites, renameClinic, updateMe, Member, Invite } from '../lib/api';
import { dateTR } from '../lib/format';
import { InviteSheet } from './ClientsScreen';

const PLAN: Record<string, string> = { trial: 'Deneme', small: 'Küçük ekip', business: 'İşletme', custom: 'Kurumsal', inactive: 'Pasif' };

export default function ClinicScreen() {
  const { me, reloadMe, signOut } = useAuth();
  const { clients } = useData();
  const [members, setMembers] = useState<Member[]>([]);
  const [codes, setCodes] = useState<Invite[]>([]);
  const [clinicName, setClinicName] = useState(me?.clinic ?? '');
  const [name, setName] = useState(me?.name ?? '');
  const [title, setTitle] = useState(me?.title ?? '');
  const [busy, setBusy] = useState<string | null>(null);
  const [teamInvite, setTeamInvite] = useState(false);

  const load = useCallback(async () => {
    if (!me) return;
    try { setMembers(await team(me.clinicId)); setCodes(await invites(me.clinicId)); } catch { /* sonra tekrar dener */ }
  }, [me]);
  useEffect(() => { load(); }, [load]);
  if (!me) return null;

  const owner = me.role === 'owner';
  const trialDays = Math.max(0, Math.ceil((new Date(me.trialEndsAt).getTime() - Date.now()) / 864e5));
  const openCodes = codes.filter((c) => !c.usedAt && c.expiresAt > new Date().toISOString());

  const save = async (what: 'clinic' | 'me') => {
    setBusy(what);
    try {
      if (what === 'clinic') await renameClinic(me.clinicId, clinicName);
      else await updateMe(me.id, { name: name.trim(), title: title.trim() });
      await reloadMe();
      Alert.alert('Kaydedildi');
    } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); }
    finally { setBusy(null); }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.title}>Klinik</Text>

        <Card style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={styles.h}>Plan</Text>
            <Pill text={me.active ? PLAN[me.plan] ?? me.plan : 'Pasif'} tone={me.active ? 'good' : 'bad'} />
          </View>
          {me.plan === 'trial' && <Text style={styles.body}>{trialDays > 0 ? `Deneme süresinin bitmesine ${trialDays} gün var.` : 'Deneme süresi bitti.'}</Text>}
          <Text style={styles.cap}>{members.length}/{me.seatLimit} uzman koltuğu · {clients.length} etkin danışan</Text>
          <Text style={styles.cap}>
            Klinik planı uzman başına aylık ücretlidir. Bağlı aileler ParentApp'in ücretli özelliklerini kliniğiniz üzerinden ücretsiz kullanır.
            Ödeme ve plan değişikliği yakında bu ekrandan yapılacak.
          </Text>
        </Card>

        <Label>Klinik bilgisi</Label>
        <Card style={{ gap: 12 }}>
          <Field label="Klinik adı" value={clinicName} onChangeText={setClinicName} editable={owner} />
          {owner ? <Button title="Kaydet" kind="ghost" onPress={() => save('clinic')} busy={busy === 'clinic'} />
            : <Text style={styles.cap}>Klinik adını yalnızca klinik sahibi değiştirebilir.</Text>}
        </Card>

        <Label>Profilim</Label>
        <Card style={{ gap: 12 }}>
          <Field label="Ad soyad" value={name} onChangeText={setName} />
          <Field label="Unvan" value={title} onChangeText={setTitle} />
          <Text style={styles.cap}>Aileler kodu girdiğinde adını ve unvanını görür.</Text>
          <Button title="Kaydet" kind="ghost" onPress={() => save('me')} busy={busy === 'me'} />
        </Card>

        <Label>Ekip</Label>
        <Card style={{ gap: 0, paddingVertical: 4 }}>
          {members.map((m, i) => (
            <View key={m.id} style={[styles.member, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line }]}>
              <Initials name={m.name} />
              <View style={{ flex: 1 }}>
                <Text style={styles.body}>{m.name || 'İsimsiz'}{m.id === me.id ? ' (sen)' : ''}</Text>
                {!!m.title && <Text style={styles.cap}>{m.title}</Text>}
              </View>
              {m.role === 'owner' && <Pill text="Sahip" />}
            </View>
          ))}
        </Card>
        {owner && <Button title="Ekibe uzman davet et" kind="ghost" icon="person-add-outline" onPress={() => setTeamInvite(true)} style={{ marginTop: 10 }} />}

        {openCodes.length > 0 && (
          <>
            <Label>Kullanılmamış kodlar</Label>
            <Card style={{ gap: 8 }}>
              {openCodes.map((c) => (
                <View key={c.code} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '800', letterSpacing: 3, color: colors.navy, width: 92 }}>{c.code}</Text>
                  <Text style={[styles.cap, { flex: 1 }]} numberOfLines={1}>{c.kind === 'family' ? 'Aile' : 'Ekip'}{c.label ? ` · ${c.label}` : ''}</Text>
                  <Text style={styles.cap}>{dateTR(c.expiresAt)}</Text>
                </View>
              ))}
            </Card>
          </>
        )}

        <Label>Veri ve gizlilik</Label>
        <Card style={{ gap: 6 }}>
          <Text style={styles.body}>Danışan verisi yalnız ebeveynin açık rızasıyla görünür; ebeveyn rızayı ParentApp'ten her an geri alabilir.</Text>
          <Text style={styles.cap}>Görünen: görevler, tamamlanma saatleri, "yapamam" nedenleri, ebeveynin kaydettiği zor anlar. Görünmeyen: aile mesajları, fotoğraf ve sesler, coin bakiyesi.</Text>
        </Card>

        <Button title="Çıkış yap" kind="danger" onPress={() => Alert.alert('Çıkış yapılsın mı?', '', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Çıkış yap', style: 'destructive', onPress: signOut }])} style={{ marginTop: 24 }} />
        <InviteSheet visible={teamInvite} kind="clinician" onClose={() => { setTeamInvite(false); load(); }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 20, paddingBottom: 48, maxWidth: 680, width: '100%', alignSelf: 'center' },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy, marginBottom: 14 },
  h: { fontSize: 15, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  cap: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
});
