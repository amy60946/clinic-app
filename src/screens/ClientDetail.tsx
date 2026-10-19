import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Alert, useWindowDimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, difficultyMeta, Difficulty } from '../theme';
import { Avatar, Card, Bar, Trend, Button, Field, Segmented, Pill, Label } from '../components/ui';
import Sheet from '../components/Sheet';
import { useData, ageOf } from '../lib/data';
import { useAuth } from '../lib/auth';
import {
  summarize, weekly, perTask, bySkill, abcSummary, gasSeries, minuteToHHMM, DECLINE_LABEL, toISO, startOfWeek, TaskRow,
} from '../lib/metrics';
import {
  detail, Detail, addNote, addGoal, archiveGoal, rateGoal, suggestTask, withdrawSuggestion, familyOf, setLabel, endSharing, Client,
} from '../lib/api';
import { dateTR, shortTR, timeTR, pctText } from '../lib/format';

type Tab = 'summary' | 'goals' | 'abc' | 'notes' | 'suggest';
const TABS: { id: Tab; label: string }[] = [
  { id: 'summary', label: 'Özet' }, { id: 'goals', label: 'Hedefler' }, { id: 'abc', label: 'Zor anlar' },
  { id: 'notes', label: 'Notlar' }, { id: 'suggest', label: 'Öneriler' },
];

export const LIMITS =
  'Bu sayfadaki değerler ailenin ev ortamında tuttuğu görev ve olay kayıtlarından hesaplanır. Tanı, norm karşılaştırması ya da standart test puanı değildir; ' +
  'kayıtların eksik tutulduğu günler sonuçları etkiler. "Yapıldı" çocuğun işaretlediği ve onay bekleyenleri de kapsar.';

export function useClientDetail(c?: Client) {
  const [d, setD] = useState<Detail | null>(null);
  const load = useCallback(async () => {
    if (!c) return;
    try { setD(await detail(c)); } catch (e) { Alert.alert('Yüklenemedi', (e as Error).message); }
  }, [c?.linkId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);
  return { d, reload: load };
}

export default function ClientDetail({ linkId, onReport, onClosed }: { linkId: string; onReport: () => void; onClosed?: () => void }) {
  const { clients, tasks, comps, refresh } = useData();
  const c = clients.find((x) => x.linkId === linkId);
  const { d, reload } = useClientDetail(c);
  const [tab, setTab] = useState<Tab>('summary');
  const [menu, setMenu] = useState(false);
  const { width } = useWindowDimensions();

  if (!c) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={styles.cap}>Paylaşım sona ermiş.</Text></View>;
  const age = ageOf(c.birthday);

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 14, paddingBottom: 48, maxWidth: 980, width: '100%', alignSelf: 'center' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
        <Avatar id={c.avatar} size={56} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.title}>{c.name}</Text>
          <Text style={styles.cap}>{[age !== null ? `${age} yaş` : null, c.label || null, `Rıza: ${dateTR(c.consentAt)}`].filter(Boolean).join(' · ')}</Text>
        </View>
        <Pressable onPress={onReport} style={styles.chip} accessibilityLabel="Rapor">
          <Ionicons name="document-text-outline" size={16} color={colors.navy} />
          {width > 420 && <Text style={styles.chipText}>Rapor</Text>}
        </Pressable>
        <Pressable onPress={() => setMenu(true)} style={styles.chip} accessibilityLabel="Diğer">
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.navy} />
        </Pressable>
      </View>

      <Segmented options={TABS} value={tab} onChange={setTab} />

      {tab === 'summary' && <Summary c={c} tasks={tasks} comps={comps} />}
      {!d && tab !== 'summary' && <ActivityIndicator color={colors.navy} style={{ marginTop: 30 }} />}
      {d && tab === 'goals' && <Goals c={c} d={d} reload={reload} />}
      {d && tab === 'abc' && <AbcTab d={d} />}
      {d && tab === 'notes' && <Notes c={c} d={d} reload={reload} />}
      {d && tab === 'suggest' && <Suggestions c={c} d={d} reload={reload} />}

      <ClientMenu visible={menu} onClose={() => setMenu(false)} c={c}
        onChanged={async (ended) => { setMenu(false); await refresh(); if (ended) onClosed?.(); }} />
    </ScrollView>
  );
}

/* ---------- Özet ---------- */

export function Kpi({ value, label, hint, delta }: { value: string; label: string; hint?: string; delta?: number | null }) {
  return (
    <Card style={{ flexGrow: 1, flexBasis: 150, padding: 14, gap: 2 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={styles.big}>{value}</Text>
        {delta !== undefined && <Trend delta={delta} />}
      </View>
      <Text style={styles.kpiLabel}>{label}</Text>
      {!!hint && <Text style={styles.tiny}>{hint}</Text>}
    </Card>
  );
}

export function Bars({ points, height = 110, suffix = '' }: { points: { label: string; value: number | null; text?: string }[]; height?: number; suffix?: string }) {
  return (
    <View style={{ flexDirection: 'row', height, gap: 6, marginTop: 12 }}>
      {points.map((p, i) => (
        <View key={i} style={{ flex: 1, alignItems: 'center', gap: 4, minWidth: 0 }}>
          <Text style={styles.tiny} numberOfLines={1}>{p.text ?? (p.value === null ? '' : `${p.value}${suffix}`)}</Text>
          <View style={{ flex: 1, width: '100%', justifyContent: 'flex-end', backgroundColor: '#F1F3F8', borderRadius: 6, overflow: 'hidden' }}>
            <View style={{ height: `${p.value ?? 0}%`, backgroundColor: i === points.length - 1 ? colors.navySoft : colors.navy }} />
          </View>
          <Text style={[styles.tiny, { fontSize: 10 }]} numberOfLines={1}>{p.label}</Text>
        </View>
      ))}
    </View>
  );
}

const STATUS_TONE: Record<TaskRow['status'], 'good' | 'warn' | 'bad' | 'neutral'> = { kalıcı: 'good', gelişiyor: 'neutral', zorlanıyor: 'bad', yeni: 'neutral' };
const STATUS_TEXT: Record<TaskRow['status'], string> = { kalıcı: 'Kalıcı', gelişiyor: 'Gelişiyor', zorlanıyor: 'Zorlanıyor', yeni: 'Yeni' };

export function useSummary(c: Client, tasks: ReturnType<typeof useData>['tasks'], comps: ReturnType<typeof useData>['comps']) {
  return useMemo(() => {
    const today = new Date();
    return {
      s: summarize(c.childId, tasks, comps, today, 28),
      w: weekly(c.childId, tasks, comps, today, 8),
      t: perTask(c.childId, tasks, comps, today),
      k: bySkill(c.childId, tasks, comps, today),
    };
  }, [c.childId, tasks, comps]);
}

function Summary({ c, tasks, comps }: { c: Client; tasks: any; comps: any }) {
  const { s, w, t, k } = useSummary(c, tasks, comps);
  const declineTotal = Object.values(s.declines).reduce((a, b) => a + b, 0);
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Kpi value={pctText(s.completion)} label="Tamamlama" hint="Son 28 gün · önceki 14 güne göre" delta={s.trend} />
        <Kpi value={pctText(s.onTime)} label="Zamanında" hint={s.onTimeN ? `Hatırlatmadan sonraki 1 saat içinde · ${s.onTimeN} kayıt` : 'Hatırlatmalı görev yok'} />
        <Kpi value={pctText(s.consistentDays)} label="Düzenli gün" hint="Görevlerin en az %80'i yapılan günler" />
        <Kpi value={`${s.streak} gün`} label="Güncel seri" hint="Tüm görevleri yapılan ardışık günler" />
      </View>

      <Card>
        <Text style={styles.h}>Haftalık tamamlama</Text>
        <Bars points={w.map((p) => ({ label: shortTR(p.week), value: p.scheduled ? p.pct : null }))} suffix="%" />
      </Card>

      <Card style={{ gap: 4 }}>
        <Text style={styles.h}>Görevler · son 4 hafta</Text>
        {t.length === 0 && <Text style={[styles.cap, { marginTop: 8 }]}>Bu çocuğa atanmış görev yok.</Text>}
        {t.map((r) => (
          <View key={r.task.id} style={styles.taskRow}>
            <Text style={{ fontSize: 20 }}>{r.task.emoji}</Text>
            <View style={{ flex: 1, gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Text style={styles.body}>{r.task.title}</Text>
                <Pill text={STATUS_TEXT[r.status]} tone={STATUS_TONE[r.status]} />
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <View style={{ flex: 1 }}><Bar pct={r.pct ?? 0} /></View>
                <Text style={styles.pct}>{pctText(r.pct)}</Text>
                <Trend delta={r.trend} />
              </View>
              <Text style={styles.tiny}>
                {[r.task.skill, r.task.reminder ? `Hatırlatma ${r.task.reminder}` : null, r.avgDoneMinute !== null ? `Ort. yapılma ${minuteToHHMM(r.avgDoneMinute)}` : null, `${r.scheduled} gün planlı`].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </View>
        ))}
      </Card>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Card style={{ flexGrow: 1, flexBasis: 280, gap: 10 }}>
          <Text style={styles.h}>Beceri alanları</Text>
          {k.map((x) => (
            <View key={x.skill} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.body}>{x.skill}</Text><Text style={styles.pct}>{pctText(x.pct)}</Text>
              </View>
              <Bar pct={x.pct ?? 0} />
            </View>
          ))}
          {k.length === 0 && <Text style={styles.cap}>Veri yok.</Text>}
        </Card>
        <Card style={{ flexGrow: 1, flexBasis: 280, gap: 10 }}>
          <Text style={styles.h}>"Yapamam" yanıtları</Text>
          {declineTotal === 0 && <Text style={styles.cap}>Son 28 günde yok.</Text>}
          {Object.entries(s.declines).sort((a, b) => b[1] - a[1]).map(([k2, n]) => (
            <View key={k2} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={styles.body}>{DECLINE_LABEL[k2] ?? k2}</Text><Text style={styles.pct}>{n}</Text>
              </View>
              <Bar pct={(n / declineTotal) * 100} color={colors.gold} />
            </View>
          ))}
          <Text style={styles.tiny}>Onay oranı: {pctText(s.approval)} (yapılanların ebeveynce onaylanan kısmı)</Text>
        </Card>
      </View>

      <Text style={styles.limits}>{LIMITS}</Text>
    </View>
  );
}

/* ---------- Hedefler (GAS) ---------- */

const RATING = [-2, -1, 0, 1, 2] as const;
const RATING_TEXT: Record<number, string> = { [-2]: 'Çok altında', [-1]: 'Altında', 0: 'Beklenen', 1: 'Üstünde', 2: 'Çok üstünde' };

function Goals({ c, d, reload }: { c: Client; d: Detail; reload: () => Promise<void> }) {
  const { me } = useAuth();
  const [add, setAdd] = useState(false);
  const week = toISO(startOfWeek(new Date()));
  const goals = d.goals.filter((g) => !g.archived);
  const series = gasSeries(d.ratings.filter((r) => goals.some((g) => g.id === r.goalId))).slice(-8);

  const rate = async (goalId: string, v: number) => {
    try { await rateGoal(me!, goalId, week, v); await reload(); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); }
  };
  const archive = (id: string) => Alert.alert('Hedef arşivlensin mi?', 'Geçmiş puanlar raporda kalır.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Arşivle', onPress: async () => { await archiveGoal(id); reload(); } },
  ]);

  return (
    <View style={{ gap: 12 }}>
      <Card>
        <Text style={styles.h}>Hedefe ulaşma (GAS) T puanı</Text>
        <Text style={styles.tiny}>50 = beklenen düzey. Haftalık, eşit ağırlıklı (ρ = 0,3).</Text>
        {series.length ? (
          <Bars points={series.map((p) => ({ label: shortTR(p.week), value: p.t === null ? null : Math.max(0, Math.min(100, ((p.t - 20) / 60) * 100)), text: p.t === null ? '' : String(p.t) }))} />
        ) : <Text style={[styles.cap, { marginTop: 10 }]}>Henüz puan yok. Aşağıdan bu haftanın puanını ver.</Text>}
      </Card>

      {goals.map((g) => {
        const mine = d.ratings.filter((r) => r.goalId === g.id).sort((a, b) => a.week.localeCompare(b.week));
        const now = mine.find((r) => r.week === week)?.rating;
        return (
          <Card key={g.id} style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', gap: 10 }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.h}>{g.title}</Text>
                {!!g.description && <Text style={styles.cap}>{g.description}</Text>}
              </View>
              <Pressable onPress={() => archive(g.id)} hitSlop={8} accessibilityLabel="Arşivle">
                <Ionicons name="archive-outline" size={18} color={colors.muted} />
              </Pressable>
            </View>
            <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap' }}>
              {mine.slice(-8).map((r) => (
                <View key={r.week} style={styles.histDot}>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: colors.navy }}>{r.rating > 0 ? `+${r.rating}` : r.rating}</Text>
                  <Text style={styles.tiny}>{shortTR(r.week)}</Text>
                </View>
              ))}
            </View>
            <Text style={styles.cap}>Bu hafta ({shortTR(week)})</Text>
            <View style={{ flexDirection: 'row', gap: 6 }}>
              {RATING.map((v) => (
                <Pressable key={v} onPress={() => rate(g.id, v)} style={[styles.rate, now === v && { backgroundColor: colors.navy }]} accessibilityLabel={RATING_TEXT[v]}>
                  <Text style={{ fontWeight: '800', color: now === v ? '#fff' : colors.navy }}>{v > 0 ? `+${v}` : v}</Text>
                </Pressable>
              ))}
            </View>
            {now !== undefined && <Text style={styles.tiny}>{RATING_TEXT[now]}</Text>}
          </Card>
        );
      })}

      <Button title="Hedef ekle" kind="ghost" icon="add" onPress={() => setAdd(true)} />
      <GoalSheet visible={add} onClose={() => setAdd(false)} onSave={async (t, desc) => { await addGoal(me!, c, t, desc); setAdd(false); reload(); }} />
    </View>
  );
}

function GoalSheet({ visible, onClose, onSave }: { visible: boolean; onClose: () => void; onSave: (t: string, d: string) => Promise<void> }) {
  const [t, setT] = useState('');
  const [m2, setM2] = useState('');
  const [z, setZ] = useState('');
  const [p2, setP2] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!t.trim()) return Alert.alert('Hedefi yaz');
    setBusy(true);
    const desc = [m2 && `-2: ${m2.trim()}`, z && `0: ${z.trim()}`, p2 && `+2: ${p2.trim()}`].filter(Boolean).join(' · ');
    try { await onSave(t, desc); setT(''); setM2(''); setZ(''); setP2(''); }
    catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} title="Yeni hedef" onClose={onClose}>
      <Field label="Hedef" value={t} onChangeText={setT} placeholder="Ör. Sabah rutinini hatırlatmasız başlatır" maxLength={120} />
      <Text style={styles.cap}>Ölçek tanımları (isteğe bağlı): her haftayı puanlarken neye bakacağını yaz.</Text>
      <Field label="−2 · başlangıç düzeyinin altı" value={m2} onChangeText={setM2} placeholder="Ör. hiç başlatmaz" />
      <Field label="0 · beklenen düzey" value={z} onChangeText={setZ} placeholder="Ör. haftada 3 gün" />
      <Field label="+2 · beklenenin çok üstü" value={p2} onChangeText={setP2} placeholder="Ör. her gün" />
      <Button title="Kaydet" onPress={save} busy={busy} />
    </Sheet>
  );
}

/* ---------- Zor anlar (ABC) ---------- */

function AbcTab({ d }: { d: Detail }) {
  const a = useMemo(() => abcSummary(d.abc, new Date()), [d.abc]);
  const max = Math.max(1, ...a.perWeek.map((w) => w.count));
  return (
    <View style={{ gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Kpi value={String(a.perWeek.slice(-4).reduce((s, w) => s + w.count, 0))} label="Son 4 haftada kayıt" hint={`Önceki 4 hafta: ${a.perWeek.slice(0, 4).reduce((s, w) => s + w.count, 0)}`} />
        <Kpi value={a.avgIntensityRecent === null ? '–' : String(a.avgIntensityRecent).replace('.', ',')} label="Ortalama şiddet (1–5)"
          hint={a.avgIntensityPrev === null ? 'Önceki 4 hafta: kayıt yok' : `Önceki 4 hafta: ${String(a.avgIntensityPrev).replace('.', ',')}`} />
      </View>
      <Card>
        <Text style={styles.h}>Haftalık kayıt sayısı</Text>
        <Bars points={a.perWeek.map((w) => ({ label: shortTR(w.week), value: (w.count / max) * 100, text: String(w.count) }))} height={90} />
      </Card>
      {a.topAntecedents.length > 0 && (
        <Card style={{ gap: 8 }}>
          <Text style={styles.h}>En sık öncül</Text>
          {a.topAntecedents.map((x) => (
            <View key={x.text} style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={styles.body}>{x.text}</Text><Text style={styles.pct}>{x.count}</Text>
            </View>
          ))}
        </Card>
      )}
      <Label>Kayıtlar</Label>
      {d.abc.length === 0 && <Text style={styles.cap}>Aile henüz zor an kaydetmedi. ParentApp'te Aile {'>'} Hesap {'>'} Uzmanım {'>'} Zor bir anı kaydet.</Text>}
      {d.abc.map((e) => (
        <Card key={e.id} style={{ gap: 6 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={styles.cap}>{dateTR(e.occurredAt)} · {timeTR(e.occurredAt)}</Text>
            <Pill text={`Şiddet ${e.intensity}`} tone={e.intensity >= 4 ? 'bad' : e.intensity === 3 ? 'warn' : 'neutral'} />
          </View>
          <AbcLine k="Öncesi" v={e.antecedent} />
          <AbcLine k="Davranış" v={e.behavior} />
          <AbcLine k="Sonrası" v={e.consequence} />
        </Card>
      ))}
    </View>
  );
}

const AbcLine = ({ k, v }: { k: string; v: string }) => (
  <View style={{ flexDirection: 'row', gap: 8 }}>
    <Text style={[styles.cap, { width: 64 }]}>{k}</Text>
    <Text style={[styles.body, { flex: 1 }]}>{v || '—'}</Text>
  </View>
);

/* ---------- Notlar ---------- */

function Notes({ c, d, reload }: { c: Client; d: Detail; reload: () => Promise<void> }) {
  const { me } = useAuth();
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!text.trim()) return;
    setBusy(true);
    try { await addNote(me!, c, text); setText(''); await reload(); }
    catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <View style={{ gap: 12 }}>
      <Card style={{ gap: 10 }}>
        <Field value={text} onChangeText={setText} placeholder="Seans notu, gözlem, plan…" multiline maxLength={4000} style={{ minHeight: 90, textAlignVertical: 'top' }} />
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Ionicons name="lock-closed-outline" size={12} color={colors.muted} />
            <Text style={styles.tiny}>Yalnız kliniğin görür; aileye gösterilmez</Text>
          </View>
          <Button title="Ekle" onPress={save} busy={busy} style={{ height: 40 }} />
        </View>
      </Card>
      {d.notes.map((n) => (
        <Card key={n.id} style={{ gap: 6 }}>
          <Text style={styles.cap}>{dateTR(n.createdAt)} · {timeTR(n.createdAt)}</Text>
          <Text style={styles.body}>{n.body}</Text>
        </Card>
      ))}
    </View>
  );
}

/* ---------- Görev önerileri ---------- */

const EMOJIS = ['⭐', '👕', '🛏️', '🪥', '📖', '🎒', '🧸', '🍽️', '🧘', '⏰'];
const SKILLS = ['Öz Bakım', 'Sorumluluk', 'Odaklanma', 'Planlama', 'Duygu Düzenleme', 'Sosyal Beceri'];
const STATUS: Record<string, { t: string; tone: 'good' | 'warn' | 'neutral' }> = {
  pending: { t: 'Ailede bekliyor', tone: 'warn' }, accepted: { t: 'Görevlere eklendi', tone: 'good' }, declined: { t: 'Şimdilik değil', tone: 'neutral' },
};

function Suggestions({ c, d, reload }: { c: Client; d: Detail; reload: () => Promise<void> }) {
  const { me } = useAuth();
  const [open, setOpen] = useState(false);
  const withdraw = (id: string) => Alert.alert('Öneri geri çekilsin mi?', '', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Geri çek', style: 'destructive', onPress: async () => { await withdrawSuggestion(id); reload(); } },
  ]);
  return (
    <View style={{ gap: 12 }}>
      <Text style={styles.body}>Aileye görev önerirsin; ebeveyn ParentApp'te kabul ederse görev oluşur ve çocuk oyunda görür. Eklemek ebeveynin kararıdır.</Text>
      <Button title="Görev öner" icon="add" onPress={() => setOpen(true)} />
      {d.suggestions.map((s) => (
        <Card key={s.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <Text style={{ fontSize: 24 }}>{s.emoji}</Text>
          <View style={{ flex: 1, gap: 4 }}>
            <Text style={styles.h}>{s.title}</Text>
            <Text style={styles.tiny}>{[s.skill, difficultyMeta[s.difficulty].label, s.recurring ? 'Her gün' : 'Bir kez', dateTR(s.createdAt)].filter(Boolean).join(' · ')}</Text>
            <Pill text={STATUS[s.status].t} tone={STATUS[s.status].tone} />
          </View>
          {s.status === 'pending' && (
            <Pressable onPress={() => withdraw(s.id)} hitSlop={8}><Text style={{ color: colors.danger, fontSize: 13 }}>Geri çek</Text></Pressable>
          )}
        </Card>
      ))}
      <SuggestSheet visible={open} onClose={() => setOpen(false)}
        onSave={async (p) => { await suggestTask(me!, c, await familyOf(c.linkId), p); setOpen(false); reload(); }} />
    </View>
  );
}

function SuggestSheet({ visible, onClose, onSave }: {
  visible: boolean; onClose: () => void;
  onSave: (p: { title: string; emoji: string; skill: string; difficulty: Difficulty; recurring: boolean; note: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('⭐');
  const [skill, setSkill] = useState(SKILLS[0]);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  const [rep, setRep] = useState<'daily' | 'once'>('daily');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!title.trim()) return Alert.alert('Görevi yaz');
    setBusy(true);
    try { await onSave({ title, emoji, skill, difficulty, recurring: rep === 'daily', note }); setTitle(''); setNote(''); }
    catch (e) { Alert.alert('Gönderilemedi', (e as Error).message); }
    finally { setBusy(false); }
  };
  return (
    <Sheet visible={visible} title="Görev öner" onClose={onClose}>
      <Field label="Görev" value={title} onChangeText={setTitle} placeholder="Ör. Kıyafetini akşamdan hazırla" maxLength={120} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {EMOJIS.map((e) => (
          <Pressable key={e} onPress={() => setEmoji(e)} style={[styles.emoji, emoji === e && { borderColor: colors.navy }]}><Text style={{ fontSize: 20 }}>{e}</Text></Pressable>
        ))}
      </View>
      <Text style={styles.cap}>Beceri alanı</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {SKILLS.map((s) => (
          <Pressable key={s} onPress={() => setSkill(s)} style={[styles.skill, skill === s && { backgroundColor: colors.navy }]}>
            <Text style={{ fontSize: 13, color: skill === s ? '#fff' : colors.navy }}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <Segmented<Difficulty> options={[{ id: 'easy', label: 'Kolay' }, { id: 'medium', label: 'Orta' }, { id: 'hard', label: 'Zor' }]} value={difficulty} onChange={setDifficulty} />
      <Segmented options={[{ id: 'daily', label: 'Her gün' }, { id: 'once', label: 'Bir kez' }]} value={rep} onChange={setRep} />
      <Field label="Aileye not (isteğe bağlı)" value={note} onChangeText={setNote} placeholder="Neden önerdiğini kısaca yaz" maxLength={300} multiline />
      <Button title="Aileye gönder" onPress={save} busy={busy} />
    </Sheet>
  );
}

/* ---------- Diğer: etiket, paylaşımı sonlandır ---------- */

function ClientMenu({ visible, onClose, c, onChanged }: { visible: boolean; onClose: () => void; c: Client; onChanged: (ended: boolean) => void }) {
  const [label, setL] = useState(c.label);
  const [busy, setBusy] = useState(false);
  useEffect(() => setL(c.label), [c.label, visible]);
  const save = async () => {
    setBusy(true);
    try { await setLabel(c.linkId, label); onChanged(false); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); } finally { setBusy(false); }
  };
  const end = () => Alert.alert('Paylaşım sonlandırılsın mı?', `${c.name} için yeni veri görmezsin. Notların ve hedef puanların kliniğinde kalır. Tekrar bağlanmak için aileye yeni kod gerekir.`, [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sonlandır', style: 'destructive', onPress: async () => { try { await endSharing(c.linkId); onChanged(true); } catch (e) { Alert.alert('Olmadı', (e as Error).message); } } },
  ]);
  return (
    <Sheet visible={visible} title={c.name} onClose={onClose}>
      <Field label="Etiket (yalnız klinikte görünür)" value={label} onChangeText={setL} maxLength={60} placeholder="Ör. Salı 15:00 · dikkat" />
      <Button title="Kaydet" onPress={save} busy={busy} />
      <Button title="Paylaşımı sonlandır" kind="danger" onPress={end} />
    </Sheet>
  );
}

export const styles = StyleSheet.create({
  title: { fontSize: 22, fontWeight: '800', color: colors.navy },
  h: { fontSize: 14, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.navy, lineHeight: 20 },
  cap: { fontSize: 12, color: colors.muted },
  tiny: { fontSize: 11, color: colors.muted },
  big: { fontSize: 22, fontWeight: '800', color: colors.navy },
  kpiLabel: { fontSize: 12, fontWeight: '600', color: colors.navy },
  pct: { fontSize: 13, fontWeight: '700', color: colors.navy, minWidth: 36, textAlign: 'right' },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 12, height: 36 },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.navy },
  taskRow: { flexDirection: 'row', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  histDot: { alignItems: 'center', paddingHorizontal: 6, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F3F4F8', minWidth: 44 },
  rate: { flex: 1, height: 42, borderRadius: radius.sm, backgroundColor: '#F3F4F8', alignItems: 'center', justifyContent: 'center' },
  emoji: { width: 42, height: 42, borderRadius: 21, borderWidth: 2, borderColor: 'transparent', backgroundColor: '#F3F4F8', alignItems: 'center', justifyContent: 'center' },
  skill: { borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7, backgroundColor: '#F3F4F8' },
  limits: { fontSize: 11, color: colors.muted, lineHeight: 16 },
});
