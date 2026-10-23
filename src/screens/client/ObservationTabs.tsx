import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { Card, Label, Empty } from '../../components/ui';
import { WeeklyRateBars, RateBar, Stat } from '../../components/charts';
import {
  weekly, perTask, observations, bySkill, abcSummary, windowStarts, lastFullDay, parseDate, isoDate, DECLINE_LABELS, LIMITS_TEXT,
  MASTERY_RATE, MASTERY_WEEKS, DayPart, AbcEvent, dayPart,
} from '../../lib/metrics';
import AbcVoice from '../../components/AbcVoice';
import type { ClientCtx } from './ClientScreen';
import { skillName } from '../../skills';

const p = (v: number | null) => (v === null ? '–' : `%${v}`);

export function Limits() {
  return <Text style={styles.limits}>{LIMITS_TEXT}</Text>;
}

/* ---------- Özet ---------- */

export function SummaryTab({ data, today, weeks }: ClientCtx) {
  const from = windowStarts(today, weeks)[0];
  const o = useMemo(() => observations(data.tasks, data.completions, from, lastFullDay(today)), [data, from, today]);
  const w = useMemo(() => weekly(data.tasks, data.completions, today, weeks), [data, today, weeks]);

  if (!o.planned) {
    return <Empty text="Bu dönemde çocuğa atanmış görev yok. Ebeveyn ParentApp'te görev ekledikçe göstergeler burada oluşur." />;
  }
  return (
    <View>
      <Label>{`Son ${weeks} hafta (dünkü güne kadar)`}</Label>
      <View style={styles.stats}>
        <Stat value={p(o.rate)} label="Tamamlama" hint={`${o.approved} / ${o.planned} planlanan görev onaylandı`} />
        <Stat value={p(o.fullDayRate)} label="Tam gün" hint={`${o.fullDays} / ${o.plannedDays} günde planlanan her şey yapıldı`} />
        <Stat value={p(o.beforeReminderRate)} label="Hatırlatmadan önce"
          hint={o.withReminder ? `Hatırlatmalı ${o.withReminder} görevin ${o.beforeReminder}'i saatinden önce başlandı` : 'Hatırlatma saati olan görev yok'} />
        <Stat value={p(o.declineRate)} label="Yapamam" hint={`${o.declined} kez "Yapamam" dedi`} />
      </View>
      <Label>Haftalık tamamlama</Label>
      <Card><WeeklyRateBars data={w} /></Card>
      <Label>Ebeveyn döngüsü</Label>
      <Card style={{ gap: 6 }}>
        <Row k="Ebeveyn ret oranı" v={p(o.rejectRate)} />
        <Row k={'"Yaptım" → ebeveyn kararı (ortanca)'} v={o.reviewDelayHours === null ? '–' : `${o.reviewDelayHours} saat`} />
      </Card>
      <Limits />
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
      <Text style={styles.body}>{k}</Text>
      <Text style={[styles.body, { fontWeight: '700' }]}>{v}</Text>
    </View>
  );
}

/* ---------- Rutin (görev başına, beceri alanı, Yapamam nedenleri, ret notları) ---------- */

export function RoutineTab({ data, today, weeks }: ClientCtx) {
  const from = windowStarts(today, weeks)[0];
  const tasks = useMemo(() => perTask(data.tasks, data.completions, today, weeks), [data, today, weeks]);
  const skills = useMemo(() => bySkill(data.tasks, data.completions, from, lastFullDay(today)), [data, from, today]);
  const o = useMemo(() => observations(data.tasks, data.completions, from, lastFullDay(today)), [data, from, today]);
  const notes = data.completions
    .filter((c) => c.status === 'rejected' && c.parent_note && c.date >= from)
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 10);
  const titles = new Map(data.tasks.map((t) => [t.id, t.title]));

  if (!tasks.length) return <Empty text="Bu dönemde planlanmış görev yok." />;
  return (
    <View>
      <Label>Görev başına (en zorlanandan başlayarak)</Label>
      <Card style={{ gap: 14 }}>
        {tasks.map((s) => (
          <View key={s.task.id} style={{ gap: 6 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 16 }}>{s.task.emoji}</Text>
              <Text style={[styles.body, { flex: 1, fontWeight: '600' }]}>{s.task.title}</Text>
              {s.mastered && <Text style={styles.badge}>Ustalık</Text>}
              <Text style={[styles.body, { fontWeight: '700', width: 48, textAlign: 'right' }]}>{p(s.rate)}</Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <RateBar rate={s.rate} />
              <Text style={styles.small}>{s.approved}/{s.planned}</Text>
            </View>
            <Text style={styles.small}>
              Haftalar: {s.weeklyRates.map((r) => (r === null ? '–' : r)).join(' · ')}
              {s.task.reminder ? ` · hatırlatma ${s.task.reminder}` : ''}{skillName(s.task.skill) ? ` · ${skillName(s.task.skill)}` : ''}
            </Text>
          </View>
        ))}
      </Card>
      <Text style={styles.note}>
        Ustalık: tamamlanmış son {MASTERY_WEEKS} haftanın her birinde ≥ %{MASTERY_RATE}. Ödülü azaltmak ya da yeni hedef koymak için bir işaret; kalıcı değişimi garanti etmez.
      </Text>

      <Label>Beceri alanına göre</Label>
      <Card style={{ gap: 10 }}>
        {skills.map((s) => (
          <View key={s.skill} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Text style={[styles.body, { width: 140 }]}>{s.skill}</Text>
            <RateBar rate={s.rate} />
            <Text style={[styles.body, { width: 48, textAlign: 'right' }]}>{p(s.rate)}</Text>
          </View>
        ))}
      </Card>

      <Label>"Yapamam" nedenleri</Label>
      <Card style={{ gap: 6 }}>
        {o.declined === 0 ? <Empty text={'Bu dönemde "Yapamam" seçilmedi.'} /> : (
          (Object.keys(o.declineReasons) as (keyof typeof o.declineReasons)[])
            .filter((k) => o.declineReasons[k] > 0)
            .map((k) => <Row key={k} k={DECLINE_LABELS[k]} v={String(o.declineReasons[k])} />)
        )}
      </Card>
      <Text style={styles.note}>Neden, görevin çocuğa uygun olup olmadığını ve açıklamanın netliğini gösterir; dürüstlük yargısı değildir.</Text>

      <Label>Ebeveynin ret notları</Label>
      <Card style={{ gap: 8 }}>
        {notes.length === 0 ? <Empty text="Bu dönemde notlu ret yok." /> : notes.map((c) => (
          <Text key={c.task_id + c.date} style={styles.body}>
            <Text style={{ fontWeight: '600' }}>{parseDate(c.date).toLocaleDateString('tr-TR')} · {titles.get(c.task_id) ?? ''}: </Text>
            {c.parent_note}
          </Text>
        ))}
      </Card>
      <Limits />
    </View>
  );
}

/* ---------- Zor anlar (ABC) ---------- */

const PARTS: { id: DayPart; label: string }[] = [
  { id: 'sabah', label: 'Sabah' },
  { id: 'öğle', label: 'Öğle' },
  { id: 'akşam', label: 'Akşam' },
  { id: 'gece', label: 'Gece' },
];

const PART_LABEL: Record<DayPart, string> = { sabah: 'Sabah', 'öğle': 'Öğle', 'akşam': 'Akşam', gece: 'Gece' };

// Yeni kayıtlarda saat temsilîdir (ebeveyn gün bölümünü seçer): tarih + gün bölümü; eski kayıtlarda saat de
function abcWhen(e: AbcEvent) {
  const d = new Date(e.occurred_at);
  const day = d.toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' });
  if (e.day_part) return `${day} · ${PART_LABEL[dayPart(e)]}`;
  return `${day} · ${d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}`;
}

export function AbcTab({ data, today, weeks }: ClientCtx) {
  const s = useMemo(() => abcSummary(data.abc, today, weeks), [data, today, weeks]);
  const from = s.perWeek[0].start;
  const list = data.abc.filter((e) => isoDate(new Date(e.occurred_at)) >= from);

  if (!s.total) return <Empty text="Bu dönemde ebeveyn zor an kaydı girmedi. Kayıtlar ParentApp › Aile › Uzmanım bölümünden eklenir." />;
  return (
    <View>
      <Label>Haftalık sayı ve ortalama şiddet (1–5)</Label>
      <Card style={{ gap: 6 }}>
        {s.perWeek.map((w) => (
          <Row key={w.start} k={`${parseDate(w.start).toLocaleDateString('tr-TR')} haftası`}
            v={w.count ? `${w.count} kayıt · şiddet ${w.avgIntensity}` : '–'} />
        ))}
      </Card>
      <Label>Günün hangi bölümünde</Label>
      <Card style={{ gap: 6 }}>
        {PARTS.map((x) => <Row key={x.id} k={x.label} v={String(s.byDayPart[x.id])} />)}
      </Card>
      <Label>{`Kayıtlar (${list.length})`}</Label>
      <View style={{ gap: 8 }}>
        {list.map((e) => (
          <Card key={e.id} style={{ gap: 4 }}>
            <Text style={styles.small}>
              {abcWhen(e)} · şiddet {e.intensity}/5
            </Text>
            {e.antecedent ? <Text style={styles.body}><Text style={styles.abcKey}>Öncesi: </Text>{e.antecedent}</Text> : null}
            <Text style={styles.body}><Text style={styles.abcKey}>Davranış: </Text>{e.behavior}</Text>
            {e.consequence ? <Text style={styles.body}><Text style={styles.abcKey}>Sonucu: </Text>{e.consequence}</Text> : null}
            {e.audio_path ? <AbcVoice path={e.audio_path} durationMs={e.duration_ms} /> : null}
          </Card>
        ))}
      </View>
      <Limits />
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted },
  note: { fontSize: 11, color: colors.muted, marginTop: 6, lineHeight: 16 },
  limits: { fontSize: 11, color: colors.muted, marginTop: 24, lineHeight: 16 },
  badge: {
    fontSize: 11, fontWeight: '700', color: colors.ok, backgroundColor: colors.easy.bg,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden',
  },
  abcKey: { fontWeight: '600' },
});
