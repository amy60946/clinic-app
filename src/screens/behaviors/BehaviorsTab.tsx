// Danışan › Davranışlar ve Olaylar (rakipteki "Target behaviors & reported incidents"e sadık; kullanıcı isteği 9 Kasım 2026).
// Her hedef davranış açılır kart: ad, başlangıç, ayar (Düzenle · Arşivle); açılınca kayıt türüne göre olay tablosu.
// Altta "Diğer bildirilen olaylar": hedefe bağlı olmayan olaylar ve ebeveynin Moyo'daki "Davranış kaydı" (abc_events), yeniden eskiye;
// en altta açılıp kapanan "Arşivlenenler" (olaylarıyla; "Geri al"). Durum alanı ve "Dışa aktar" kalktı (kullanıcı kararı 23 Kasım 2026).
// Olayları ebeveyn ParentApp'ten bildirir; uzman yalnız okur. focus: bildirimden gelen kayıt açılır, vurgulanır ve ekrana kaydırılır.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Cta, Input, Notice, IconButton, Toggle } from '../../components/ui';
import { useActionMenu, confirmSpec } from '../../components/ActionMenu';
import AbcVoice from '../../components/AbcVoice';
import type { ClientCtx } from '../client/ClientScreen';
import { SheetFrame, GhostButton } from '../training/parts';
import { track } from '../../lib/track';
import { loadAbcEvents, listGoals } from '../../lib/clinic';
import { loadParents } from '../../lib/training';
import type { AbcEvent } from '../../lib/metrics';
import {
  TargetBehavior, Incident, LogType, BehaviorDraft, LOG_TYPES, MAX_STRATEGIES, responseLabel, typesShown,
  dayLabel, timeLabel, loadBehaviors, loadIncidents, saveBehavior, archiveBehavior, restoreBehavior, cleanStrategies, BehaviorsNotInstalled,
} from '../../lib/behaviors';
import { OTHER, OtherRow, BehaviorFocus, otherRows, locateFocus, abcWhen, incidentKey } from '../../lib/behaviorRows';
import IncidentPreview, { PreviewBehavior } from './IncidentPreview';

export type { BehaviorFocus } from '../../lib/behaviorRows';

const FOOT = { height: 48, marginTop: 0, paddingHorizontal: 18 };
const HEAD_BTN = { height: 44, marginTop: 0, paddingHorizontal: 16 };

type Props = ClientCtx & {
  sample?: boolean;
  // Bildirimden geliş: abc_event → { kind: 'abc', id: data.abc_id }, behavior_incident → { kind: 'incident', id: data.incident_id }
  focus?: BehaviorFocus | null;
  // Satırı kaydırma alanında görünür yapar (iOS'ta danışan ekranının ScrollView'u ile). Verilmezse web'de scrollIntoView, iOS'ta kaydırma yok.
  onScrollTo?: (node: View) => void;
};

export default function BehaviorsTab({ client, data, sample, focus, onScrollTo }: Props) {
  const [list, setList] = useState<TargetBehavior[] | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [abc, setAbc] = useState<AbcEvent[]>([]);
  const [goals, setGoals] = useState<Record<string, string>>({});
  const [parents, setParents] = useState<Record<string, string>>({});
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [archOpen, setArchOpen] = useState(false);
  const [hl, setHl] = useState<string | null>(null);         // vurgulanan satır (bildirimden gelen kayıt)
  const [lost, setLost] = useState(false);                    // bildirimdeki kayıt bulunamadı
  const [sheet, setSheet] = useState<null | { edit: TargetBehavior | null } | 'preview'>(null);
  const [menu, openMenu] = useActionMenu();
  const abcFallback = useRef(data.abc);
  abcFallback.current = data.abc;

  const reload = useCallback(async () => {
    try {
      const [bs, is, ab, gs, ps] = await Promise.all([
        loadBehaviors(client.link_id),
        loadIncidents(client.link_id),
        // davranış kaydı okunamazsa danışan verisindeki kopya (ekranı durdurmaz)
        loadAbcEvents(client.child_id).catch(() => abcFallback.current),
        listGoals(client.link_id).then((g) => Object.fromEntries(g.map((x) => [x.id, x.title]))).catch(() => ({} as Record<string, string>)),
        loadParents(client.link_id, client.parents)
          .then((p) => Object.fromEntries(p.filter((x) => x.id).map((x) => [x.id as string, x.name]))).catch(() => ({} as Record<string, string>)),
      ]);
      setList(bs); setIncidents(is); setAbc(ab); setGoals(gs); setParents(ps); setError(null);
    } catch (e) {
      if (e instanceof BehaviorsNotInstalled) setMissing(true); else setError((e as Error).message);
      setList([]);
    }
  }, [client.link_id, client.child_id, client.parents]);
  useEffect(() => { if (!sample) reload(); }, [reload, sample]);

  const shown = useMemo(() => (list ?? []).filter((b) => !b.archived), [list]);
  const archived = useMemo(() => (list ?? []).filter((b) => b.archived), [list]);
  const others = useMemo(() => otherRows(incidents, list ?? [], abc), [incidents, list, abc]);
  const otherCols = useMemo(() => otherColumns(goals, parents), [goals, parents]);

  // Bildirimden gelen kayıt: kartı (gerekirse Arşivlenenler'i) açar, satırı vurgular; bulunamazsa bir kez yeniden okur
  const rows = useRef(new Map<string, View>());
  const applied = useRef<string | null>(null);
  const retried = useRef<string | null>(null);
  const pendingScroll = useRef<string | null>(null);
  const focusKey = focus ? `${focus.kind}:${focus.id}` : null;
  useEffect(() => {
    if (!focus || !focusKey || !list || applied.current === focusKey) return;
    const place = locateFocus(focus, list, incidents, abc);
    if (!place) {
      if (retried.current !== focusKey) { retried.current = focusKey; reload(); } else { applied.current = focusKey; setLost(true); }
      return;
    }
    applied.current = focusKey;
    setLost(false);
    setOpen((o) => new Set(o).add(place.card));
    if (place.archived) setArchOpen(true);
    setHl(place.row);
    pendingScroll.current = place.row;
  }, [focusKey, list, incidents, abc]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!pendingScroll.current) return;
    const t = setTimeout(() => {
      const key = pendingScroll.current;
      const node = key ? rows.current.get(key) : undefined;
      if (!node) return;
      pendingScroll.current = null;
      if (onScrollTo) onScrollTo(node);
      else if (Platform.OS === 'web') (node as unknown as { scrollIntoView?: (o: object) => void }).scrollIntoView?.({ block: 'center', behavior: 'smooth' });
    }, 150);
    return () => clearTimeout(t);
  }, [hl, open, archOpen, onScrollTo]);
  const rowRef = useCallback((key: string) => (node: View | null) => { if (node) rows.current.set(key, node); else rows.current.delete(key); }, []);

  if (sample) return <Notice icon="locate-outline" text="Davranışlar ve olaylar gerçek danışanlarda: aileyi davet et, sonra buradan hedef davranış tanımla; ebeveyn olayları aile uygulamasından bildirir." />;
  if (missing) return <Notice icon="cloud-offline-outline" text="Davranışlar ve olaylar için veritabanı güncellemesi bekleniyor." />;
  if (!list) return <ActivityIndicator color={colors.navy} style={{ marginTop: 30 }} />;

  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });
  // Arşivlenenler açılınca kartlar olaylarıyla açık gelir
  const toggleArch = () => {
    if (!archOpen) setOpen((o) => { const n = new Set(o); archived.forEach((b) => n.add(b.id)); return n; });
    setArchOpen(!archOpen);
  };
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); await reload(); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); } };
  const gear = (b: TargetBehavior) => (e: any) => openMenu({ items: [
    { label: 'Düzenle', icon: 'create-outline', onPress: () => setSheet({ edit: b }) },
    { label: 'Arşivle', icon: 'archive-outline', destructive: true, onPress: () => openMenu(confirmSpec('Hedef davranış arşivlensin mi?',
      'Ebeveyn bu davranış için artık olay bildiremez. Kaydedilen olaylar silinmez; "Arşivlenenler"de durur, oradan geri alınabilir.', 'Arşivle',
      () => run(() => archiveBehavior(b.id)), 'archive-outline')) },
  ] }, e);
  const add = () => setSheet({ edit: null });
  const previewOf = (bs: TargetBehavior[]): PreviewBehavior[] => bs.map((b) => ({ id: b.id, title: b.title, strategies: b.strategies, log_type: b.log_type, parent_logging: b.parent_logging }));
  const card = (b: TargetBehavior) => (
    <BehaviorCard key={b.id} behavior={b} incidents={incidents.filter((i) => i.behavior_id === b.id)} open={open.has(b.id)}
      onToggle={() => toggle(b.id)} onGear={b.archived ? undefined : gear(b)} hl={hl} rowRef={rowRef}
      onRestore={b.archived ? () => run(() => restoreBehavior(b.id)) : undefined} />
  );
  const abcCount = others.filter((r) => r.kind === 'abc').length;

  return (
    <View style={{ gap: 12 }}>
      {menu}
      {error && <Notice icon="alert-circle-outline" text={`Yüklenemedi: ${error}`} />}
      {lost && <Notice icon="information-circle-outline" text="Bildirimdeki kayıt artık görünmüyor (silinmiş ya da paylaşım dışında kalmış olabilir)." />}
      <View style={styles.headRow}>
        <View style={styles.headTitle}>
          <View style={styles.headIcon}><Ionicons name="locate-outline" size={20} color={colors.navy} /></View>
          <Text style={styles.title}>Hedef davranışlar ve bildirilen olaylar</Text>
        </View>
        <Cta label="+ Hedef davranış ekle" onPress={add} style={HEAD_BTN} />
      </View>
      <Pressable onPress={() => { setSheet('preview'); track('behavior.preview', { from: 'tab' }); }} style={styles.previewLink} accessibilityRole="button" hitSlop={6}>
        <Ionicons name="phone-portrait-outline" size={15} color={colors.navy} />
        <Text style={styles.link}>Ebeveyn deneyimini önizle</Text>
      </Pressable>

      {shown.length === 0 && (
        <View style={styles.empty}>
          <Ionicons name="locate-outline" size={26} color={colors.muted} />
          <Text style={styles.emptyTitle}>Henüz hedef davranış yok</Text>
          <Text style={[styles.small, { textAlign: 'center' }]}>Odaklanmak istediğin davranışı ve ailenin uygulayacağı stratejileri ekle; ebeveyn olayları aile uygulamasından bildirir.</Text>
          <Cta label="+ Hedef davranış ekle" onPress={add} style={HEAD_BTN} />
        </View>
      )}

      {shown.map(card)}

      <View style={styles.card}>
        <Pressable onPress={() => toggle(OTHER)} style={styles.cardHead} accessibilityRole="button" accessibilityState={{ expanded: open.has(OTHER) }}>
          <Ionicons name={open.has(OTHER) ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.navy} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={styles.cardTitle}>Diğer bildirilen olaylar</Text>
            <Text style={styles.small}>Hedef davranışlara bağlı olmayan olaylar ve ebeveynin Moyo'da girdiği davranış kayıtları</Text>
          </View>
          <Text style={[styles.small, { flexShrink: 0 }]}>{others.length} kayıt</Text>
        </Pressable>
        {open.has(OTHER) && (
          <Table cols={otherCols} rows={others} rowKey={(r) => r.key} hl={hl} rowRef={rowRef} empty="Henüz olay ya da davranış kaydı yok." />
        )}
        {open.has(OTHER) && abcCount > 0 && (
          <Text style={[styles.small, styles.indent]}>"Davranış kaydı" satırlarını ebeveyn Moyo'da "Davranış kaydı ekle" ile girer; şiddet ebeveynin değerlendirmesidir.</Text>
        )}
      </View>

      {archived.length > 0 && (
        <View style={{ gap: 10 }}>
          <Pressable onPress={toggleArch} style={styles.archHead} accessibilityRole="button" accessibilityState={{ expanded: archOpen }} hitSlop={4}>
            <Ionicons name={archOpen ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.navy} />
            <Ionicons name="archive-outline" size={16} color={colors.muted} />
            <Text style={styles.archTitle}>Arşivlenenler</Text>
            <Text style={[styles.small, { flexShrink: 0 }]}>{archived.length}</Text>
          </Pressable>
          {archOpen && (
            <>
              <Text style={[styles.small, styles.indent]}>Ebeveyn arşivlenen davranışlar için olay bildiremez; kaydedilen olaylar durur. "Geri al" ile etkin listeye döner.</Text>
              {archived.map(card)}
            </>
          )}
        </View>
      )}

      {sheet === 'preview' && <IncidentPreview behaviors={previewOf(shown)} childName={client.child_name} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && (
        <BehaviorSheet behavior={sheet.edit} others={previewOf(shown.filter((x) => x.id !== sheet.edit?.id))} childName={client.child_name}
          onClose={() => setSheet(null)}
          onSave={(d) => run(() => saveBehavior({ ...d, id: sheet.edit?.id, clinic_id: client.clinic_id, link_id: client.link_id }))} />
      )}
    </View>
  );
}

type RowRef = (key: string) => (node: View | null) => void;

function BehaviorCard({ behavior: b, incidents, open, onToggle, onGear, onRestore, hl, rowRef }: {
  behavior: TargetBehavior; incidents: Incident[]; open: boolean; onToggle: () => void; onGear?: (e: any) => void; onRestore?: () => void;
  hl: string | null; rowRef: RowRef;
}) {
  const cols = useMemo(() => colsFor(typesShown(b, incidents)), [b, incidents]);
  return (
    <View style={[styles.card, b.archived && styles.cardArchived]}>
      <View style={styles.cardHead}>
        <Pressable onPress={onToggle} style={styles.cardToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={b.title}>
          <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.navy} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <Text style={styles.cardTitle}>{b.title}</Text>
            <Text style={styles.small}>
              Başlangıç: {dayLabel(b.started_at)} · {incidents.length} olay{b.archived ? '' : b.parent_logging ? '' : ' · Ebeveyn kaydı kapalı'}
            </Text>
          </View>
        </Pressable>
        {onRestore && (
          <Pressable onPress={onRestore} style={({ pressed }) => [styles.outline, pressed && { opacity: 0.7 }]} accessibilityRole="button"
            accessibilityLabel={`${b.title}: arşivden geri al`} hitSlop={4}>
            <Ionicons name="arrow-undo-outline" size={15} color={colors.navy} />
            <Text style={styles.outlineText}>Geri al</Text>
          </Pressable>
        )}
        {onGear && <IconButton name="settings-outline" label="Hedef davranış ayarları" onPress={onGear} />}
      </View>
      {open && (
        <View style={{ gap: 8 }}>
          {!!b.description && <Text style={[styles.body, styles.indent]}>{b.description}</Text>}
          {b.strategies.length > 0 && (
            <View style={[{ gap: 4 }, styles.indent]}>
              <Text style={styles.label}>Stratejiler</Text>
              {b.strategies.map((x, i) => <Text key={i} style={styles.body}>• {x}</Text>)}
            </View>
          )}
          <Table cols={cols} rows={incidents} rowKey={(i) => incidentKey(i.id)} hl={hl} rowRef={rowRef} empty="Henüz olay kaydedilmedi." />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- olay tablosu
type Col<R> = { key: string; label: string; w: number; render: (r: R) => React.ReactNode };
const muted = (t: string) => <Text style={[styles.td, { color: colors.muted }]}>{t}</Text>;
const txt = (t: string | null | undefined, empty = '—') => (t && t.trim() ? <Text style={styles.td}>{t}</Text> : muted(empty));
const when = (day: string, sub: string) => <View><Text style={[styles.td, { fontWeight: '600' }]}>{day}</Text><Text style={styles.tdSmall}>{sub}</Text></View>;
const C = {
  date: { key: 'date', label: 'Tarih', w: 72, render: (i: Incident) => when(dayLabel(i.occurred_at), timeLabel(i.occurred_at)) },
  reporter: { key: 'reporter', label: 'Bildiren', w: 110, render: (i: Incident) => txt(i.reporter_name, 'Ebeveyn') },
  count: { key: 'count', label: 'Sayı', w: 60, render: (i: Incident) => txt(i.count != null ? String(i.count) : '') },
  frequency: { key: 'frequency', label: 'Sıklık', w: 64, render: (i: Incident) => txt(i.count != null ? `${i.count} kez` : '') },
  antecedent: { key: 'antecedent', label: 'Öncül', w: 170, render: (i: Incident) => txt(i.antecedent) },
  consequence: { key: 'consequence', label: 'Sonuç', w: 170, render: (i: Incident) => txt(i.consequence) },
  duration: { key: 'duration', label: 'Süre', w: 70, render: (i: Incident) => txt(i.duration_min != null ? `${i.duration_min} dk` : '') },
  // hedefi silinmiş olayda hedefin son adı (behavior_title, ortak 20261120200000)
  behavior: { key: 'behavior', label: 'Davranış', w: 150, render: (i: Incident) => txt(i.other_behavior || i.behavior_title) },
  strategy: { key: 'strategy', label: 'Uygulanan strateji', w: 170, render: (i: Incident) => txt(i.strategy, 'Hiçbiri') },
  response: { key: 'response', label: 'Çocuğun tepkisi', w: 120, render: (i: Incident) => (i.response != null
    ? <Text style={styles.td}>{responseLabel(i.response)} <Text style={styles.tdSmall}>· {i.response}/5</Text></Text> : muted('—')) },
} satisfies Record<string, Col<Incident>>;

function colsFor(types: LogType[]): Col<Incident>[] {
  const mid: Col<Incident>[] = [];
  if (types.includes('frequency')) mid.push(C.count);
  if (types.includes('abc')) mid.push(C.antecedent, C.consequence);
  if (types.includes('duration')) mid.push(C.duration);
  return [C.date, C.reporter, ...mid, C.strategy, C.response];
}

// "Diğer bildirilen olaylar": olay ve davranış kaydı aynı tabloda. Davranış kaydında saat yerine gün bölümü; davranış hücresinde
// "Davranış kaydı" etiketi, bağlı davranış hedefi (Takip Planı), ebeveynin şiddet değerlendirmesi ve ses; sıklık / süre / strateji / tepki yok.
// Dokuz sütun: geniş ekranda (≈ 930 px) kaydırmadan sığsın diye metin sütunları daha dar.
function otherColumns(goals: Record<string, string>, parents: Record<string, string>): Col<OtherRow>[] {
  const of = (c: Col<Incident>, w: number, abc: (e: AbcEvent) => React.ReactNode = () => muted('—')): Col<OtherRow> =>
    ({ key: c.key, label: c.label, w, render: (r) => (r.kind === 'abc' ? abc(r.abc) : c.render(r.incident)) });
  return [
    of(C.date, 72, (e) => when(dayLabel(e.occurred_at), abcWhen(e))),
    of(C.reporter, 84, (e) => txt(e.created_by ? parents[e.created_by] : '', 'Ebeveyn')),
    of(C.behavior, 170, (e) => <AbcBehavior e={e} goal={e.goal_id ? goals[e.goal_id] ?? 'Davranış hedefi' : null} />),
    of(C.antecedent, 125, (e) => txt(e.antecedent)),
    of(C.consequence, 125, (e) => txt(e.consequence)),
    of(C.duration, 60),
    of(C.frequency, 64),
    of(C.strategy, 120),
    of(C.response, 110),
  ];
}

function AbcBehavior({ e, goal }: { e: AbcEvent; goal: string | null }) {
  return (
    <View style={{ gap: 4, alignItems: 'flex-start' }}>
      <View style={styles.tag}><Text style={styles.tagText}>Davranış kaydı</Text></View>
      <Text style={styles.td}>{e.behavior}</Text>
      {!!goal && <Text style={styles.goal}>Davranış hedefi: {goal}</Text>}
      <Text style={styles.tdSmall}>Şiddet {e.intensity}/5 · ebeveyn</Text>
      {!!e.audio_path && <AbcVoice path={e.audio_path} durationMs={e.duration_ms} compact />}
    </View>
  );
}

// Sütun genişlikleri ölçülen alana göre hesaplanır (yatay kaydırmada içerik metnin tek satırlık genişliğine yayılmasın; web ve iOS aynı):
// alan yetiyorsa sütunlar orantılı genişler, yetmiyorsa tablo en dar hâliyle yatay kayar. hl: vurgulanan satır (bildirimden gelen kayıt)
function Table<R>({ cols, rows, rowKey, hl, rowRef, empty }: {
  cols: Col<R>[]; rows: R[]; rowKey: (r: R) => string; hl: string | null; rowRef: RowRef; empty: string;
}) {
  const [avail, setAvail] = useState(0);
  if (!rows.length) return <Text style={[styles.small, { paddingVertical: 6 }]}>{empty}</Text>;
  const total = cols.reduce((n, c) => n + c.w, 0);
  const width = Math.max(total, avail);
  const cell = (c: Col<R>) => [styles.cell, { width: Math.floor((c.w * width) / total) }];
  return (
    <View style={styles.table} onLayout={(e) => setAvail(Math.floor(e.nativeEvent.layout.width) - 2)}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ width }}>
          <View style={[styles.trow, styles.thead]}>
            {cols.map((c) => <View key={c.key} style={cell(c)}><Text style={styles.th}>{c.label}</Text></View>)}
          </View>
          {rows.map((r, k) => {
            const key = rowKey(r);
            return (
              <View key={key} ref={rowRef(key)} style={[styles.trow, k === rows.length - 1 && { borderBottomWidth: 0 }, key === hl && styles.trowHl]}>
                {cols.map((c) => <View key={c.key} style={cell(c)}>{c.render(r)}</View>)}
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------- ekleme / düzenleme
// Durum alanı yok (kullanıcı kararı 23 Kasım 2026): yeni kayıtta sunucunun varsayılanı, düzenlemede eski değer kalır
function BehaviorSheet({ behavior, others, childName, onClose, onSave }: {
  behavior: TargetBehavior | null; others: PreviewBehavior[]; childName: string; onClose: () => void; onSave: (d: BehaviorDraft) => void;
}) {
  const [title, setTitle] = useState(behavior?.title ?? '');
  const [desc, setDesc] = useState(behavior?.description ?? '');
  const [strategies, setStrategies] = useState<string[]>(behavior?.strategies.length ? behavior.strategies : ['', '']);
  const [logging, setLogging] = useState(behavior?.parent_logging ?? true);
  const [logType, setLogType] = useState<LogType>(behavior?.log_type ?? 'frequency');
  const [tried, setTried] = useState(false);
  const [preview, setPreview] = useState(false);
  const missingTitle = !title.trim();
  const save = () => {
    if (missingTitle) { setTried(true); return; }
    onSave({ title, description: desc, strategies: cleanStrategies(strategies), parent_logging: logging, log_type: logType });
    onClose();
  };
  const draft: PreviewBehavior = { id: behavior?.id ?? '__draft__', title: title.trim() || 'Yeni hedef davranış', strategies: cleanStrategies(strategies), log_type: logType, parent_logging: logging };
  return (
    <SheetFrame title={behavior ? 'Hedef davranışı düzenle' : 'Yeni hedef davranış'} onClose={onClose}
      footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label="Kaydet" onPress={save} disabled={missingTitle} style={FOOT} /></>}>
      <Pressable onPress={() => { setPreview(true); track('behavior.preview', { from: 'form' }); }} style={styles.previewLink} accessibilityRole="button" hitSlop={6}>
        <Text style={styles.link}>Ebeveyn deneyimini önizle ↗</Text>
      </Pressable>
      <Text style={styles.body}>Kaydettikten sonra ebeveynler olayları ve kullandıkları stratejileri kaydedebilir.</Text>

      <Text style={styles.label}>Hedef davranış</Text>
      <Text style={styles.small}>Odaklandığın davranış</Text>
      <Input value={title} onChangeText={setTitle} maxLength={80} placeholder="ör. Ekranı kapatırken ağlama" accessibilityLabel="Hedef davranış" />
      {tried && missingTitle && <Text style={styles.error}>⚠ Lütfen bir başlık gir</Text>}

      <Text style={styles.label}>Açıklama</Text>
      <Text style={styles.small}>Bu davranış aile için ne anlama geliyor, aileden ne istiyorsun?</Text>
      <Input value={desc} onChangeText={setDesc} maxLength={1000} multiline numberOfLines={4} placeholder="Açıklama" accessibilityLabel="Açıklama" />

      <Text style={styles.label}>Stratejiler</Text>
      {strategies.map((v, i) => (
        <View key={i} style={styles.stratRow}>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Input value={v} onChangeText={(t) => setStrategies((x) => x.map((y, j) => (j === i ? t : y)))} maxLength={200} placeholder={`Strateji ${i + 1}`}
              accessibilityLabel={`Strateji ${i + 1}`} />
          </View>
          <IconButton name="close" label={`Strateji ${i + 1}'i kaldır`} onPress={() => setStrategies((x) => x.filter((_, j) => j !== i))} />
        </View>
      ))}
      {strategies.length < MAX_STRATEGIES && (
        <Pressable onPress={() => setStrategies((x) => [...x, ''])} style={styles.previewLink} accessibilityRole="button" hitSlop={6}>
          <Text style={styles.link}>+ Strateji ekle</Text>
        </Pressable>
      )}

      <View style={styles.toggleRow}>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Text style={styles.optTitle}>Ebeveyn davranış kaydı</Text>
          <Text style={styles.small}>Ebeveyn bu davranışın olaylarını aile uygulamasından bildirir.</Text>
        </View>
        <Toggle value={logging} onChange={setLogging} />
      </View>

      {logging && (
        <>
          <Text style={styles.label}>Kayıt türünü seç</Text>
          {LOG_TYPES.map((t) => {
            const on = t.key === logType;
            return (
              <Pressable key={t.key} onPress={() => setLogType(t.key)} style={[styles.opt, on && styles.optOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Text style={styles.optTitle}>{t.label}</Text><Text style={styles.small}>{t.hint}</Text></View>
                <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={22} color={on ? colors.navy : colors.faint} />
              </Pressable>
            );
          })}
        </>
      )}
      {preview && <IncidentPreview behaviors={[...others, draft]} childName={childName} onClose={() => setPreview(false)} />}
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  headTitle: { flexDirection: 'row', alignItems: 'center', gap: 10, flexGrow: 1, flexShrink: 1, minWidth: 220 },
  headIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.today, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  outline: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 12, flexShrink: 0 },
  outlineText: { fontSize: 13.5, fontWeight: '600', color: colors.navy },
  previewLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  link: { color: colors.navy, fontWeight: '700', textDecorationLine: 'underline', fontSize: 13.5 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint, borderRadius: 12, backgroundColor: '#fff' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, gap: 10 },
  cardArchived: { backgroundColor: '#FAFBFC' },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  indent: { paddingLeft: 26 },   // ok (18) + aralık (8): başlıkla aynı hiza
  cardToggle: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  archHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 8, alignSelf: 'flex-start' },
  archTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.text, lineHeight: 20, flexShrink: 1 },
  small: { fontSize: 12.5, color: colors.muted, flexShrink: 1 },
  label: { fontSize: 13, fontWeight: '700', color: colors.navy, marginTop: 6 },
  error: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  table: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, overflow: 'hidden' },
  trow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  trowHl: { backgroundColor: colors.medium.bg },
  thead: { backgroundColor: '#F7F8FA' },
  cell: { flexShrink: 0, paddingHorizontal: 10, paddingVertical: 9 },
  th: { fontSize: 12, fontWeight: '700', color: colors.muted },
  td: { fontSize: 13.5, color: colors.text, lineHeight: 19, flexShrink: 1 },
  tdSmall: { fontSize: 12, color: colors.muted },
  tag: { backgroundColor: colors.today, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 11.5, fontWeight: '700', color: '#2C4A9A' },
  goal: { fontSize: 12, fontWeight: '600', color: '#2C4A9A', flexShrink: 1 },
  stratRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  optOn: { borderColor: colors.navy, backgroundColor: '#EEF1F8' },
  optTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
});
