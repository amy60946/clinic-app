// Danışan › Davranışlar ve Olaylar (rakipteki "Target behaviors & reported incidents"e sadık; kullanıcı isteği 9 Kasım 2026).
// Mevcut "Davranış hedefi" (Takip Planı) ve "Davranış kaydı" (Davranış Kayıtları, abc_events) ile birleştirilmedi.
// Her hedef davranış açılır kart: durum, ad, başlangıç, ayar (Düzenle · Arşivle); açılınca kayıt türüne göre olay tablosu.
// Altta "Diğer bildirilen olaylar" (hedefe bağlı olmayan). Olayları ebeveyn ParentApp'ten bildirir; uzman yalnız okur.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Cta, Input, Notice, IconButton, Toggle } from '../../components/ui';
import { useActionMenu, confirmSpec } from '../../components/ActionMenu';
import type { ClientCtx } from '../client/ClientScreen';
import { SheetFrame, GhostButton } from '../training/parts';
import { toCsv } from '../../lib/csv';
import { saveTextFile } from '../../lib/saveFile';
import { track } from '../../lib/track';
import {
  TargetBehavior, Incident, BehaviorStatus, LogType, BehaviorDraft, STATUS, LOG_TYPES, MAX_STRATEGIES, statusMeta, responseLabel, typesShown,
  dayLabel, timeLabel, loadBehaviors, loadIncidents, saveBehavior, archiveBehavior, cleanStrategies, incidentRows, incidentsCsvName,
  INCIDENT_HEADER, BehaviorsNotInstalled,
} from '../../lib/behaviors';
import IncidentPreview, { PreviewBehavior } from './IncidentPreview';

const FOOT = { height: 48, marginTop: 0, paddingHorizontal: 18 };
const HEAD_BTN = { height: 44, marginTop: 0, paddingHorizontal: 16 };

export default function BehaviorsTab({ client, today, sample }: ClientCtx & { sample?: boolean }) {
  const [list, setList] = useState<TargetBehavior[] | null>(null);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [sheet, setSheet] = useState<null | { edit: TargetBehavior | null } | 'preview'>(null);
  const [menu, openMenu] = useActionMenu();

  const reload = useCallback(async () => {
    try {
      const [bs, is] = await Promise.all([loadBehaviors(client.link_id), loadIncidents(client.link_id)]);
      setList(bs); setIncidents(is); setError(null);
    } catch (e) {
      if (e instanceof BehaviorsNotInstalled) setMissing(true); else setError((e as Error).message);
      setList([]);
    }
  }, [client.link_id]);
  useEffect(() => { if (!sample) reload(); }, [reload, sample]);

  const shown = useMemo(() => (list ?? []).filter((b) => !b.archived), [list]);
  const known = useMemo(() => new Set((list ?? []).map((b) => b.id)), [list]);
  // hedefe bağlı olmayanlar ve hedefi silinmiş olanlar "Diğer bildirilen olaylar"da
  const others = useMemo(() => incidents.filter((i) => !i.behavior_id || !known.has(i.behavior_id)), [incidents, known]);

  if (sample) return <Notice icon="locate-outline" text="Davranışlar ve olaylar gerçek danışanlarda: aileyi davet et, sonra buradan hedef davranış tanımla; ebeveyn olayları aile uygulamasından bildirir." />;
  if (missing) return <Notice icon="cloud-offline-outline" text="Davranışlar ve olaylar için veritabanı güncellemesi bekleniyor." />;
  if (!list) return <ActivityIndicator color={colors.navy} style={{ marginTop: 30 }} />;

  const toggle = (id: string) => setOpen((o) => { const n = new Set(o); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); await reload(); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); } };
  const exportCsv = async () => {
    const rows = incidentRows(incidents, list);
    if (!rows.length) return Alert.alert('Dışa aktarılacak olay yok.');
    try {
      const r = await saveTextFile(incidentsCsvName(client.child_name, today), toCsv([INCIDENT_HEADER, ...rows]));
      if (r === 'saved') track('export.behaviors', { rows: rows.length });
    } catch (e) { Alert.alert('Dosya oluşturulamadı', (e as Error).message); }
  };
  const gear = (b: TargetBehavior) => (e: any) => openMenu({ items: [
    { label: 'Düzenle', icon: 'create-outline', onPress: () => setSheet({ edit: b }) },
    { label: 'Arşivle', icon: 'archive-outline', destructive: true, onPress: () => openMenu(confirmSpec('Hedef davranış arşivlensin mi?',
      'Ebeveyn bu davranış için artık olay bildiremez. Kaydedilen olaylar silinmez, dışa aktarmada kalır.', 'Arşivle', () => run(() => archiveBehavior(b.id)), 'archive-outline')) },
  ] }, e);
  const add = () => setSheet({ edit: null });
  const previewOf = (bs: TargetBehavior[]): PreviewBehavior[] => bs.map((b) => ({ id: b.id, title: b.title, strategies: b.strategies, log_type: b.log_type, parent_logging: b.parent_logging }));

  return (
    <View style={{ gap: 12 }}>
      {menu}
      {error && <Notice icon="alert-circle-outline" text={`Yüklenemedi: ${error}`} />}
      <View style={styles.headRow}>
        <View style={styles.headTitle}>
          <View style={styles.headIcon}><Ionicons name="locate-outline" size={20} color={colors.navy} /></View>
          <Text style={styles.title}>Hedef davranışlar ve bildirilen olaylar</Text>
        </View>
        <View style={styles.headBtns}>
          <Pressable onPress={exportCsv} style={({ pressed }) => [styles.outline, pressed && { opacity: 0.7 }]} accessibilityRole="button">
            <Ionicons name={Platform.OS === 'web' ? 'download-outline' : 'share-outline'} size={16} color={colors.navy} />
            <Text style={styles.outlineText}>Dışa aktar</Text>
          </Pressable>
          <Cta label="+ Hedef davranış ekle" onPress={add} style={HEAD_BTN} />
        </View>
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

      {shown.map((b) => (
        <BehaviorCard key={b.id} behavior={b} incidents={incidents.filter((i) => i.behavior_id === b.id)} open={open.has(b.id)}
          onToggle={() => toggle(b.id)} onGear={gear(b)} />
      ))}

      <View style={styles.card}>
        <Pressable onPress={() => toggle('__other__')} style={styles.cardHead} accessibilityRole="button" accessibilityState={{ expanded: open.has('__other__') }}>
          <Ionicons name={open.has('__other__') ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.navy} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={styles.cardTitle}>Diğer bildirilen olaylar</Text>
            <Text style={styles.small}>Ebeveynlerin hedef davranışlarla ilgisi olmayan bildirdiği olaylar</Text>
          </View>
          <Text style={[styles.small, { flexShrink: 0 }]}>{others.length} olay</Text>
        </Pressable>
        {open.has('__other__') && <IncidentTable cols={OTHER_COLS} rows={others} />}
      </View>

      {sheet === 'preview' && <IncidentPreview behaviors={previewOf(shown)} childName={client.child_name} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && (
        <BehaviorSheet behavior={sheet.edit} others={previewOf(shown.filter((x) => x.id !== sheet.edit?.id))} childName={client.child_name}
          onClose={() => setSheet(null)}
          onSave={(d) => run(() => saveBehavior({ ...d, id: sheet.edit?.id, clinic_id: client.clinic_id, link_id: client.link_id }))} />
      )}
    </View>
  );
}

function StatusPill({ status }: { status: BehaviorStatus }) {
  const m = statusMeta(status);
  return (
    <View style={[styles.pill, { backgroundColor: m.bg }]} accessibilityLabel={`Durum: ${m.label}`}>
      <View style={[styles.pillDot, { backgroundColor: m.bar }]} />
      <Text style={[styles.pillText, { color: m.fg }]} numberOfLines={1}>{m.label}</Text>
    </View>
  );
}

function BehaviorCard({ behavior: b, incidents, open, onToggle, onGear }: {
  behavior: TargetBehavior; incidents: Incident[]; open: boolean; onToggle: () => void; onGear: (e: any) => void;
}) {
  const cols = useMemo(() => colsFor(typesShown(b, incidents)), [b, incidents]);
  return (
    <View style={styles.card}>
      <View style={styles.cardHead}>
        <Pressable onPress={onToggle} style={styles.cardToggle} accessibilityRole="button" accessibilityState={{ expanded: open }} accessibilityLabel={b.title}>
          <Ionicons name={open ? 'chevron-down' : 'chevron-forward'} size={18} color={colors.navy} />
          <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
            <View style={styles.titleRow}>
              <StatusPill status={b.status} />
              <Text style={styles.cardTitle}>{b.title}</Text>
            </View>
            <Text style={styles.small}>
              Başlangıç: {dayLabel(b.started_at)} · {incidents.length} olay{b.parent_logging ? '' : ' · Ebeveyn kaydı kapalı'}
            </Text>
          </View>
        </Pressable>
        <IconButton name="settings-outline" label="Hedef davranış ayarları" onPress={onGear} />
      </View>
      {open && (
        <View style={{ gap: 8 }}>
          {!!b.description && <Text style={styles.body}>{b.description}</Text>}
          {b.strategies.length > 0 && (
            <View style={{ gap: 4 }}>
              <Text style={styles.label}>Stratejiler</Text>
              {b.strategies.map((x, i) => <Text key={i} style={styles.body}>• {x}</Text>)}
            </View>
          )}
          <IncidentTable cols={cols} rows={incidents} />
        </View>
      )}
    </View>
  );
}

// ---------------------------------------------------------------- olay tablosu
type Col = { key: string; label: string; w: number; render: (i: Incident) => React.ReactNode };
const muted = (t: string) => <Text style={[styles.td, { color: colors.muted }]}>{t}</Text>;
const txt = (t: string | null | undefined, empty = '—') => (t && t.trim() ? <Text style={styles.td}>{t}</Text> : muted(empty));
const C = {
  date: { key: 'date', label: 'Tarih', w: 72, render: (i: Incident) => <View><Text style={[styles.td, { fontWeight: '600' }]}>{dayLabel(i.occurred_at)}</Text><Text style={styles.tdSmall}>{timeLabel(i.occurred_at)}</Text></View> },
  reporter: { key: 'reporter', label: 'Bildiren', w: 110, render: (i: Incident) => txt(i.reporter_name, 'Ebeveyn') },
  count: { key: 'count', label: 'Sayı', w: 60, render: (i: Incident) => txt(i.count != null ? String(i.count) : '') },
  frequency: { key: 'frequency', label: 'Sıklık', w: 64, render: (i: Incident) => txt(i.count != null ? `${i.count} kez` : '') },
  antecedent: { key: 'antecedent', label: 'Öncül', w: 170, render: (i: Incident) => txt(i.antecedent) },
  consequence: { key: 'consequence', label: 'Sonuç', w: 170, render: (i: Incident) => txt(i.consequence) },
  duration: { key: 'duration', label: 'Süre', w: 70, render: (i: Incident) => txt(i.duration_min != null ? `${i.duration_min} dk` : '') },
  behavior: { key: 'behavior', label: 'Davranış', w: 150, render: (i: Incident) => txt(i.other_behavior) },
  strategy: { key: 'strategy', label: 'Uygulanan strateji', w: 170, render: (i: Incident) => txt(i.strategy, 'Hiçbiri') },
  response: { key: 'response', label: 'Çocuğun tepkisi', w: 120, render: (i: Incident) => (i.response != null
    ? <Text style={styles.td}>{responseLabel(i.response)} <Text style={styles.tdSmall}>· {i.response}/5</Text></Text> : muted('—')) },
} satisfies Record<string, Col>;

function colsFor(types: LogType[]): Col[] {
  const mid: Col[] = [];
  if (types.includes('frequency')) mid.push(C.count);
  if (types.includes('abc')) mid.push(C.antecedent, C.consequence);
  if (types.includes('duration')) mid.push(C.duration);
  return [C.date, C.reporter, ...mid, C.strategy, C.response];
}
// dokuz sütun: geniş ekranda (≈ 930 px) kaydırmadan sığsın diye metin sütunları daha dar
const OTHER_COLS: Col[] = [C.date, { ...C.reporter, w: 90 }, { ...C.behavior, w: 130 }, { ...C.antecedent, w: 130 }, { ...C.consequence, w: 130 },
  { ...C.duration, w: 60 }, C.frequency, { ...C.strategy, w: 130 }, { ...C.response, w: 110 }];

// Sütun genişlikleri ölçülen alana göre hesaplanır (yatay kaydırmada içerik metnin tek satırlık genişliğine yayılmasın; web ve iOS aynı):
// alan yetiyorsa sütunlar orantılı genişler, yetmiyorsa tablo en dar hâliyle yatay kayar
function IncidentTable({ cols, rows }: { cols: Col[]; rows: Incident[] }) {
  const [avail, setAvail] = useState(0);
  if (!rows.length) return <Text style={[styles.small, { paddingVertical: 6 }]}>Henüz olay kaydedilmedi.</Text>;
  const total = cols.reduce((n, c) => n + c.w, 0);
  const width = Math.max(total, avail);
  const cell = (c: Col) => [styles.cell, { width: Math.floor((c.w * width) / total) }];
  return (
    <View style={styles.table} onLayout={(e) => setAvail(Math.floor(e.nativeEvent.layout.width) - 2)}>
      <ScrollView horizontal showsHorizontalScrollIndicator>
        <View style={{ width }}>
          <View style={[styles.trow, styles.thead]}>
            {cols.map((c) => <View key={c.key} style={cell(c)}><Text style={styles.th}>{c.label}</Text></View>)}
          </View>
          {rows.map((i, k) => (
            <View key={i.id} style={[styles.trow, k === rows.length - 1 && { borderBottomWidth: 0 }]}>
              {cols.map((c) => <View key={c.key} style={cell(c)}>{c.render(i)}</View>)}
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ---------------------------------------------------------------- ekleme / düzenleme
function BehaviorSheet({ behavior, others, childName, onClose, onSave }: {
  behavior: TargetBehavior | null; others: PreviewBehavior[]; childName: string; onClose: () => void; onSave: (d: BehaviorDraft) => void;
}) {
  const [title, setTitle] = useState(behavior?.title ?? '');
  const [desc, setDesc] = useState(behavior?.description ?? '');
  const [strategies, setStrategies] = useState<string[]>(behavior?.strategies.length ? behavior.strategies : ['', '']);
  const [status, setStatus] = useState<BehaviorStatus>(behavior?.status ?? 'baselining');
  const [logging, setLogging] = useState(behavior?.parent_logging ?? true);
  const [logType, setLogType] = useState<LogType>(behavior?.log_type ?? 'frequency');
  const [tried, setTried] = useState(false);
  const [preview, setPreview] = useState(false);
  const missingTitle = !title.trim();
  const save = () => {
    if (missingTitle) { setTried(true); return; }
    onSave({ title, description: desc, strategies: cleanStrategies(strategies), status, parent_logging: logging, log_type: logType });
    onClose();
  };
  const draft: PreviewBehavior = { id: behavior?.id ?? '__draft__', title: title.trim() || 'Yeni hedef davranış', strategies: cleanStrategies(strategies), log_type: logType, parent_logging: logging };
  return (
    <SheetFrame title={behavior ? 'Hedef davranışı düzenle' : 'Yeni hedef davranış'} onClose={onClose}
      footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label="Kaydet" onPress={save} style={FOOT} /></>}>
      <Pressable onPress={() => { setPreview(true); track('behavior.preview', { from: 'form' }); }} style={styles.previewLink} accessibilityRole="button" hitSlop={6}>
        <Text style={styles.link}>Ebeveyn deneyimini önizle ↗</Text>
      </Pressable>
      <Text style={styles.body}>Kaydettikten sonra ebeveynler olayları ve kullandıkları stratejileri kaydedebilir.</Text>

      <Text style={styles.label}>Hedef davranış</Text>
      <Text style={styles.small}>Odaklandığın davranış</Text>
      <Input value={title} onChangeText={setTitle} maxLength={80} placeholder="Ör. Ekranı kapatırken ağlama" accessibilityLabel="Hedef davranış" />
      {tried && missingTitle && <Text style={styles.error}>⚠ Lütfen bir başlık gir</Text>}

      <Text style={styles.label}>Açıklama</Text>
      <Text style={styles.small}>Bu davranış aile için ne anlama geliyor, aileden ne istiyorsun?</Text>
      <Input value={desc} onChangeText={setDesc} maxLength={1000} multiline placeholder="Açıklama" accessibilityLabel="Açıklama" />

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
          <Text style={styles.link}>+ strateji ekle</Text>
        </Pressable>
      )}

      <Text style={styles.label}>Durum</Text>
      <View style={styles.statusGrid} accessibilityRole="radiogroup">
        {STATUS.map((st) => {
          const on = st.key === status;
          return (
            <Pressable key={st.key} onPress={() => setStatus(st.key)} style={[styles.statusOpt, on && styles.optOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
              <View style={[styles.statusBar, { backgroundColor: st.bar }]} />
              <Text style={[styles.optTitle, { flexShrink: 1 }]}>{st.label}</Text>
              <View style={{ flexGrow: 1 }} />
              <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.navy : colors.faint} />
            </Pressable>
          );
        })}
      </View>

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
  headBtns: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  outline: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14 },
  outlineText: { fontSize: 14, fontWeight: '600', color: colors.navy },
  previewLink: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  link: { color: colors.navy, fontWeight: '700', textDecorationLine: 'underline', fontSize: 13.5 },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 24, paddingHorizontal: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint, borderRadius: 12, backgroundColor: '#fff' },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  card: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, gap: 10 },
  cardHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardToggle: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 8 },
  // dar ekranda ad durum çipinin altına iner (ezilmez)
  titleRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 9, paddingVertical: 4, borderRadius: radius.pill, flexShrink: 0 },
  pillDot: { width: 7, height: 7, borderRadius: 4 },
  pillText: { fontSize: 12, fontWeight: '700' },
  body: { fontSize: 14, color: colors.text, lineHeight: 20, flexShrink: 1 },
  small: { fontSize: 12.5, color: colors.muted, flexShrink: 1 },
  label: { fontSize: 13, fontWeight: '700', color: colors.navy, marginTop: 6 },
  error: { fontSize: 13, color: colors.danger, fontWeight: '600' },
  table: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, overflow: 'hidden' },
  trow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  thead: { backgroundColor: '#F7F8FA' },
  cell: { flexShrink: 0, paddingHorizontal: 10, paddingVertical: 9 },
  th: { fontSize: 12, fontWeight: '700', color: colors.muted },
  td: { fontSize: 13.5, color: colors.text, lineHeight: 19, flexShrink: 1 },
  tdSmall: { fontSize: 12, color: colors.muted },
  stratRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  statusOpt: { flexDirection: 'row', alignItems: 'center', gap: 10, flexGrow: 1, flexBasis: 200, minWidth: 0, borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingVertical: 10, paddingRight: 12, paddingLeft: 10, backgroundColor: '#fff' },
  statusBar: { width: 5, height: 24, borderRadius: 3 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, backgroundColor: '#fff' },
  optOn: { borderColor: colors.navy, backgroundColor: '#EEF1F8' },
  optTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
});
