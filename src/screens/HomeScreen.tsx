import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Card, Label, Input, Cta, Notice, SmallButton } from '../components/ui';
import { useAuth } from '../lib/auth';
import {
  clinicianMe, listClients, listTeam, createFamilyInvite, createTeamInvite, joinTeam, ClinicNotInstalled, ClinicianMe, Client, Invite, Member,
} from '../lib/clinic';
import ClientScreen, { Tab } from './client/ClientScreen';
import NotificationsSheet, { notificationTab } from './NotificationsSheet';
import Bell from '../components/Bell';
import { useNotifications } from '../lib/notificationsContext';
import { AppNotification, notificationChildren, onNotificationTap, unregisterPush } from '../lib/notifications';
import { track, flush } from '../lib/track';

type State =
  | { kind: 'loading' }
  | { kind: 'not_installed' }
  | { kind: 'not_clinician' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; me: ClinicianMe; clients: Client[]; team: Member[] };

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
  const stateRef = useRef(state);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<{ client: Client; tab: Tab; key: number } | null>(null);
  const [bell, setBell] = useState(false);
  const { unread, unreadByChild } = useNotifications();
  const pending = useRef<Pick<AppNotification, 'kind' | 'data' | 'childId'> | null>(null);

  const load = useCallback(async (): Promise<State> => {
    let next: State;
    try {
      const me = await clinicianMe();
      if (!me) next = { kind: 'not_clinician' };
      else {
        const [clients, team] = await Promise.all([listClients(), listTeam()]);
        next = { kind: 'ready', me, clients, team };
      }
    } catch (e) {
      next = e instanceof ClinicNotInstalled ? { kind: 'not_installed' } : { kind: 'error', message: (e as Error).message };
    }
    setState(next);
    stateRef.current = next;
    return next;
  }, []);

  useEffect(() => { load(); track('screen.home'); }, [load]);
  useEffect(() => { stateRef.current = state; }, [state]);

  // Bildirime dokununca ilgili danışan ve sekme. Danışan listede yoksa (yeni paylaşım) liste yenilenip tekrar aranır.
  const openTarget = useCallback(async (n: Pick<AppNotification, 'kind' | 'data' | 'childId'>) => {
    setBell(false);
    if (n.kind === 'team_joined') { setSelected(null); load(); return; }
    const ids = notificationChildren(n);
    if (!ids.length) return;
    let st = stateRef.current;
    let c = st.kind === 'ready' ? st.clients.find((x) => ids.includes(x.child_id)) : undefined;
    if (!c) {
      st = await load();
      c = st.kind === 'ready' ? st.clients.find((x) => ids.includes(x.child_id)) : undefined;
    }
    if (!c) {
      if (st.kind === 'loading') { pending.current = n; return; }
      Alert.alert('Danışan bulunamadı', n.kind === 'clinic_revoked'
        ? 'Aile bu paylaşımı durdurdu; çocuğun verisine artık erişilemez.'
        : 'Bu çocuğun paylaşımı artık etkin değil.');
      return;
    }
    setSelected({ client: c, tab: notificationTab(n.kind), key: Date.now() });
  }, [load]);

  // Telefon bildirimine dokunma (uygulama kapalıyken de)
  useEffect(() => onNotificationTap((data) => {
    const n = { kind: String(data.kind ?? ''), data, childId: typeof data.child_id === 'string' ? data.child_id : undefined };
    if (stateRef.current.kind === 'ready') openTarget(n);
    else pending.current = n;
  }), [openTarget]);
  useEffect(() => {
    if (state.kind === 'ready' && pending.current) {
      const n = pending.current;
      pending.current = null;
      openTarget(n);
    }
  }, [state, openTarget]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  if (selected && state.kind === 'ready') {
    return (
      <ClientScreen
        key={selected.key}
        client={selected.client} me={state.me} initialTab={selected.tab}
        onBack={() => { setSelected(null); load(); }}
        onRevoked={() => { setSelected(null); load(); }}
        onOpenNotification={openTarget}
      />
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
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
            {state.kind === 'ready' && <Bell count={unread} onPress={() => setBell(true)} />}
            <Pressable onPress={async () => {
              // Çıkmadan önce bekleyen kullanım olayları gönderilir ve bu cihaza push kapatılır
              await flush().catch(() => {});
              await unregisterPush().catch(() => {});
              signOut();
            }} accessibilityLabel="Çıkış yap" hitSlop={8} style={styles.iconBtn}>
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
              <ClientList clients={state.clients} unread={unreadByChild} onOpen={(c) => setSelected({ client: c, tab: 'summary', key: Date.now() })} />
              <InviteCard onCreated={refresh} />
              <TeamCard me={state.me} team={state.team} onJoined={refresh} />
              <Text style={styles.footnote}>
                Bu panel gözlem toplar, tanı koymaz. Ebeveyn paylaşımı istediği an durdurabilir; o an erişim biter.
              </Text>
            </>
          )}
        </View>
      </ScrollView>
      <NotificationsSheet visible={bell} onClose={() => setBell(false)} onOpen={openTarget} />
    </SafeAreaView>
  );
}

// Danışan listesi: aynı adlı çocuklar ebeveyn adıyla ayırt edilir; çok danışanda ad / ebeveyn / etiketle arama
// Sağda: okunmamış bildirim zili (sayılı) + ok. Çok danışanda içine girmeden hangisinde bildirim olduğu görünür.
function ClientList({ clients, unread, onOpen }: { clients: Client[]; unread: Record<string, number>; onOpen: (c: Client) => void }) {
  const [q, setQ] = useState('');
  const query = q.trim().toLocaleLowerCase('tr');
  const shown = query
    ? clients.filter((c) => `${c.child_name} ${c.parents} ${c.label}`.toLocaleLowerCase('tr').includes(query))
    : clients;
  return (
    <>
      <Label>{`Danışanlar (${clients.length})`}</Label>
      {clients.length === 0 ? (
        <Notice icon="people-outline" text="Henüz paylaşım yok. Aşağıdan aileye bir paylaşım kodu ver; ebeveyn ParentApp'te kodu girip onay verince çocuk burada görünür." />
      ) : (
        <>
          {clients.length > 3 && (
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Çocuk ya da ebeveyn adı ara" placeholderTextColor={colors.muted}
                style={{ flex: 1, fontSize: 15, color: colors.navy }} autoCorrect={false} />
            </View>
          )}
          <View style={styles.list}>
            {shown.length === 0 && <Text style={[styles.small, { padding: 16 }]}>Sonuç bulunamadı.</Text>}
            {shown.map((c, i) => (
              <Pressable key={c.link_id} onPress={() => onOpen(c)} accessibilityRole="button"
                style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: '#F7F8FA' }]}>
                <View style={styles.initial}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.navy }}>{(c.child_name || '?').slice(0, 1).toLocaleUpperCase('tr-TR')}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={styles.clientName}>{c.child_name || 'Adsız'}</Text>
                    {!!c.label && <Text style={styles.tag} numberOfLines={1}>{c.label}</Text>}
                  </View>
                  {!!c.parents && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="person-outline" size={13} color={colors.muted} />
                      <Text style={styles.parents} numberOfLines={1}>{c.parents}</Text>
                    </View>
                  )}
                  <Text style={styles.small}>Ebeveyn onayı: {dateText(c.consent_at)}</Text>
                </View>
                <Bell count={unread[c.child_id] ?? 0} small />
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </>
  );
}

function TeamCard({ me, team, onJoined }: { me: ClinicianMe; team: Member[]; onJoined: () => void }) {
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
    if (code.trim().length !== 6) return Alert.alert('Ekip kodu 6 karakterdir.');
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
            <Text style={styles.small}>Kliniğin bütün danışanlarını görürsün; bildirimler danışanın sorumlu uzmanına gider.</Text>
          </View>
        )}
        {team.map((m) => (
          <Text key={m.id} style={styles.body}>
            {m.name || 'Adsız'}{m.title ? ` · ${m.title}` : ''}{m.role === 'owner' ? ' · sahip' : ''}{m.id === me.id ? ' (sen)' : ''}
          </Text>
        ))}
        {me.role === 'owner' && (invite ? (
          <View style={styles.codeRow}>
            <Text style={styles.code}>{invite.code}</Text>
            <Pressable
              onPress={() => Clipboard.setStringAsync(invite.code).then(() => Alert.alert('Kopyalandı'))}
              accessibilityLabel="Kodu kopyala" hitSlop={8} style={styles.iconBtn}
            >
              <Ionicons name="copy-outline" size={18} color={colors.navy} />
            </Pressable>
            <Text style={[styles.small, { flex: 1 }]}>Yeni uzman ClinicApp girişinde "Ekip kodum var" seçip bu kodu yazar. 7 gün geçerli.</Text>
          </View>
        ) : team.length < me.seat_limit ? (
          <View style={{ alignItems: 'flex-start' }}>
            <SmallButton label="Ekibe uzman davet et" onPress={create} busy={busy && !joining} />
          </View>
        ) : (
          <Text style={styles.small}>Koltuk sınırı dolu.</Text>
        ))}
        {canJoin && (joining ? (
          <View style={{ gap: 8 }}>
            <Text style={styles.small}>Başka bir kliniğin ekibine katıl: sahibinden aldığın 6 karakterli kodu yaz. Bu boş klinik kapanır.</Text>
            <Input value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="Ekip kodu" autoCapitalize="characters" maxLength={6} />
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

function InviteCard({ onCreated }: { onCreated: () => void }) {
  const [label, setLabel] = useState('');
  const [busy, setBusy] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);

  const create = async () => {
    setBusy(true);
    try {
      setInvite(await createFamilyInvite(label));
      track('invite.family');
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
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  brand: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '700', color: colors.navy, marginTop: 6 },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, marginTop: 2 },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  codeRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  code: { fontSize: 28, fontWeight: '800', letterSpacing: 4, color: colors.navy },
  memberInfo: { gap: 4, paddingBottom: 10, marginBottom: 2, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  initial: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.today, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  parents: { fontSize: 13, color: colors.text, flexShrink: 1 },
  tag: { fontSize: 11, fontWeight: '600', color: colors.navy, backgroundColor: colors.today, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', maxWidth: 180 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14, height: 44, marginBottom: 8 },
  clientName: { fontSize: 15, fontWeight: '600', color: colors.text },
  footnote: { fontSize: 11, color: colors.muted, marginTop: 24, lineHeight: 16 },
});
