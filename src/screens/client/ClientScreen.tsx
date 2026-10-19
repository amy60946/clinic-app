import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Notice, Segmented, SmallButton, ChipBar } from '../../components/ui';
import { Client, ClientData, ClinicianMe, loadClientData, revokeLink } from '../../lib/clinic';
import { isoDate, windowStarts } from '../../lib/metrics';
import { SummaryTab, RoutineTab, AbcTab } from './ObservationTabs';
import GoalsTab from './GoalsTab';
import NotesTab from './NotesTab';
import SuggestionsTab from './SuggestionsTab';
import ReportTab from './ReportTab';

type Tab = 'summary' | 'routine' | 'abc' | 'goals' | 'notes' | 'suggestions' | 'report';

// Sekmeler yana kaydırılan çip çubuğu: telefonda alt satıra kaymaz, iPad/web'de tek satırda sığar
const TABS: { id: Tab; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'summary', label: 'Özet', icon: 'pie-chart-outline' },
  { id: 'routine', label: 'Rutin', icon: 'list-outline' },
  { id: 'abc', label: 'Zor anlar', icon: 'pulse-outline' },
  { id: 'goals', label: 'Hedefler', icon: 'flag-outline' },
  { id: 'notes', label: 'Notlar', icon: 'document-text-outline' },
  { id: 'suggestions', label: 'Öneriler', icon: 'add-circle-outline' },
  { id: 'report', label: 'Rapor', icon: 'print-outline' },
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

export default function ClientScreen({ client, me, onBack, onRevoked }: {
  client: Client; me: ClinicianMe; onBack: () => void; onRevoked: () => void;
}) {
  const [tab, setTab] = useState<Tab>('summary');
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
          </View>

          {!data && !error && <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} />}
          {error && <Notice icon="alert-circle-outline" text={`Yüklenemedi: ${error}`} />}
          {revoked && <Notice icon="lock-closed-outline" text="Ebeveyn paylaşımı durdurmuş. Bu çocuğun verisine artık erişilemez." />}

          {ctx && (
            <>
              <View style={styles.tabs}>
                <ChipBar<Tab> options={TABS} value={tab} onChange={setTab} inset={20} />
              </View>
              {['summary', 'routine', 'abc', 'report'].includes(tab) && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 }}>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 40, flexGrow: 1 },
  tabs: { marginHorizontal: -20, marginBottom: 4 },
  column: { width: '100%', maxWidth: 960, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  small: { fontSize: 12, color: colors.muted },
});
