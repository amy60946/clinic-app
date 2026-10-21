// Ev rutin kartı göstergeleri (araştırma belgesi "oyun omurgası analizi" bölüm 6).
// Hepsi yalnız çocuğun kendi geçmişiyle karşılaştırılır; norm yok, tanı/zekâ/dikkat puanı değildir.
// Saf fonksiyonlar: sunucudan gelen satırlarla çalışır, testleri tests/metrics.test.mjs.

export type Task = {
  id: string;
  title: string;
  emoji: string;
  skill: string;
  start_date: string; // YYYY-MM-DD
  end_date: string | null;
  recurring: boolean;
  repeat_kind: 'daily' | 'weekly' | 'monthly';
  repeat_days: number[];
  reminder: string | null; // "HH:MM"
  requires_review: boolean;
};

export type Completion = {
  task_id: string;
  date: string;
  status: 'pending' | 'approved' | 'declined' | 'rejected';
  child_done_at: string | null;
  reviewed_at: string | null;
  decline_reason: DeclineReason | null;
  parent_note: string | null;
};

export type DeclineReason = 'hard' | 'no_time' | 'did_not_want' | 'other';

export type AbcEvent = {
  id: string;
  occurred_at: string;
  antecedent: string;
  behavior: string;
  consequence: string;
  intensity: number;
  // ParentApp zor an kaydı (ortak 20261019140000_parent_features): ebeveynin seçtiği gün bölümü, çok çocuklu olay, ses
  day_part?: 'morning' | 'noon' | 'evening' | 'night' | null;
  group_id?: string | null;
  audio_path?: string | null;
  duration_ms?: number | null;
};

/* ---------- Tarih yardımcıları (yerel takvim günü, YYYY-MM-DD) ---------- */

const pad = (n: number) => String(n).padStart(2, '0');

export function isoDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: string, n: number): string {
  const d = parseDate(s);
  d.setDate(d.getDate() + n);
  return isoDate(d);
}

// ISO hafta günü: 1 = pazartesi … 7 = pazar
export function isoDow(s: string): number {
  const w = parseDate(s).getDay();
  return w === 0 ? 7 : w;
}

export function mondayOf(s: string): string {
  return addDays(s, 1 - isoDow(s));
}

function lastDayOfMonth(s: string): number {
  const d = parseDate(s);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// Sunucudaki task_occurs_on ile aynı kural (ortak/supabase/migrations/20261015000000_pofi_game.sql)
export function occursOn(t: Task, d: string): boolean {
  if (d < t.start_date) return false;
  if (t.end_date && d > t.end_date) return false;
  if (!t.recurring) return d === t.start_date;
  if (t.repeat_kind === 'daily') return true;
  if (t.repeat_kind === 'weekly') return t.repeat_days.includes(isoDow(d));
  const day = parseDate(d).getDate();
  if (t.repeat_days.includes(day)) return true;
  // Ayda o gün yoksa ayın son günü sayılır (ör. 31 → Şubat'ta 28/29)
  return day === lastDayOfMonth(d) && t.repeat_days.some((x) => x > day);
}

/* ---------- Planlanan görev örnekleri ---------- */

export type Instance = { task: Task; date: string; c: Completion | undefined };

const key = (taskId: string, date: string) => `${taskId}|${date}`;

export function instances(tasks: Task[], comps: Completion[], from: string, to: string): Instance[] {
  const byKey = new Map(comps.map((c) => [key(c.task_id, c.date), c]));
  const out: Instance[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    for (const t of tasks) {
      if (occursOn(t, d)) out.push({ task: t, date: d, c: byKey.get(key(t.id, d)) });
    }
  }
  return out;
}

const done = (i: Instance) => i.c?.status === 'approved';
const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : null);

// Bugün henüz bitmediği için oranlar dünkü güne kadar hesaplanır
export const lastFullDay = (today: string) => addDays(today, -1);

const weekEnd = (start: string, today: string) => {
  const end = addDays(start, 6);
  return end < lastFullDay(today) ? end : lastFullDay(today);
};

// Gösterge dönemi: dünkü günü içeren hafta dahil son `weeks` hafta (pazartesi günü boş hafta gösterilmez)
export const windowStarts = (today: string, weeks: number) => weekStarts(lastFullDay(today), weeks);

/* ---------- Haftalık özet ---------- */

export type Week = {
  start: string; // pazartesi
  planned: number;
  approved: number;
  declined: number;
  rejected: number;
  rate: number | null; // onaylanan / planlanan, %
  fullDays: number; // planlanan her görevi onaylanan gün
  plannedDays: number;
};

// Son `weeks` hafta (bu hafta dahil, dünkü güne kadar). Pencerenin ilk günü: weekStarts(...)[0]
export function weekStarts(today: string, weeks: number): string[] {
  const m = mondayOf(today);
  return Array.from({ length: weeks }, (_, i) => addDays(m, -7 * (weeks - 1 - i)));
}

export function weekly(tasks: Task[], comps: Completion[], today: string, weeks: number): Week[] {
  return windowStarts(today, weeks).map((start) => {
    const inst = instances(tasks, comps, start, weekEnd(start, today));
    const days = new Map<string, Instance[]>();
    inst.forEach((i) => days.set(i.date, [...(days.get(i.date) ?? []), i]));
    const approved = inst.filter(done).length;
    return {
      start,
      planned: inst.length,
      approved,
      declined: inst.filter((i) => i.c?.status === 'declined').length,
      rejected: inst.filter((i) => i.c?.status === 'rejected').length,
      rate: pct(approved, inst.length),
      fullDays: [...days.values()].filter((l) => l.every(done)).length,
      plannedDays: days.size,
    };
  });
}

/* ---------- Görev başına ---------- */

export type TaskStat = {
  task: Task;
  planned: number;
  approved: number;
  rate: number | null;
  weeklyRates: (number | null)[];
  mastered: boolean; // tamamlanmış son 4 hafta, her hafta planlanmış ve ≥ %90
};

export const MASTERY_WEEKS = 4;
export const MASTERY_RATE = 90;

export function perTask(tasks: Task[], comps: Completion[], today: string, weeks: number): TaskStat[] {
  const starts = windowStarts(today, Math.max(weeks, MASTERY_WEEKS + 1));
  return tasks
    .map((task) => {
      const ws = starts.map((s) => {
        const inst = instances([task], comps, s, weekEnd(s, today));
        return { planned: inst.length, approved: inst.filter(done).length, complete: addDays(s, 6) <= lastFullDay(today) };
      });
      const shown = ws.slice(-weeks);
      const planned = shown.reduce((a, w) => a + w.planned, 0);
      const approved = shown.reduce((a, w) => a + w.approved, 0);
      const last = ws.filter((w) => w.complete).slice(-MASTERY_WEEKS);
      return {
        task,
        planned,
        approved,
        rate: pct(approved, planned),
        weeklyRates: shown.map((w) => pct(w.approved, w.planned)),
        // Ustalık yalnız tamamlanmış haftalara bakar (içinde bulunulan hafta sayılmaz)
        mastered: last.length === MASTERY_WEEKS
          && last.every((w) => w.planned > 0 && (pct(w.approved, w.planned) ?? 0) >= MASTERY_RATE),
      };
    })
    .filter((s) => s.planned > 0)
    .sort((a, b) => (a.rate ?? 0) - (b.rate ?? 0));
}

/* ---------- Yürütücü işlev gözlem özeti (gözlem, ölçüm değil) ---------- */

export type Observations = {
  planned: number;
  approved: number;
  rate: number | null;
  // Kendiliğinden başlama: hatırlatma saati olan görevlerde "Yaptım" anı hatırlatmadan önce mi
  withReminder: number;
  beforeReminder: number;
  beforeReminderRate: number | null;
  // Tutarlılık: planlanan her görevi onaylanan gün oranı
  fullDays: number;
  plannedDays: number;
  fullDayRate: number | null;
  // "Yapamam" ve ret
  declined: number;
  declineRate: number | null;
  declineReasons: Record<DeclineReason | 'unknown', number>;
  rejected: number;
  rejectRate: number | null; // ret / (onay + ret)
  // Ebeveyn katılımı: "Yaptım" → ebeveyn kararı arası ortanca saat
  reviewDelayHours: number | null;
};

function minutesOfDay(iso: string): number {
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
}

function median(xs: number[]): number | null {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function observations(tasks: Task[], comps: Completion[], from: string, to: string): Observations {
  const inst = instances(tasks, comps, from, to);
  const approved = inst.filter(done);

  const timed = inst.filter((i) => i.task.reminder && i.c?.child_done_at && i.c.date === i.date
    && isoDate(new Date(i.c.child_done_at)) === i.date && (i.c.status === 'approved' || i.c.status === 'pending'));
  const before = timed.filter((i) => {
    const [h, m] = i.task.reminder!.split(':').map(Number);
    return minutesOfDay(i.c!.child_done_at!) <= h * 60 + m;
  });

  const days = new Map<string, Instance[]>();
  inst.forEach((i) => days.set(i.date, [...(days.get(i.date) ?? []), i]));
  const fullDays = [...days.values()].filter((l) => l.every(done)).length;

  const declined = inst.filter((i) => i.c?.status === 'declined');
  const reasons: Observations['declineReasons'] = { hard: 0, no_time: 0, did_not_want: 0, other: 0, unknown: 0 };
  declined.forEach((i) => { reasons[i.c!.decline_reason ?? 'unknown'] += 1; });
  const rejected = inst.filter((i) => i.c?.status === 'rejected').length;

  const delays = inst
    .filter((i) => i.task.requires_review && i.c?.child_done_at && i.c.reviewed_at
      && (i.c.status === 'approved' || i.c.status === 'rejected'))
    .map((i) => (Date.parse(i.c!.reviewed_at!) - Date.parse(i.c!.child_done_at!)) / 3_600_000)
    .filter((h) => h >= 0);
  const med = median(delays);

  return {
    planned: inst.length,
    approved: approved.length,
    rate: pct(approved.length, inst.length),
    withReminder: timed.length,
    beforeReminder: before.length,
    beforeReminderRate: pct(before.length, timed.length),
    fullDays,
    plannedDays: days.size,
    fullDayRate: pct(fullDays, days.size),
    declined: declined.length,
    declineRate: pct(declined.length, inst.length),
    declineReasons: reasons,
    rejected,
    rejectRate: pct(rejected, approved.length + rejected),
    reviewDelayHours: med === null ? null : Math.round(med * 10) / 10,
  };
}

/* ---------- Beceri alanına göre ---------- */

export type SkillStat = { skill: string; planned: number; approved: number; rate: number | null };

export function bySkill(tasks: Task[], comps: Completion[], from: string, to: string): SkillStat[] {
  const map = new Map<string, { planned: number; approved: number }>();
  instances(tasks, comps, from, to).forEach((i) => {
    const k = i.task.skill.trim() || 'Diğer';
    const v = map.get(k) ?? { planned: 0, approved: 0 };
    v.planned += 1;
    if (done(i)) v.approved += 1;
    map.set(k, v);
  });
  return [...map.entries()]
    .map(([skill, v]) => ({ skill, ...v, rate: pct(v.approved, v.planned) }))
    .sort((a, b) => b.planned - a.planned);
}

/* ---------- Zor an (ABC) özeti ---------- */

export type DayPart = 'sabah' | 'öğle' | 'akşam' | 'gece';

const PART_OF: Record<string, DayPart> = { morning: 'sabah', noon: 'öğle', evening: 'akşam', night: 'gece' };

// Ebeveynin seçtiği gün bölümü; eski kayıtlarda saatten (ortak sözleşme: sabah 05–11, öğle 11–16, akşam 16–21, gece 21–05)
export function dayPart(e: Pick<AbcEvent, 'occurred_at' | 'day_part'>): DayPart {
  if (e.day_part && PART_OF[e.day_part]) return PART_OF[e.day_part];
  const h = new Date(e.occurred_at).getHours();
  if (h >= 5 && h < 11) return 'sabah';
  if (h >= 11 && h < 16) return 'öğle';
  if (h >= 16 && h < 21) return 'akşam';
  return 'gece';
}

export type AbcSummary = {
  total: number;
  perWeek: { start: string; count: number; avgIntensity: number | null }[];
  byDayPart: Record<DayPart, number>;
};

export function abcSummary(events: AbcEvent[], today: string, weeks: number): AbcSummary {
  // Zor anlar gün içinde de kaydedilir; bu hafta (bugün dahil) gösterilir
  const starts = weekStarts(today, weeks);
  const from = starts[0];
  const inWindow = events.filter((e) => {
    const d = isoDate(new Date(e.occurred_at));
    return d >= from && d <= today;
  });
  const byDayPart: Record<DayPart, number> = { sabah: 0, öğle: 0, akşam: 0, gece: 0 };
  inWindow.forEach((e) => { byDayPart[dayPart(e)] += 1; });
  return {
    total: inWindow.length,
    perWeek: starts.map((start) => {
      const end = addDays(start, 6);
      const es = inWindow.filter((e) => {
        const d = isoDate(new Date(e.occurred_at));
        return d >= start && d <= end;
      });
      const avg = es.length ? Math.round((es.reduce((a, e) => a + e.intensity, 0) / es.length) * 10) / 10 : null;
      return { start, count: es.length, avgIntensity: avg };
    }),
    byDayPart,
  };
}

/* ---------- Metinler ---------- */

export const DECLINE_LABELS: Record<DeclineReason | 'unknown', string> = {
  hard: 'Zor geldi',
  no_time: 'Vaktim yok',
  did_not_want: 'İstemedim',
  other: 'Başka',
  unknown: 'Neden belirtilmedi',
};

export const LIMITS_TEXT =
  'Bu göstergeler gözlemdir; tanı, zekâ ya da dikkat puanı değildir. Veri ebeveynin onayına ve cihaz kullanımına bağlıdır. ' +
  'Çocuk yalnız kendi geçmişiyle karşılaştırılır (norm yok). Klinik geçerlik bir pilot çalışmayla gösterilene kadar sonuç çıkarmak için tek başına kullanılmamalıdır.';
