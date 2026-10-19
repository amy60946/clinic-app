import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Card, Label, Input, Cta, Notice } from '../components/ui';
import { useAuth } from '../lib/auth';
import {
  clinicianMe, listClients, createFamilyInvite, ClinicNotInstalled, ClinicianMe, Client, Invite,
} from '../lib/clinic';

type State =
  | { kind: 'loading' }
  | { kind: 'not_installed' }
  | { kind: 'not_clinician' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; me: ClinicianMe; clients: Client[] };

const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

function planText(me: ClinicianMe) {
  if (me.plan === 'trial') {
    return me.active ? `Deneme sürümü · ${dateText(me.trial_ends_at)} tarihine kadar` : 'Deneme süresi bitti';
  }
  if (me.plan === 'inactive') return 'Abonelik etkin değil';
  return `Plan: ${me.plan} · ${me.seat_limit} uzman`;
}

export default function HomeScreen() {
  const { signOut } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const me = await clinicianMe();
      if (!me) return setState({ kind: 'not_clinician' });
      setState({ kind: 'ready', me, clients: await listClients() });
    } catch (e) {
      if (e instanceof ClinicNotInstalled) setState({ kind: 'not_installed' });
      else setState({ kind: 'error', message: (e as Error).message });
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
      >
        <View style={styles.column}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>ClinicApp</Text>
              <Text style={styles.title}>{state.kind === 'ready' ? state.me.clinic : 'Uzman paneli'}</Text>
              {state.kind === 'ready' && (
                <Text style={styles.subtitle}>
                  {[state.me.name, state.me.title].filter(Boolean).join(' · ')}{'\n'}{planText(state.me)}
                </Text>
              )}
            </View>
            <Pressable onPress={signOut} accessibilityLabel="Çıkış yap" hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="log-out-outline" size={20} color={colors.navy} />
            </Pressable>
          </View>

          {state.kind === 'loading' && <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} />}
          {state.kind === 'not_installed' && (
            <Notice icon="construct-outline" text="Klinik veritabanı henüz kurulmadı. Klinik SQL'i Supabase'e uygulanınca bu panel açılır." />
          )}
          {state.kind === 'not_clinician' && (
            <Notice icon="person-outline" text="Bu hesap uzman hesabı değil. ParentApp hesabıyla ClinicApp'e girilemez; uzman olarak ayrı bir e-postayla kayıt ol." />
          )}
          {state.kind === 'error' && <Notice icon="alert-circle-outline" text={`Yüklenemedi: ${state.message}`} />}

          {state.kind === 'ready' && (
            <>
              <InviteCard onCreated={refresh} />
              <Label>{`Danışanlar (${state.clients.length})`}</Label>
              {state.clients.length === 0 ? (
                <Notice icon="people-outline" text="Henüz paylaşım yok. Aileye bir paylaşım kodu ver; ebeveyn ParentApp'te kodu girip onay verince çocuk burada görünür." />
              ) : (
                <View style={{ gap: 8 }}>
                  {state.clients.map((c) => (
                    <Card key={c.link_id} style={styles.client}>
                      <View style={styles.initial}>
                        <Text style={{ fontWeight: '700', color: colors.navy }}>{(c.child_name || '?').slice(0, 1).toUpperCase()}</Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.clientName}>{c.child_name || 'Adsız'}{c.label ? ` · ${c.label}` : ''}</Text>
                        <Text style={styles.small}>Ebeveyn onayı: {dateText(c.consent_at)}</Text>
                      </View>
                    </Card>
                  ))}
                </View>
              )}
              <Text style={styles.footnote}>
                Bu panel gözlem toplar, tanı koymaz. Ebeveyn paylaşımı istediği an durdurabilir; o an erişim biter.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function InviteCard({ onCreated }: { onCreated: () => void }) {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);

  const create = async () => {
    setBusy(true);
    try {
      setInvite(await createFamilyInvite(label));
      setLabel('');
      onCreated();
    } catch (e) {
      Alert.alert('Kod üretilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Label>Aileyi davet et</Label>
      <Card style={{ gap: 12 }}>
        <Text style={styles.body}>
          Ebeveyn bu kodu ParentApp › Aile › Hesap › Uzmanım bölümüne yazar ve hangi çocuğunu paylaşacağını seçer. Kod 7 gün geçerli, tek kullanımlık.
        </Text>
        {invite ? (
          <View style={styles.codeRow}>
            <Text style={styles.code}>{invite.code}</Text>
            <Pressable
              onPress={() => Clipboard.setStringAsync(invite.code).then(() => Alert.alert('Kopyalandı'))}
              accessibilityLabel="Kodu kopyala" hitSlop={8} style={styles.iconBtn}
            >
              <Ionicons name="copy-outline" size={18} color={colors.navy} />
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setInvite(null)} hitSlop={8}>
              <Text style={styles.link}>Yeni kod</Text>
            </Pressable>
          </View>
        ) : (
          <>
            <Input value={label} onChangeText={setLabel} placeholder="Kendi notun (ör. danışanın takma adı) — isteğe bağlı" maxLength={60} />
            <Cta label="Paylaşım kodu üret" onPress={create} busy={busy} />
          </>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 16, flexGrow: 1 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 8 },
  brand: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '700', color: colors.navy, marginTop: 6 },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, marginTop: 2 },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: colors.navy },
  client: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md },
  initial: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.today, alignItems: 'center', justifyContent: 'center' },
  clientName: { fontSize: 15, fontWeight: '600', color: colors.text },
  footnote: { fontSize: 11, color: colors.muted, marginTop: 24, lineHeight: 16 },
});
