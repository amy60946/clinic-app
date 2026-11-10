import React, { useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { Card, Label, Empty } from '../../components/ui';
import { WeeklyRateBars, RateBar, Stat } from '../../components/charts';
import {
  weekly, perTask, observations, bySkill, windowStarts, lastFullDay, parseDate, DECLINE_LABELS,
  motivationStats, motivationText, MOTIVATION_TREND_TEXT, Completion,
  MASTERY_RATE, MASTERY_WEEKS, dec,
} from '../../lib/metrics';
import type { ClientCtx } from './ClientScreen';
import { skillName } from '../../skills';

const p = (v: number | null) => (v === null ? '–' : `%${v}`);

/* ---------- Özet ---------- */

export function SummaryTab({ data, today, weeks }: ClientCtx) {
  const from = windowStarts(today, weeks)[0];
  const o = useMemo(() => observations(data.tasks, data.completions, from, lastFullDay(today)), [data, from, today]);
  const w = useMemo(() => weekly(data.tasks, data.completions, today, weeks), [data, today, weeks]);

  if (!o.planned) {
    return <Empty text="Bu dönemde çocuğa atanmış macera yok. Ebeveyn ParentApp'te sorumluluk ekledikçe göstergeler burada oluşur." />;
  }
  return (
    <View>
      <Label>{`Son ${weeks} hafta (dünkü güne kadar)`}</Label>
      <View style={styles.stats}>
        <Stat value={p(o.rate)} label="Tamamlama" hint={`${o.approved} / ${o.planned} planlanan macera onaylandı`} />
        <Stat value={p(o.fullDayRate)} label="Tam gün" hint={`${o.fullDays} / ${o.plannedDays} günde planlanan her şey yapıldı`} />
        <Stat value={p(o.beforeReminderRate)} label="Hatırlatmadan önce"
          hint={o.withReminder ? `Hatırlatmalı ${o.withReminder} maceranın ${o.beforeReminder} tanesi saatinden önce başlandı` : 'Hatırlatma saati olan macera yok'} />
        <Stat value={p(o.declineRate)} label="Yapamam" hint={`${o.declined} kez "Yapamam" dedi`} />
      </View>
      <Label>Haftalık tamamlama</Label>
      <Card><WeeklyRateBars data={w} /></Card>
      <Label>Ebeveyn döngüsü</Label>
      <Card style={{ gap: 6 }}>
        <Row k="Ebeveyn ret oranı" v={p(o.rejectRate)} />
        <Row k={'"Yaptım" → ebeveyn kararı (ortanca)'} v={o.reviewDelayHours === null ? '–' : `${dec(o.reviewDelayHours)} saat`} />
      </Card>
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
  const motivation = useMemo(() => motivationStats(data.completions, from, lastFullDay(today)), [data, from, today]);

  if (!tasks.length) return <Empty text="Bu dönemde planlanmış macera yok." />;
  return (
    <View>
      <Label>Macera başına (en zorlanandan başlayarak)</Label>
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
            <TaskMotivation comps={data.completions} from={from} to={lastFullDay(today)} taskId={s.task.id} />
          </View>
        ))}
      </Card>
      <Text style={styles.note}>
        Ustalık: tamamlanmış son {MASTERY_WEEKS} haftanın her birinde ≥ %{MASTERY_RATE}. Ödülü azaltmak ya da yeni davranış hedefi koymak için bir işaret; kalıcı değişimi garanti etmez.
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

      {motivation.answered > 0 && (
        <>
          <Label>Motive etmek (ebeveyn gözlemi)</Label>
          <Card style={{ gap: 6 }}>
            <Row k="Kolay" v={String(motivation.easy)} />
            <Row k="Orta" v={String(motivation.medium)} />
            <Row k="Zor" v={String(motivation.hard)} />
            {motivation.trend && <Text style={styles.small}>Ebeveynin yanıtlarına göre {MOTIVATION_TREND_TEXT[motivation.trend]}.</Text>}
          </Card>
          <Text style={styles.note}>Ebeveynin incelemede verdiği isteğe bağlı yanıt ("Motive etmek ne kadar zordu?"). Sorumluluğun çocuğa uygunluğunu konuşmak için bir ipucudur.</Text>
        </>
      )}

      <Label>"Yapamam" nedenleri</Label>
      <Card style={{ gap: 6 }}>
        {o.declined === 0 ? <Empty text={'Bu dönemde "Yapamam" seçilmedi.'} /> : (
          (Object.keys(o.declineReasons) as (keyof typeof o.declineReasons)[])
            .filter((k) => o.declineReasons[k] > 0)
            .map((k) => <Row key={k} k={DECLINE_LABELS[k]} v={String(o.declineReasons[k])} />)
        )}
      </Card>
      <Text style={styles.note}>Neden, sorumluluğun çocuğa uygun olup olmadığını ve açıklamanın netliğini gösterir.</Text>

      <Label>Ebeveynin ret notları</Label>
      <Card style={{ gap: 8 }}>
        {notes.length === 0 ? <Empty text="Bu dönemde notlu ret yok." /> : notes.map((c) => (
          <Text key={c.task_id + c.date} style={styles.body}>
            <Text style={{ fontWeight: '600' }}>{parseDate(c.date).toLocaleDateString('tr-TR')} · {titles.get(c.task_id) ?? ''}: </Text>
            {c.parent_note}
          </Text>
        ))}
      </Card>
    </View>
  );
}

// Görev satırında ebeveynin motivasyon gözlemi (yanıt varsa)
function TaskMotivation({ comps, from, to, taskId }: { comps: Completion[]; from: string; to: string; taskId: string }) {
  const m = motivationStats(comps, from, to, taskId);
  if (!m.answered) return null;
  return <Text style={styles.small}>Motive etmek (ebeveyn): {motivationText(m)}</Text>;
}

// Davranış kayıtları (ABC) sekmesi 10 Kasım 2026'da kaldırıldı (kullanıcı kararı: güncel özellik Davranışlar ve Olaylar,
// src/screens/behaviors). Eski kayıtların sayısı rapor, ilerleme notu ve seans hazırlığında görünmeye devam eder.

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted },
  note: { fontSize: 11, color: colors.muted, marginTop: 6, lineHeight: 16 },
  badge: {
    fontSize: 11, fontWeight: '700', color: colors.ok, backgroundColor: colors.easy.bg,
    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden',
  },
});
