import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Modal, StyleSheet, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Notice, Segmented, IconButton } from '../../components/ui';
import Bell from '../../components/Bell';
import NotificationsSheet, { notificationTab } from '../NotificationsSheet';
import { useNotifications } from '../../lib/notificationsContext';
import { AppNotification, notificationChildren } from '../../lib/notifications';
import { track } from '../../lib/track';
import { Client, ClientData, ClinicianMe, Member, loadClientData, revokeLink } from '../../lib/clinic';
import TeamAccessSheet from './TeamAccessSheet';
import { isoDate, windowStarts } from '../../lib/metrics';
import { SummaryTab, AbcTab } from './ObservationTabs';
import HomeRoutines, { RoutineView } from './HomeRoutines';
import PlanTab from './PlanTab';
import NotesTab from './NotesTab';
import ReportTab from './ReportTab';
import DetailsTab from './DetailsTab';
import SessionsTab from './SessionsTab';
import TrainingTab from '../training/TrainingTab';
import BehaviorsTab from '../behaviors/BehaviorsTab';
import { fromISO } from '../../dates';
import { SectionHint } from '../SampleTour';
import { useLayout, LayoutToggle } from '../../lib/layout';

// 'suggestions' eski bağlantılar ve bildirimler için: Ev rutinleri'nde öneri penceresi (Gönderilenler) açılır
export type Tab = 'training' | 'behaviors' | 'summary' | 'routine' | 'abc' | 'goals' | 'sessions' | 'notes' | 'suggestions' | 'report' | 'details';
type Section = Exclude<Tab, 'suggestions'>;

// Bölümler: geniş ekranda (web, iPad'de "Web görünümü") gruplu sol menü — Planla · İzle · Kayıt (kullanıcı kararı 30 Ekim 2026);
// telefonda ve "iPad görünümü"nde gri zeminli seçici (4 + 3)
type Group = 'plan' | 'watch' | 'record';
const GROUPS: { id: Group; label: string }[] = [{ id: 'plan', label: 'Planla' }, { id: 'watch', label: 'İzle' }, { id: 'record', label: 'Kayıt' }];
const SECTIONS: { id: Section; label: string; icon: keyof typeof Ionicons.glyphMap; group: Group }[] = [
  { id: 'training', label: 'Ebeveyn Eğitimi', icon: 'school-outline', group: 'plan' },
  { id: 'goals', label: 'Takip Planı', icon: 'flag-outline', group: 'plan' },
  { id: 'sessions', label: 'Seanslar', icon: 'calendar-outline', group: 'plan' },
  { id: 'behaviors', label: 'Davranışlar ve Olaylar', icon: 'locate-outline', group: 'watch' },
  { id: 'summary', label: 'Özet', icon: 'grid-outline', group: 'watch' },
  { id: 'routine', label: 'Ev Rutinleri', icon: 'repeat-outline', group: 'watch' },
  { id: 'abc', label: 'Davranış Kayıtları', icon: 'pulse-outline', group: 'watch' },
  { id: 'notes', label: 'Notlar', icon: 'create-outline', group: 'record' },
  { id: 'report', label: 'Rapor', icon: 'print-outline', group: 'record' },
  { id: 'details', label: 'Danışan Bilgileri', icon: 'person-circle-outline', group: 'record' },
];

export const MAX_WEEKS = 8;

export function ageText(birthday: string | null): string {
  if (!birthday) return '';
  // YYYY-MM-DD yerel gün olarak çözülür (new Date('YYYY-MM-DD') UTC sayar, batı saat dilimlerinde bir gün kayar)
  const b = fromISO(birthday.slice(0, 10));
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
  reload?: () => Promise<void>;     // çocuğun görev/kayıt verisini yeniden okur (aile az önce bir öneriyi kabul ettiyse)
  // Takip Planı'ndan bir hedefin davranış kayıtlarını aç (Davranış Kayıtları o hedefe süzülü); abcGoal: açılışta seçili hedef
  openAbc?: (goalId: string) => void;
  abcGoal?: string | null;
};

export default function ClientScreen({
  client, me, team = [], clients = [], initialTab = 'summary', sample, focusTab, onBack, onRevoked, onOpenNotification, onTeamChanged, onSwitch, footer, overlay,
}: {
  client: Client; me: ClinicianMe; team?: Member[]; initialTab?: Tab; onBack: () => void; onRevoked: () => void;
  onOpenNotification: (n: AppNotification) => void;
  onTeamChanged?: () => void;
  clients?: Client[];                              // sol menüdeki danışan seçici
  onSwitch?: (c: Client, tab: Tab) => void;
  sample?: ClientData;                             // örnek aile: veri yüklenmez, salt okunur
  footer?: React.ReactNode;
  overlay?: React.ReactNode;                       // örnek ailede yaptırarak öğreten tur: perde + kart, her şeyin üstünde
  focusTab?: Tab;                                  // tur adımı değişince o bölüm açılır
}) {
  const [tab, setTab] = useState<Section>(initialTab === 'suggestions' ? 'routine' : initialTab);
  const [abcGoal, setAbcGoal] = useState<string | null>(null);
  const [routineView, setRoutineView] = useState<RoutineView>(initialTab === 'suggestions' ? 'suggest' : 'week');
  const [bell, setBell] = useState(false);
  const [access, setAccess] = useState(false);
  const [switcher, setSwitcher] = useState(false);
  const [label, setLabel] = useState(client.label);
  const { desktop: sidebar } = useLayout();
  const owner = me.role === 'owner';
  const nameOf = (id: string) => team.find((m) => m.id === id)?.name || 'Adsız';
  const others = (client.assigned ?? []).filter((id) => id !== client.clinician_id).map(nameOf);
  const teamLine = !sample && team.length > 1 && client.clinician_id !== undefined
    ? [client.clinician_id ? `Sorumlu: ${client.clinician_id === me.id ? 'sen' : client.clinician_name || nameOf(client.clinician_id)}` : '',
       owner && others.length ? `Erişen: ${others.join(', ')}` : ''].filter(Boolean).join(' · ')
    : '';
  // Bildirim sekmesi: öneri kararları Ev rutinleri'ndeki öneri penceresinde
  const current: Tab = tab === 'routine' && routineView === 'suggest' ? 'suggestions' : tab;
  const sectionOf = (t: Tab): Section => (t === 'suggestions' ? 'routine' : t);
  const { items, unreadByChild, markRead } = useNotifications();
  // Açılan bölümün bu çocuğa ait okunmamış bildirimleri okunmuş sayılır (ör. Davranış kayıtları açılınca davranış kaydı bildirimleri).
  // Öneri kararları Ev rutinleri'nde (öneri penceresi) ve Takip planı'nda görünür.
  useEffect(() => {
    if (sample) return;
    const seen = (t: Tab) => t === current || (t === 'suggestions' && (current === 'routine' || current === 'goals'));
    const ids = items.filter((n) => !n.readAt && seen(notificationTab(n.kind)) && notificationChildren(n).includes(client.child_id)).map((n) => n.id);
    if (ids.length) markRead(ids);
  }, [current, items, client.child_id, markRead, sample]);
  useEffect(() => { track('screen.client', { tab: current, ...(sample ? { sample: true } : {}) }); }, [current, sample]);
  // Bölümde okunmamış bildirim işareti
  const dots = useMemo(() => {
    const out: Partial<Record<Section, boolean>> = {};
    if (!sample) items.forEach((n) => { if (!n.readAt && notificationChildren(n).includes(client.child_id)) out[sectionOf(notificationTab(n.kind))] = true; });
    return out;
  }, [items, client.child_id, sample]);
  const [weeks, setWeeks] = useState<'4' | '8'>('4');
  const [data, setData] = useState<ClientData | null>(sample ?? null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const today = useMemo(() => isoDate(new Date()), []);

  const load = useCallback(async () => {
    if (sample) return;
    try {
      setData(await loadClientData(client.child_id, windowStarts(today, MAX_WEEKS + 1)[0]));
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [client.child_id, today, sample]);

  useEffect(() => { load(); }, [load]);
  // Aile bu çocuk için bir öneriye karar verince (bildirim) görevler yeniden okunur; Takip planı ve Ev rutinleri güncel kalır
  const decided = useMemo(() => items.filter((n) => n.kind === 'suggestion_decided' && notificationChildren(n).includes(client.child_id))
    .map((n) => n.id).join(','), [items, client.child_id]);
  const seenDecided = useRef(decided);
  useEffect(() => {
    if (decided === seenDecided.current) return;
    seenDecided.current = decided;
    load();
  }, [decided, load]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const revoke = () => {
    Alert.alert('Paylaşımı sonlandır', `${client.child_name} için erişimin hemen biter. Notların ve davranış hedeflerin klinikte kalır. Yeniden görmek için ailenin yeni bir kod girmesi gerekir.`, [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sonlandır', style: 'destructive',
        onPress: () => revokeLink(client.link_id).then(onRevoked).catch((e) => Alert.alert('Sonlandırılamadı', (e as Error).message)),
      },
    ]);
  };

  // Çocuk satırı görünmüyorsa rıza geri alınmıştır (RLS)
  const revoked = data && !data.child;
  const shown: Client = { ...client, label };
  const go = (s: Section) => { setTab(s); if (s === 'routine') setRoutineView('week'); if (s !== 'abc') setAbcGoal(null); };
  const ctx: ClientCtx | null = data && data.child ? {
    client: shown, me, data, today, weeks: Number(weeks), reload: load, abcGoal,
    openAbc: (gid) => { setAbcGoal(gid); go('abc'); },
  } : null;
  useEffect(() => { if (focusTab) go(sectionOf(focusTab)); }, [focusTab]); // eslint-disable-line react-hooks/exhaustive-deps

  const header = (
    <View style={styles.header}>
      {!sidebar && (
        <Pressable onPress={onBack} accessibilityLabel="Danışanlar" hitSlop={8} style={styles.iconBtn}>
          <Ionicons name="chevron-back" size={20} color={colors.navy} />
        </Pressable>
      )}
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Text style={styles.title}>{client.child_name || 'Adsız'}{label ? ` · ${label}` : ''}</Text>
          {sample && <Text style={styles.sampleTag}>Örnek aile</Text>}
        </View>
        <Text style={styles.subtitle}>
          {[ageText(data?.child?.birthday ?? null), client.parents ? `Ebeveyn: ${client.parents}` : '', `Onay\u00a0${new Date(client.consent_at).toLocaleDateString('tr-TR')}`]
            .filter(Boolean).join('\u00a0· ')}
        </Text>
        {!!teamLine && <Text style={styles.subtitle}>{teamLine}</Text>}
      </View>
      <LayoutToggle />
      {!sample && (
        <>
          <Pressable onPress={refresh} accessibilityLabel="Yenile" hitSlop={8} style={styles.iconBtn}>
            <Ionicons name="refresh" size={18} color={colors.navy} />
          </Pressable>
          <Bell count={unreadByChild[client.child_id] ?? 0} onPress={() => setBell(true)} />
        </>
      )}
    </View>
  );

  const body = (
    <>
      {header}
      {!data && !error && <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} />}
      {error && <Notice icon="alert-circle-outline" text={`Yüklenemedi: ${error}`} />}
      {revoked && <Notice icon="lock-closed-outline" text="Ebeveyn paylaşımı durdurmuş. Bu çocuğun verisine artık erişilemez." />}
      {sample && <Notice icon="sparkles-outline" text="Örnek aile: gerçek bir aile bağlandığında göreceğin verinin örneği. Hiçbir şey kaydedilmez." />}

      {ctx && (
        <>
          {!sidebar && <TabGrid value={tab} onChange={go} dots={dots} />}
          {['summary', 'routine', 'abc', 'report'].includes(tab) && !(tab === 'routine' && routineView === 'suggest') && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10 }}>
              <Text style={styles.small}>Dönem</Text>
              <View style={{ flex: 1, maxWidth: 220 }}>
                <Segmented options={[{ id: '4', label: '4 hafta' }, { id: '8', label: '8 hafta' }]} value={weeks} onChange={setWeeks} />
              </View>
            </View>
          )}
          <View style={{ marginTop: 8 }}>
            {!sample && <SectionHint userId={me.id} section={tab} />}
            {tab === 'summary' && <SummaryTab {...ctx} />}
            {tab === 'routine' && <HomeRoutines {...ctx} view={routineView} onView={setRoutineView} />}
            {tab === 'abc' && <AbcTab key={abcGoal ?? 'all'} {...ctx} />}
            {tab === 'training' && <TrainingTab {...ctx} sample={!!sample} />}
            {tab === 'behaviors' && <BehaviorsTab {...ctx} sample={!!sample} />}
            {tab === 'goals' && <PlanTab {...ctx} />}
            {tab === 'sessions' && (sample
              ? <Notice icon="calendar-outline" text={'Seanslar gerçek danışanlarda görünür: Takvim\'den ya da burada "+ Seans" ile planlanır.'} />
              : <SessionsTab {...ctx} team={team} clients={clients} onOpenTab={(t) => go(t === 'suggestions' ? 'routine' : t)} />)}
            {tab === 'notes' && <NotesTab {...ctx} />}
            {tab === 'report' && <ReportTab {...ctx} />}
            {tab === 'details' && (
              <DetailsTab {...ctx} team={team}
                onTeamAccess={!sample && owner && team.length > 1 ? () => setAccess(true) : undefined}
                onRevoke={sample ? undefined : revoke} onLabelChanged={setLabel} />
            )}
          </View>
        </>
      )}
    </>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={{ flex: 1, flexDirection: 'row' }}>
        {sidebar && (
          <View style={styles.sidebar}>
            <Pressable onPress={onBack} style={styles.back} accessibilityRole="button">
              <Ionicons name="chevron-back" size={16} color={colors.navy} />
              <Text style={styles.backText}>Tüm Danışanlar</Text>
            </Pressable>
            <Pressable onPress={() => clients.length > 1 && !sample && setSwitcher(true)} style={styles.switch} accessibilityRole="button"
              accessibilityLabel="Danışan değiştir">
              <Text style={styles.switchText} numberOfLines={1}>{client.child_name || 'Adsız'}</Text>
              {clients.length > 1 && !sample && <Ionicons name="chevron-down" size={16} color={colors.muted} />}
            </Pressable>
            {GROUPS.map((g) => (
              <View key={g.id} style={{ gap: 2 }}>
                <Text style={styles.group}>{g.label}</Text>
                {SECTIONS.filter((s) => s.group === g.id).map((s) => {
                  const on = s.id === tab;
                  return (
                    <Pressable key={s.id} onPress={() => go(s.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                      style={({ pressed }) => [styles.nav, on && styles.navOn, pressed && !on && { backgroundColor: '#ECEEF3' }]}>
                      <Ionicons name={s.icon} size={17} color={on ? colors.navy : colors.muted} />
                      <Text style={[styles.navText, on && { color: colors.navy, fontWeight: '700' }]}>{s.label}</Text>
                      {dots[s.id] && <View style={styles.tabDot} />}
                    </Pressable>
                  );
                })}
              </View>
            ))}
          </View>
        )}
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          automaticallyAdjustKeyboardInsets
          refreshControl={sample ? undefined : <RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
        >
          <View style={[styles.column, sidebar && tab === 'goals' && { maxWidth: 1320 }, !!footer && { paddingBottom: 170 }]}>{body}</View>
        </ScrollView>
      </View>
      {/* tanıtım turu içeriğin üstünde, altta durur; içerik altına boşluk bırakılır */}
      {!!footer && <View pointerEvents="box-none" style={[styles.footer, sidebar && { left: 232 }]}>{footer}</View>}
      {overlay}
      {owner && !sample && (
        <TeamAccessSheet visible={access} onClose={() => setAccess(false)} client={client} me={me} team={team}
          onChanged={() => onTeamChanged?.()} />
      )}
      <Switcher visible={switcher} clients={clients} current={client.link_id} onClose={() => setSwitcher(false)}
        onPick={(c) => { setSwitcher(false); if (c.link_id !== client.link_id) onSwitch?.(c, current); }} />
      {!sample && (
        <NotificationsSheet
          visible={bell} onClose={() => setBell(false)} childId={client.child_id} childName={client.child_name}
          onOpen={(n) => {
            setBell(false);
            // Bu danışanın bildirimi: ilgili bölüme geç; başka danışan ya da ekip: ana ekran yönlendirir
            if (notificationChildren(n).includes(client.child_id) && n.kind !== 'clinic_revoked') {
              const t = notificationTab(n.kind);
              setTab(sectionOf(t));
              if (t === 'suggestions') setRoutineView('suggest');
            } else onOpenNotification(n);
          }}
        />
      )}
    </SafeAreaView>
  );
}

// Danışanlar arasında hızlı geçiş (sol menüdeki ad)
function Switcher({ visible, clients, current, onClose, onPick }: {
  visible: boolean; clients: Client[]; current: string; onClose: () => void; onPick: (c: Client) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View style={styles.pop}>
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 10 }}>
            <Text style={[styles.small, { flex: 1, fontWeight: '600' }]}>Danışan değiştir</Text>
            <IconButton name="close" onPress={onClose} label="Kapat" size={18} />
          </View>
          <ScrollView style={{ maxHeight: 420 }}>
            {clients.map((c) => (
              <Pressable key={c.link_id} onPress={() => onPick(c)} style={({ pressed }) => [styles.popRow, pressed && { backgroundColor: '#F7F8FA' }]}>
                <Text style={[styles.navText, c.link_id === current && { color: colors.navy, fontWeight: '700' }]} numberOfLines={1}>
                  {c.child_name || 'Adsız'}{c.label ? ` · ${c.label}` : ''}
                </Text>
                {!!c.parents && <Text style={styles.small} numberOfLines={1}>{c.parents}</Text>}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Pressable>
    </Modal>
  );
}

// Dönem seçicisiyle aynı görünüm; dar ekranda 4 + 3, geniş ekranda tek satır. Adlar sol menüdekiyle aynı (gerekirse iki satır).
// Okunmamış bildirim olan bölümde nokta.
function TabGrid({ value, onChange, dots }: { value: Section; onChange: (t: Section) => void; dots: Partial<Record<Section, boolean>> }) {
  const { width } = useWindowDimensions();
  const wide = width >= 1000;
  // dar ekranda 9 bölüm 3 × 3 (eşit sütun); 8 ve altı iki satır
  const per = SECTIONS.length > 8 ? 3 : Math.ceil(SECTIONS.length / 2);
  const rows = wide ? [SECTIONS] : Array.from({ length: Math.ceil(SECTIONS.length / per) }, (_, i) => SECTIONS.slice(i * per, i * per + per));
  return (
    <View style={styles.grid} accessibilityRole="tablist">
      {rows.map((row, i) => (
        <View key={i} style={styles.gridRow}>
          {row.map((t) => {
            const on = t.id === value;
            return (
              <Pressable key={t.id} onPress={() => onChange(t.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}
                style={[styles.gridItem, on && styles.gridActive]}>
                <Text numberOfLines={2} style={{ flexShrink: 1, fontSize: width < 420 ? 12 : 13, textAlign: 'center', fontWeight: on ? '700' : '500', color: on ? colors.navy : colors.muted }}>{t.label}</Text>
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
  gridItem: { flex: 1, minWidth: 0, alignItems: 'center', justifyContent: 'center', paddingVertical: 8, paddingHorizontal: 6, borderRadius: 8 },
  gridActive: { backgroundColor: '#fff' },
  tabDot: { position: 'absolute', top: 5, right: 5, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.danger },
  column: { width: '100%', maxWidth: 960, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 16 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 2 },
  small: { fontSize: 12, color: colors.muted },
  sampleTag: { fontSize: 11, fontWeight: '700', color: colors.navy, backgroundColor: colors.today, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  footer: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  sidebar: { width: 232, paddingHorizontal: 12, paddingTop: 16, gap: 4, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.line, backgroundColor: '#FAFBFC' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 6, paddingVertical: 6 },
  backText: { fontSize: 13, fontWeight: '600', color: colors.navy },
  switch: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10, marginVertical: 8 },
  switchText: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.navy },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 10, paddingVertical: 10, borderRadius: radius.sm },
  navOn: { backgroundColor: colors.today },
  navText: { flex: 1, fontSize: 14, color: colors.text },
  group: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 10, marginTop: 10, marginBottom: 2 },
  backdrop: { flex: 1, backgroundColor: 'rgba(15,27,61,0.25)', alignItems: 'flex-start', paddingTop: 110, paddingLeft: 16 },
  pop: { width: 300, backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  popRow: { paddingHorizontal: 14, paddingVertical: 10, gap: 2, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
