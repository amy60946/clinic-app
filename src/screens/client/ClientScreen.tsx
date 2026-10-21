import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Notice, Segmented, SmallButton } from '../../components/ui';
import Bell from '../../components/Bell';
import NotificationsSheet, { notificationTab } from '../NotificationsSheet';
import { useNotifications } from '../../lib/notificationsContext';
import { AppNotification, notificationChildren } from '../../lib/notifications';
import { track } from '../../lib/track';
import { Client, ClientData, ClinicianMe, loadClientData, revokeLink } from '../../lib/clinic';
import { isoDate, windowStarts } from '../../lib/metrics';
import { SummaryTab, RoutineTab, AbcTab } from './ObservationTabs';
import GoalsTab from './GoalsTab';
import NotesTab from './NotesTab';
import SuggestionsTab from './SuggestionsTab';
import ReportTab from './ReportTab';

export type Tab = 'summary' | 'routine' | 'abc' | 'goals' | 'notes' | 'suggestions' | 'report';

// Sekmeler (kullanıcı kararı 21 Ekim 2026): Dönem seçicisi gibi gri zeminli seçici, kaydırma yok.
// Telefonda iki satır (4 + 3), geniş ekranda tek satır.
const TABS: { id: Tab; label: string }[] = [
  { id: 'summary', label: 'Özet' },
  { id: 'routine', label: 'Rutin' },
  { id: 'abc', label: 'Zor anlar' },
  { id: 'goals', label: 'Hedefler' },
  { id: 'notes', label: 'Notlar' },
  { id: 'suggestions', label: 'Öneriler' },
  { id: 'report', label: 'Rapor' },
];

export const MAX_WEEKS = 8;

export function ageText(birthday: string | null): string {
  if (!birthday) return '';
  const b = new Date(birthday);
  const n = new Date();
  let y = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) y -= 1;
  return `${y} yaş`;
}

export type ClientCtx = {
  client: Client;
  me: ClinicianMe;
  data: ClientData;
  today: string;
  weeks: number;
};

export default function ClientScreen({ client, me, initialTab = 'summary', onBack, onRevoked, onOpenNotification }: {
  client: Client; me: ClinicianMe; initialTab?: Tab; onBack: () => void; onRevoked: () => void;
  onOpenNotification: (n: AppNotification) => void;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [bell, setBell] = useState(false);
  const { items, unreadByChild, markRead } = useNotifications();
  // Açılan sekmenin bu çocuğa ait okunmamış bildirimleri okunmuş sayılır (ör. Zor anlar açılınca zor an bildirimleri)
  useEffect(() => {
    const ids = items.filter((n) => !n.readAt && notificationTab(n.kind) === tab && notificationChildren(n).includes(client.child_id)).map((n) => n.id);
    if (ids.length) markRead(ids);
  }, [tab, items, client.child_id, markRead]);
  useEffect(() => { track('screen.client', { tab }); }, [tab]);
  // Sekmede okunmamış bildirim işareti
  const tabDots = useMemo(() => {
    const out: Partial<Record<Tab, boolean>> = {};
    items.forEach((n) => { if (!n.readAt && notificationChildren(n).includes(client.child_id)) out[notificationTab(n.kind)] = true; });
    return out;
  }, [items, client.child_id]);
  const [weeks, setWeeks] = useState<'4' | '8'>('4');
  const [data, setData] = useState<ClientData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = useMemo(() => isoDate(new Date()), []);

  const load = useCallback(async () => {
    try {
      setData(await loadClientData(client.child_id, windowStarts(today, MAX_WEEKS + 1)[0]));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [client.child_id, today]);

  useEffect(() => { load(); }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const revoke = () => {
    Alert.alert('Paylaşımı sonlandır', `${client.child_name} için erişimin hemen biter. Notların ve hedeflerin klinikte kalır. Yeniden görmek için ailenin yeni bir kod girmesi gerekir.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sonlandır', style: 'destructive',
        onPress: () => revokeLink(client.link_id).then(onRevoked).catch((e) => Alert.alert('Sonlandırılamadı', (e as Error).message)),
      },
    ]);
  };

  // Çocuk satırı görünmüyorsa rıza geri alınmıştır (RLS)
  const revoked = data && !data.child;
  const ctx: ClientCtx | null = data && data.child ? { client, me, data, today, weeks: Number(weeks) } : null;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
      >
        <View style={styles.column}>
          <View style={styles.header}>
            <Pressable onPress={onBack} accessibilityLabel="Danışanlar" hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="chevron-back" size={20} color={colors.navy} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>{client.child_name || 'Adsız'}{client.label ? ` · ${client.label}` : ''}</Text>
              <Text style={styles.subtitle}>
                {[ageText(data?.child?.birthday ?? null), `Ebeveyn onayı ${new Date(client.consent_at).toLocaleDateString('tr-TR')}`]
                  .filter(Boolean).join(' · ')}
              </Text>
            </View>
            <Pressable onPress={refresh} accessibilityLabel="Yenile" hitSlop={8} style={styles.iconBtn}>
              <Ionicons name="refresh" size={18} color={colors.navy} />
            </Pressable>
            <Bell count={unreadByChild[client.child_id] ?? 0} onPress={() => setBell(true)} />
          </View>

          {!data && !error && <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} />}
          {error && <Notice icon="alert-circle-outline" text={`Yüklenemedi: ${error}`} />}
          {revoked && <Notice icon="lock-closed-outline" text="Ebeveyn paylaşımı durdurmuş. Bu çocuğun verisine artık erişilemez." />}

          {ctx && (
            <>
              <TabGrid value={tab} onChange={setTab} dots={tabDots} />
              {['summary', 'routine', 'abc', 'report'].includes(tab) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
                  <Text style={styles.small}>Dönem</Text>
                  <View style={{ flex: 1, maxWidth: 220 }}>
                    <Segmented options={[{ id: '4', label: '4 hafta' }, { id: '8', label: '8 hafta' }]} value={weeks} onChange={setWeeks} />
                  </View>
                </View>
              )}
              <View style={{ marginTop: 8 }}>
                {tab === 'summary' && <SummaryTab {...ctx} />}
                {tab === 'routine' && <RoutineTab {...ctx} />}
                {tab === 'abc' && <AbcTab {...ctx} />}
                {tab === 'goals' && <GoalsTab {...ctx} />}
                {tab === 'notes' && <NotesTab {...ctx} />}
                {tab === 'suggestions' && <SuggestionsTab {...ctx} />}
                {tab === 'report' && <ReportTab {...ctx} />}
              </View>
              <View style={{ marginTop: 32, alignItems: 'flex-start' }}>
                <SmallButton label="Paylaşımı sonlandır" danger onPress={revoke} />
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <NotificationsSheet
        visible={bell} onClose={() => setBell(false)} childId={client.child_id} childName={client.child_name}
        onOpen={(n) => {
          setBell(false);
          // Bu danışanın bildirimi: ilgili sekmeye geç; başka danışan ya da ekip: ana ekran yönlendirir
          if (notificationChildren(n).includes(client.child_id) && n.kind !== 'clinic_revoked') setTab(notificationTab(n.kind));
          else onOpenNotification(n);
        }}
      />
    </SafeAreaView>
  );
}

// Dönem seçicisiyle aynı görünüm; telefonda 4 + 3, geniş ekranda 7 yan yana. Okunmamış bildirim olan sekmede nokta.
function TabGrid({ value, onChange, dots }: { value: Tab; onChange: (t: Tab) => void; dots: Partial<Record<Tab, boolean>> }) {
  const { width } = useWindowDimensions();
  const wide = width >= 700;
  const rows = wide ? [TABS] : [TABS.slice(0, 4), TABS.slice(4)];
  return (
    <View style={styles.grid} accessibilityRole="tablist">
      {rows.map((row, i) => (
        <View key={i} style={styles.gridRow}>
          {row.map((t) => {
            const on = t.id === value;
            return (
              <Pressable key={t.id} onPress={() => onChange(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                style={[styles.gridItem, on && styles.gridActive]}>
                <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: on ? '700' : '500', color: on ? colors.navy : colors.muted }}>{t.label}</Text>
                {dots[t.id] && <View style={styles.tabDot} />}
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, flexGrow: 1 },
  grid: { backgroundColor: '#ECEEF3', borderRadius: 10, padding: 3, gap: 3 },
  gridRow: { flexDirection: 'row', gap: 3 },
  gridItem: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 9, borderRadius: 8 },
  gridActive: { backgroundColor: '#fff' },
  tabDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  column: { width: '100%', maxWidth: 960, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  small: { fontSize: 12, color: colors.muted },
});
