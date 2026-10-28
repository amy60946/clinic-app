import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, TextInput, StyleSheet, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Card, Label, Empty, IconButton, Segmented, Toggle, ChipBar } from '../../components/ui';
import { MultiLine, SERIES_COLORS } from '../../components/charts';
import {
  CellState, Task, Completion, weekGrid, weeklyCounts, timeOfDay, TimeOfDay, TIME_OF_DAY_LABEL, instances, parseDate,
  windowStarts, lastFullDay, DECLINE_LABELS, isoDow,
} from '../../lib/metrics';
import { categories, skillKey, skillName } from '../../skills';
import { repeatSummary } from './SuggestionEditor';
import type { ClientCtx } from './ClientScreen';
import { RoutineTab, Limits } from './ObservationTabs';
import SuggestionsTab from './SuggestionsTab';
import ExportButton from '../../components/ExportButton';
import { routineRows, csvName, ROUTINE_HEADER } from '../../lib/csv';

// Ev rutinleri (uzman): haftalık tablo (gün gün), zaman içinde (haftalık sayı, çoklu görev), oranlar (görev başına, beceri,
// "Yapamam", ret notları) ve öneriler. Görev eklemek uzmanın önerisidir; ebeveyn ParentApp'te onaylayınca çocuğa gider.
export type RoutineView = 'week' | 'trend' | 'stats' | 'suggest';

const DAY_LETTER = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

const CELL: Record<CellState, { icon: keyof typeof Ionicons.glyphMap | null; color: string; label: string }> = {
  approved: { icon: 'checkmark-circle', color: colors.ok, label: 'Yaptı, ebeveyn onayladı' },
  waiting: { icon: 'checkmark-circle-outline', color: colors.medium.fg, label: '"Yaptım" dedi, ebeveyn incelemedi' },
  declined: { icon: 'hand-left-outline', color: colors.medium.fg, label: '"Yapamam" dedi' },
  rejected: { icon: 'close-circle', color: colors.danger, label: 'Ebeveyn onaylamadı' },
  retry: { icon: 'refresh-circle-outline', color: '#2C4A9A', label: 'Ebeveyn "Tekrar dene" dedi' },
  missed: { icon: 'close', color: colors.faint, label: 'Planlıydı, kayıt yok' },
  today: { icon: 'ellipse-outline', color: colors.faint, label: 'Bugün, henüz kayıt yok' },
  off: { icon: null, color: colors.faint, label: 'Planlı değil' },
};

export default function HomeRoutines(ctx: ClientCtx & { view: RoutineView; onView: (v: RoutineView) => void }) {
  const { view, onView, data } = ctx;
  const views: { id: RoutineView; label: string }[] = [
    { id: 'week', label: 'Haftalık' },
    { id: 'trend', label: 'Zaman içinde' },
    { id: 'stats', label: 'Oranlar' },
    ...(data.sample ? [] : [{ id: 'suggest' as const, label: 'Öneriler' }]),
  ];
  return (
    <View>
      <View style={styles.head}>
        <View style={{ flex: 1, minWidth: 240 }}>
          <Segmented options={views} value={view} onChange={onView} />
        </View>
        {view !== 'suggest' && (
          <ExportButton name={csvName('ev-rutini', ctx.client.child_name, windowStarts(ctx.today, ctx.weeks)[0], ctx.today)}
            header={ROUTINE_HEADER} event="export.routine"
            rows={() => routineRows(data.tasks, data.completions, windowStarts(ctx.today, ctx.weeks)[0], ctx.today)} />
        )}
        {!data.sample && view !== 'suggest' && (
          <Pressable onPress={() => onView('suggest')} style={styles.add} accessibilityRole="button">
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addText}>Rutin öner</Text>
          </Pressable>
        )}
      </View>
      {view === 'week' && <WeekGrid {...ctx} />}
      {view === 'trend' && <Trend {...ctx} />}
      {view === 'stats' && <RoutineTab {...ctx} />}
      {view === 'suggest' && <SuggestionsTab {...ctx} />}
    </View>
  );
}

/* ---------- Haftalık: son 7 gün, gün gün ---------- */

function WeekGrid(ctx: ClientCtx) {
  const { data, today } = ctx;
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const { dates, rows } = useMemo(() => weekGrid(data.tasks, data.completions, today), [data, today]);
  const [open, setOpen] = useState<Task | null>(null);
  if (!rows.length) return <Empty text="Son 7 günde planlı görev yok. Görevler ebeveynin ParentApp'te eklediği ya da önerini onayladığı görevlerdir." />;
  return (
    <View>
      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 12 }}>
        <View style={[styles.row, styles.headRow]}>
          <Text style={[styles.th, { flex: 1 }]}>Görev</Text>
          {wide && <Text style={[styles.th, { width: 80 }]}>Günün bölümü</Text>}
          <Text style={[styles.th, { width: wide ? 72 : 44, textAlign: 'center' }]}>{wide ? 'Yapılan / plan' : 'Son 7'}</Text>
          {dates.map((d) => (
            <View key={d} style={[styles.cellBox, d === today && styles.todayHead]}>
              <Text style={[styles.th, { textAlign: 'center', color: d === today ? '#fff' : colors.muted }]}>{DAY_LETTER[isoDow(d) - 1]}</Text>
            </View>
          ))}
        </View>
        {rows.map((r, i) => (
          <Pressable key={r.task.id} onPress={() => setOpen(r.task)} accessibilityRole="button" accessibilityLabel={`${r.task.title} ayrıntısı`}
            style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: '#F7F8FA' }]}>
            <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <Text style={{ fontSize: 15 }}>{r.task.emoji}</Text>
              <Text style={styles.task} numberOfLines={wide ? 1 : 2}>{r.task.title}</Text>
            </View>
            {wide && <Text style={[styles.small, { width: 80 }]}>{TIME_OF_DAY_LABEL[timeOfDay(r.task)]}</Text>}
            <View style={{ width: wide ? 72 : 44, alignItems: 'center' }}>
              <Text style={[styles.count, r.planned > 0 && r.done < r.planned / 2 && { backgroundColor: colors.medium.bg, color: colors.medium.fg }]}>
                {r.done}{wide ? ` / ${r.planned}` : ''}
              </Text>
            </View>
            {r.cells.map((c) => (
              <View key={c.date} style={[styles.cellBox, c.date === today && styles.todayCol]} accessibilityLabel={CELL[c.state].label}>
                {CELL[c.state].icon
                  ? <Ionicons name={CELL[c.state].icon!} size={c.state === 'missed' ? 14 : 18} color={CELL[c.state].color} />
                  : <Text style={{ color: colors.faint, fontSize: 12 }}>–</Text>}
              </View>
            ))}
          </Pressable>
        ))}
      </Card>
      <View style={styles.legend}>
        {(['approved', 'waiting', 'declined', 'rejected', 'retry', 'missed'] as CellState[]).map((k) => (
          <View key={k} style={styles.legendItem}>
            <Ionicons name={CELL[k].icon!} size={14} color={CELL[k].color} />
            <Text style={styles.small}>{CELL[k].label}</Text>
          </View>
        ))}
        <View style={styles.legendItem}><Text style={{ color: colors.faint, fontSize: 12 }}>–</Text><Text style={styles.small}>Planlı değil</Text></View>
      </View>
      <Text style={styles.note}>Satıra dokununca görevin gün gün geçmişi açılır. Bugün henüz bitmediği için oranlarda sayılmaz.</Text>
      <TaskDetail task={open} ctx={ctx} onClose={() => setOpen(null)} />
    </View>
  );
}

/* ---------- Görev ayrıntısı: bilgiler ve dönem içindeki gün gün geçmiş ---------- */

const STATE_TEXT: Record<CellState, string> = {
  approved: 'Yaptı · onaylandı', waiting: 'Yaptım dedi · inceleme bekliyor', declined: 'Yapamam', rejected: 'Onaylanmadı',
  retry: 'Tekrar dene', missed: 'Kayıt yok', today: 'Bugün', off: '',
};

function TaskDetail({ task, ctx, onClose }: { task: Task | null; ctx: ClientCtx; onClose: () => void }) {
  return (
    <Modal visible={!!task} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {task && <TaskDetailBody task={task} ctx={ctx} onClose={onClose} />}
    </Modal>
  );
}

function TaskDetailBody({ task, ctx, onClose }: { task: Task; ctx: ClientCtx; onClose: () => void }) {
  const { data, today, weeks } = ctx;
  const from = windowStarts(today, weeks)[0];
  const history = useMemo(() => {
    const planned = instances([task], data.completions, from, today);
    const seen = new Set(planned.map((i) => i.date));
    // planlı olmayan günde de kayıt olabilir (ör. tek seferlik görev başka gün yapıldı)
    const extra = data.completions.filter((c) => c.task_id === task.id && c.date >= from && c.date <= today && !seen.has(c.date))
      .map((c) => ({ task, date: c.date, c }));
    return [...planned, ...extra].sort((a, b) => b.date.localeCompare(a.date));
  }, [task, data, from, today]);
  const byClinic = data.fromClinic.includes(task.id);
  const repeat = task.recurring ? repeatSummary(task.repeat_kind, task.repeat_days) : 'Tek seferlik';
  const stateOf = (c: Completion | undefined, d: string): CellState =>
    c ? (c.status === 'approved' ? 'approved' : c.status === 'pending' ? 'waiting' : c.status) : d >= today ? 'today' : 'missed';
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.sheetHead}>
          <IconButton name="close" onPress={onClose} label="Kapat" />
          <Text style={styles.sheetTitle} numberOfLines={2}>{task.emoji} {task.title}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 4 }}>
          <Card style={{ gap: 6 }}>
            <Info k="Başlangıç" v={parseDate(task.start_date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} />
            <Info k="Tekrar" v={repeat} />
            <Info k="Günün bölümü" v={`${TIME_OF_DAY_LABEL[timeOfDay(task)]}${task.reminder ? ` · hatırlatma ${task.reminder}` : ''}`} />
            {!!skillName(task.skill) && <Info k="Beceri" v={skillName(task.skill)} />}
            <Info k="Ekleyen" v={byClinic ? 'Uzman önerisi (ebeveyn onayladı)' : 'Ebeveyn'} />
            <Info k="İnceleme" v={task.requires_review ? 'Ebeveyn onaylar' : 'Onay gerekmez'} />
          </Card>
          <Label>{`Son ${weeks} hafta, gün gün`}</Label>
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            {history.length === 0 ? <View style={{ padding: 16 }}><Empty text="Bu dönemde planlı gün yok." /></View> : history.map((h, i) => {
              const st = stateOf(h.c, h.date);
              return (
                <View key={h.date} style={[styles.histRow, i > 0 && styles.rowLine]}>
                  <Text style={[styles.small, { width: 92 }]}>{parseDate(h.date).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', weekday: 'short' })}</Text>
                  <View style={{ flex: 1, gap: 3 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      {CELL[st].icon && <Ionicons name={CELL[st].icon!} size={15} color={CELL[st].color} />}
                      <Text style={styles.body}>{STATE_TEXT[st]}</Text>
                    </View>
                    {h.c?.status === 'declined' && h.c.decline_reason && <Text style={styles.small}>Neden: {DECLINE_LABELS[h.c.decline_reason]}</Text>}
                    {!!h.c?.parent_note && <Text style={styles.small}>Ebeveynin notu: {h.c.parent_note}</Text>}
                    {!!h.c?.motivation && <Text style={styles.small}>Motive etmek (ebeveyn): {h.c.motivation <= 2 ? 'kolay' : h.c.motivation === 3 ? 'orta' : 'zor'}</Text>}
                  </View>
                </View>
              );
            })}
          </Card>
          <Limits />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function Info({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Text style={[styles.small, { width: 110 }]}>{k}</Text>
      <Text style={[styles.body, { flex: 1 }]}>{v}</Text>
    </View>
  );
}

/* ---------- Zaman içinde: haftalık yapılan sayısı, seçilen görevler ---------- */

type Creator = 'all' | 'parent' | 'clinic';

function Trend({ data, today, weeks }: ClientCtx) {
  const { starts, series } = useMemo(() => weeklyCounts(data.tasks, data.completions, today, weeks), [data, today, weeks]);
  const [creator, setCreator] = useState<Creator>('all');
  const [part, setPart] = useState<TimeOfDay | 'all'>('all');
  const [cat, setCat] = useState<string>('all');
  const [q, setQ] = useState('');
  // varsayılan: en çok planlanan ilk üç görev
  const [picked, setPicked] = useState<string[]>(() =>
    [...series].sort((a, b) => b.planned.reduce((x, y) => x + y, 0) - a.planned.reduce((x, y) => x + y, 0)).slice(0, 3).map((s) => s.task.id));
  const [showPlan, setShowPlan] = useState(false);

  const shown = series.filter((s) => {
    const fromClinic = data.fromClinic.includes(s.task.id);
    if (creator === 'parent' && fromClinic) return false;
    if (creator === 'clinic' && !fromClinic) return false;
    if (part !== 'all' && timeOfDay(s.task) !== part) return false;
    if (cat !== 'all' && skillKey(s.task.skill) !== cat) return false;
    const query = q.trim().toLocaleLowerCase('tr');
    return !query || s.task.title.toLocaleLowerCase('tr').includes(query);
  });
  const plotted = series.filter((s) => picked.includes(s.task.id));
  const color = (id: string) => SERIES_COLORS[picked.indexOf(id) % SERIES_COLORS.length];
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length >= SERIES_COLORS.length ? p : [...p, id]));

  if (!series.length) return <Empty text="Bu dönemde planlı görev yok." />;
  return (
    <View>
      <Card style={{ marginTop: 12, gap: 8 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={[styles.small, { flex: 1 }]}>Haftada kaç kez yapıldı (ebeveyn onaylı), {weeks} hafta</Text>
          <Text style={styles.small}>Planı göster</Text>
          <Toggle value={showPlan} onChange={setShowPlan} />
        </View>
        {plotted.length === 0 ? <Empty text="Grafikte görmek için aşağıdan görev seç." /> : (
          <MultiLine starts={starts} series={plotted.map((s) => ({ id: s.task.id, values: s.done, color: color(s.task.id) }))}
            target={showPlan && plotted.length === 1 ? plotted[0].planned : null} />
        )}
        <View style={styles.legend}>
          {plotted.map((s) => (
            <View key={s.task.id} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: color(s.task.id) }]} />
              <Text style={styles.small}>{s.task.emoji} {s.task.title}</Text>
            </View>
          ))}
          {showPlan && plotted.length === 1 && <Text style={styles.small}>– – planlı gün sayısı</Text>}
        </View>
        {showPlan && plotted.length > 1 && <Text style={styles.small}>Plan çizgisi yalnız bir görev seçiliyken görünür.</Text>}
      </Card>

      <View style={{ gap: 8, marginTop: 12 }}>
        <Segmented options={[{ id: 'all', label: 'Hepsi' }, { id: 'parent', label: 'Ebeveyn ekledi' }, { id: 'clinic', label: 'Uzman önerdi' }]}
          value={creator} onChange={setCreator} />
        <ChipBar value={part} onChange={setPart}
          options={[{ id: 'all', label: 'Günün her bölümü' }, ...(['morning', 'noon', 'evening', 'night', 'any'] as TimeOfDay[]).map((t) => ({ id: t, label: TIME_OF_DAY_LABEL[t] }))]} />
        <ChipBar value={cat} onChange={setCat}
          options={[{ id: 'all', label: 'Bütün beceriler' }, ...categories.map((c) => ({ id: c.skill as string, label: `${c.emoji} ${skillName(c.skill)}` }))]} />
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Görev ara" placeholderTextColor={colors.muted} style={{ flex: 1, fontSize: 14, color: colors.navy }} />
        </View>
      </View>

      <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8 }}>
        <View style={[styles.row, styles.headRow]}>
          <Text style={[styles.th, { width: 30 }]}>Çiz</Text>
          <Text style={[styles.th, { flex: 1 }]}>Görev</Text>
          <Text style={[styles.th, { width: 76 }]}>Günün bölümü</Text>
          <Text style={[styles.th, { width: 64, textAlign: 'right' }]}>Haftalık ort.</Text>
        </View>
        {shown.length === 0 && <View style={{ padding: 16 }}><Empty text="Süzgece uyan görev yok." /></View>}
        {shown.map((s, i) => {
          const on = picked.includes(s.task.id);
          return (
            <Pressable key={s.task.id} onPress={() => toggle(s.task.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
              style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: '#F7F8FA' }]}>
              <View style={{ width: 30 }}>
                <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={on ? color(s.task.id) : colors.faint} />
              </View>
              <Text style={[styles.task, { flex: 1 }]} numberOfLines={2}>{s.task.emoji} {s.task.title}</Text>
              <Text style={[styles.small, { width: 76 }]}>{TIME_OF_DAY_LABEL[timeOfDay(s.task)]}</Text>
              <Text style={[styles.body, { width: 64, textAlign: 'right', fontWeight: '700' }]}>{s.avg === null ? '–' : s.avg.toLocaleString('tr-TR')}</Text>
            </Pressable>
          );
        })}
      </Card>
      <Text style={styles.note}>
        Haftalık ortalama, görevin planlı olduğu haftalarda onaylanan gün sayısının ortalamasıdır. En çok {SERIES_COLORS.length} görev birlikte çizilir.
        Dönem {parseDate(starts[0]).toLocaleDateString('tr-TR')} – {parseDate(lastFullDay(today)).toLocaleDateString('tr-TR')}.
      </Text>
      <Limits />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  sheetTitle: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.navy },
  head: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  add: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  addText: { color: '#fff', fontSize: 13, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 10 },
  headRow: { backgroundColor: '#F7F8FA', paddingVertical: 8 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  th: { fontSize: 11, fontWeight: '600', color: colors.muted },
  cellBox: { width: 26, height: 26, alignItems: 'center', justifyContent: 'center', borderRadius: 13 },
  todayHead: { backgroundColor: colors.navy },
  todayCol: { backgroundColor: colors.today },
  task: { fontSize: 13, fontWeight: '600', color: colors.text, flexShrink: 1 },
  count: { fontSize: 12, fontWeight: '700', color: colors.ok, backgroundColor: colors.easy.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  note: { fontSize: 11, color: colors.muted, marginTop: 8, lineHeight: 16 },
  legend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  histRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 14, paddingVertical: 10 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 12, height: 40 },
});

