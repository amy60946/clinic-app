import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Card, Label, Input, SmallButton } from '../components/ui';
import { ClinicianMe, Client, Member, updateProfile, updateClinicName } from '../lib/clinic';
import { billingStatus, daysLeft, packageName } from '../lib/billing';
import { track } from '../lib/track';
import TeamCard from './TeamCard';

const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

// Ayarlar (ana ekranda sağ üstteki ad): kişisel bilgiler, klinik adı, ekip, üyelik, danışanlar, yasal ve hesap.
export default function SettingsScreen({
  me, team, clients, email, solo, verified, onBack, onChanged, onPlans, onOpenClient, onSample, onLegal, onGuide, onLogout, onDelete, legalOn,
}: {
  me: ClinicianMe; team: Member[]; clients: Client[]; email: string; solo: boolean; verified: boolean; legalOn: boolean;
  onBack: () => void; onChanged: () => void; onPlans: () => void; onOpenClient: (c: Client) => void; onSample: () => void;
  onLegal: () => void; onGuide: () => void; onLogout: () => void; onDelete: () => void;
}) {
  const owner = me.role === 'owner';
  const [name, setName] = useState(me.name);
  const [title, setTitle] = useState(me.title);
  const [clinic, setClinic] = useState(me.clinic);
  const [busy, setBusy] = useState<string | null>(null);
  const st = billingStatus(me);

  const saveProfile = () => {
    if (!name.trim()) return Alert.alert('Adını yaz.');
    const go = async () => {
      setBusy('profile');
      try {
        // bireysel hesapta çalışma alanının adı uzmanın adıdır; ad değişince o da değişir
        await updateProfile(me.id, name, title);
        if (solo && owner && me.clinic.trim() === me.name.trim()) await updateClinicName(me.clinic_id, name);
        track('settings.profile');
        onChanged();
        Alert.alert('Kaydedildi');
      } catch (e) {
        Alert.alert('Kaydedilemedi', (e as Error).message);
      } finally {
        setBusy(null);
      }
    };
    if (verified && name.trim() !== me.name.trim()) {
      return Alert.alert('Adın değişsin mi?', 'Belge incelemesi adına göre yapıldı; ad değişince "Belgesi incelendi" rozeti kalkar, yeniden belge yüklemen gerekir.',
        [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Değiştir', onPress: go }]);
    }
    go();
  };

  const saveClinic = async () => {
    if (!clinic.trim()) return Alert.alert('Kliniğin adını yaz.');
    setBusy('clinic');
    try {
      await updateClinicName(me.clinic_id, clinic);
      track('settings.clinic');
      onChanged();
      Alert.alert('Kaydedildi');
    } catch (e) {
      Alert.alert('Kaydedilemedi', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const responsible = (c: Client) => (c.clinician_id ? (c.clinician_id === me.id ? 'sen' : c.clinician_name || team.find((m) => m.id === c.clinician_id)?.name || '') : '');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={styles.column}>
          <View style={styles.header}>
            <Pressable onPress={onBack} accessibilityLabel="Geri" hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.navy} />
            </Pressable>
            <Text style={styles.title}>Ayarlar</Text>
          </View>

          <Text style={styles.section}>Kişisel bilgiler</Text>
          <Label>Adın soyadın</Label>
          <Input value={name} onChangeText={setName} placeholder="Adın soyadın" maxLength={80} autoComplete="name" />
          <Label>Unvanın</Label>
          <Input value={title} onChangeText={setTitle} placeholder="Ör. Klinik Psikolog" maxLength={80} />
          <Text style={[styles.small, { marginTop: 8 }]}>Aileler bu ad ve unvanı davet e-postasında ve ParentApp › Uzmanım'da görür.</Text>
          <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
            <SmallButton label="Kaydet" onPress={saveProfile} busy={busy === 'profile'} />
          </View>

          {!solo && (
            <>
              <Text style={styles.section}>Klinik</Text>
              {owner ? (
                <>
                  <Label>Kliniğin adı</Label>
                  <Input value={clinic} onChangeText={setClinic} placeholder="Kliniğin adı" maxLength={120} />
                  <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
                    <SmallButton label="Klinik adını kaydet" onPress={saveClinic} busy={busy === 'clinic'} />
                  </View>
                </>
              ) : <Card><Text style={styles.body}>{me.clinic}</Text></Card>}
              <TeamCard me={me} team={team} onJoined={onChanged} onUpgrade={onPlans} />
            </>
          )}

          <Text style={styles.section}>Üyelik</Text>
          <Pressable onPress={onPlans} accessibilityRole="button" style={({ pressed }) => [styles.rowCard, pressed && { opacity: 0.85 }]}>
            <Ionicons name={st === 'trial' ? 'time-outline' : 'ribbon-outline'} size={20} color={colors.navy} />
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>
                {st === 'trial' ? `Ücretsiz deneme · ${daysLeft(me.trial_ends_at)} gün kaldı`
                  : st === 'expired' ? (me.plan === 'trial' ? 'Deneme süresi bitti' : 'Üyelik sona erdi') : `${packageName(me)} paket`}
              </Text>
              <Text style={styles.small}>{owner ? 'Paketleri gör, üyeliği yönet' : 'Üyeliği klinik sahibi yönetir'}</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.faint} />
          </Pressable>

          <Text style={styles.section}>{`Danışanlar (${clients.length})`}</Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {clients.length === 0 ? <Text style={[styles.small, { padding: 16 }]}>Henüz danışan yok.</Text> : clients.map((c, i) => (
              <Pressable key={c.link_id} onPress={() => onOpenClient(c)} accessibilityRole="button"
                style={({ pressed }) => [styles.tr, i > 0 && styles.line, pressed && { backgroundColor: '#F7F8FA' }]}>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.rowTitle}>{c.child_name || 'Adsız'}{c.label ? ` · ${c.label}` : ''}</Text>
                  <Text style={styles.small}>
                    {[c.parents && `Ebeveyn: ${c.parents}`, `Eklendi ${dateText(c.consent_at)}`, team.length > 1 && responsible(c) && `Sorumlu: ${responsible(c)}`]
                      .filter(Boolean).join(' · ')}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Pressable>
            ))}
          </Card>

          <Text style={styles.section}>Hesap</Text>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {[
              ...(legalOn ? [{ label: 'Yasal ve gizlilik', icon: 'shield-checkmark-outline' as const, on: onLegal }] : []),
              { label: 'Nasıl kullanılır?', icon: 'help-circle-outline' as const, on: onGuide },
              { label: 'Örnek aileyi aç', icon: 'sparkles-outline' as const, on: onSample },
              { label: 'Çıkış yap', icon: 'log-out-outline' as const, on: onLogout },
            ].map((x, i) => (
              <Pressable key={x.label} onPress={x.on} accessibilityRole="button" style={({ pressed }) => [styles.tr, i > 0 && styles.line, pressed && { backgroundColor: '#F7F8FA' }]}>
                <Ionicons name={x.icon} size={18} color={colors.navy} />
                <Text style={[styles.body, { flex: 1 }]}>{x.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Pressable>
            ))}
          </Card>
          <Pressable onPress={onDelete} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 20 }} accessibilityRole="button">
            <Text style={[styles.link, { color: colors.danger }]}>Hesabı sil</Text>
          </Pressable>
          {!!email && <Text style={styles.foot}>{`Giriş: ${email}`}</Text>}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 16, paddingBottom: 48, flexGrow: 1 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 4 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: '700', color: colors.navy },
  section: { fontSize: 16, fontWeight: '700', color: colors.navy, marginTop: 28, marginBottom: 4 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  rowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.today, borderRadius: radius.md, padding: 14 },
  rowTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  tr: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  foot: { fontSize: 11, color: colors.faint, marginTop: 16 },
});
