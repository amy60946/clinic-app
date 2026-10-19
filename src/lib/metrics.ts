// Uzman paneli ölçümleri (saf TypeScript, React/Supabase'siz; node --test ile denenir).
// Bunlar ev ortamındaki görev kayıtlarından çıkan GÖZLEM özetleridir; tanı, norm ya da standart test puanı değildir.

export type RepeatKind = 'daily' | 'weekly' | 'monthly';
export type MTask = {
  id: string; title: string; emoji: string; skill: string;
  startDate: string; recurring: boolean; repeatKind: RepeatKind; repeatDays: number[]; endDate?: string;
  reminder?: string; // HH:MM
  childIds: string[];
};
export type MStatus = 'pending' | 'approved' | 'declined' | 'rejected';
export type MCompletion = {
  taskId: string; childId: string; date: string; status: MStatus;
  childDoneAt?: string; // çocuğun "Yaptım/Yapamam" dediği an (ISO)
  declineReason?: 'hard' | 'no_time' | 'did_not_want' | 'other' | null;
};
export type MAbc = { occurredAt: string; antecedent: string; behavior: string; consequence: string; intensity: number };
export type MRating = { goalId: string; week: string; rating: number };

/* ---------- Tarih yardımcıları (yerel saat, haftanın ilk günü Pazartesi) ---------- */

export const toISO = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const fromISO = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
export const startOfWeek = (d: Date) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); };

// ParentApp store.tsx taskOccursOn ile aynı kural
export function occursOn(t: MTask, date: string): boolean {
  if (date < t.startDate) return false;
  if (!t.recurring) return date === t.startDate;
  if (t.endDate && date > t.endDate) return false;
  const d = fromISO(date);
  if (t.repeatKind === 'weekly') {
    const dow = ((d.getDay() + 6) % 7) + 1;
    const days = t.repeatDays.length ? t.repeatDays : [((fromISO(t.startDate).getDay() + 6) % 7) + 1];
    return days.includes(dow);
  }
  if (t.repeatKind === 'monthly') {
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const days = t.repeatDays.length ? t.repeatDays : [fromISO(t.startDate).getDate()];
    return days.some((x) => Math.min(x, last) === d.getDate());
  }
  return true;
}

const isDone = (s?: MStatus) => s === 'pending' || s === 'approved';
const pct = (a: number, b: number) => (b ? (a / b) * 100 : null);
const round = (x: number | null) => (x === null ? null : Math.round(x));

/* ---------- Görev ölçümleri ---------- */

export type Occurrence = { task: MTask; date: string; c?: MCompletion };

// Belirli bir çocuk için [from, to] aralığında planlanan her görev günü ve kaydı
export function occurrences(childId: string, tasks: MTask[], comps: MCompletion[], from: string, to: string): Occurrence[] {
  const idx = new Map<string, MCompletion>();
  comps.forEach((c) => { if (c.childId === childId) idx.set(`${c.taskId}|${c.date}`, c); });
  const out: Occurrence[] = [];
  const mine = tasks.filter((t) => t.childIds.includes(childId));
  for (let d = fromISO(from); toISO(d) <= to; d = addDays(d, 1)) {
    const iso = toISO(d);
    mine.forEach((t) => { if (occursOn(t, iso)) out.push({ task: t, date: iso, c: idx.get(`${t.id}|${iso}`) }); });
  }
  return out;
}

export type Summary = {
  scheduled: number;
  done: number;
  completion: number | null;    // % yapılan (onay bekleyen dahil)
  approval: number | null;      // yapılanların % kaçı ebeveynce onaylandı
  onTime: number | null;        // hatırlatmalı görevlerde, hatırlatmadan sonraki 60 dk içinde (ya da önce) yapılan %
  onTimeN: number;              // zamanında hesabına giren kayıt sayısı
  consistentDays: number | null; // görevi olan günlerin % kaçında görevlerin en az %80'i yapıldı
  streak: number;               // bugünden geriye, tüm görevleri yapılan ardışık gün (bugün eksikse dünden başlar)
  trend: number | null;         // son 14 gün − önceki 14 gün tamamlama (yüzde puanı)
  declines: Record<string, number>;
  lastActivity?: string;        // son kayıt günü
};

export function summarize(childId: string, tasks: MTask[], comps: MCompletion[], today: Date, days = 28): Summary {
  const to = toISO(today);
  const from = toISO(addDays(today, -(days - 1)));
  const occ = occurrences(childId, tasks, comps, from, to);
  const done = occ.filter((o) => isDone(o.c?.status));
  const approved = done.filter((o) => o.c!.status === 'approved').length;

  // Zamanında: hatırlatma saati olan görevlerde "Yaptım" anı ≤ hatırlatma + 60 dk (aynı gün)
  let onTimeOk = 0, onTimeN = 0;
  done.forEach((o) => {
    if (!o.task.reminder || !o.c?.childDoneAt) return;
    const t = new Date(o.c.childDoneAt);
    if (toISO(t) !== o.date) { onTimeN++; return; } // ertesi gün işaretlenmiş: geç
    const [h, m] = o.task.reminder.split(':').map(Number);
    onTimeN++;
    if (t.getHours() * 60 + t.getMinutes() <= h * 60 + m + 60) onTimeOk++;
  });

  const byDay = new Map<string, { s: number; d: number }>();
  occ.forEach((o) => {
    const x = byDay.get(o.date) ?? { s: 0, d: 0 };
    x.s++; if (isDone(o.c?.status)) x.d++;
    byDay.set(o.date, x);
  });
  const dayList = [...byDay.values()];
  const consistent = dayList.filter((x) => x.d / x.s >= 0.8).length;

  // Seri
  let streak = 0;
  const all = occurrences(childId, tasks, comps, toISO(addDays(today, -365)), to);
  const dayMap = new Map<string, { s: number; d: number }>();
  all.forEach((o) => { const x = dayMap.get(o.date) ?? { s: 0, d: 0 }; x.s++; if (isDone(o.c?.status)) x.d++; dayMap.set(o.date, x); });
  for (let i = 0; i < 365; i++) {
    const x = dayMap.get(toISO(addDays(today, -i)));
    if (!x) { if (i === 0) continue; if (streak === 0) continue; break; }
    if (x.d === x.s) streak++;
    else if (i === 0) continue;
    else break;
  }

  const rateIn = (a: number, b: number) => {
    const o = occurrences(childId, tasks, comps, toISO(addDays(today, -b)), toISO(addDays(today, -a)));
    return pct(o.filter((x) => isDone(x.c?.status)).length, o.length);
  };
  const recent = rateIn(0, 13), prev = rateIn(14, 27);

  const declines: Record<string, number> = {};
  occ.forEach((o) => { if (o.c?.status === 'declined') { const k = o.c.declineReason ?? 'other'; declines[k] = (declines[k] ?? 0) + 1; } });

  const mineDates = comps.filter((c) => c.childId === childId && c.status !== 'rejected').map((c) => c.date).sort();

  return {
    scheduled: occ.length,
    done: done.length,
    completion: round(pct(done.length, occ.length)),
    approval: round(pct(approved, done.length)),
    onTime: round(pct(onTimeOk, onTimeN)),
    onTimeN,
    consistentDays: round(pct(consistent, dayList.length)),
    streak,
    trend: recent === null || prev === null ? null : Math.round(recent - prev),
    declines,
    lastActivity: mineDates[mineDates.length - 1],
  };
}

export type WeekPoint = { week: string; pct: number | null; scheduled: number };

// Son n hafta (bu hafta dahil) haftalık tamamlama
export function weekly(childId: string, tasks: MTask[], comps: MCompletion[], today: Date, n = 8): WeekPoint[] {
  const base = startOfWeek(today);
  const to = toISO(today);
  return Array.from({ length: n }, (_, i) => {
    const ws = addDays(base, (i - (n - 1)) * 7);
    const we = toISO(addDays(ws, 6)) > to ? to : toISO(addDays(ws, 6));
    const o = occurrences(childId, tasks, comps, toISO(ws), we);
    return { week: toISO(ws), pct: round(pct(o.filter((x) => isDone(x.c?.status)).length, o.length)), scheduled: o.length };
  });
}

export type TaskRow = {
  task: MTask; scheduled: number; pct: number | null; trend: number | null;
  status: 'kalıcı' | 'gelişiyor' | 'zorlanıyor' | 'yeni';
  avgDoneMinute: number | null; // günün dakikası olarak ortalama "Yaptım" saati
};

// Görev bazında son 4 hafta. Kalıcı: son 3 tam haftanın her birinde ≥ %85.
export function perTask(childId: string, tasks: MTask[], comps: MCompletion[], today: Date): TaskRow[] {
  const to = toISO(today);
  const from = toISO(addDays(today, -27));
  const base = startOfWeek(today);
  return tasks.filter((t) => t.childIds.includes(childId)).map((t) => {
    const occ = occurrences(childId, [t], comps, from, to);
    const done = occ.filter((o) => isDone(o.c?.status));
    const half = (a: number, b: number) => {
      const o = occurrences(childId, [t], comps, toISO(addDays(today, -b)), toISO(addDays(today, -a)));
      return pct(o.filter((x) => isDone(x.c?.status)).length, o.length);
    };
    const r = half(0, 13), p = half(14, 27);
    const fullWeeks = [1, 2, 3].map((k) => {
      const ws = addDays(base, -7 * k);
      const o = occurrences(childId, [t], comps, toISO(ws), toISO(addDays(ws, 6)));
      return o.length ? pct(o.filter((x) => isDone(x.c?.status)).length, o.length)! : null;
    });
    const rate = pct(done.length, occ.length);
    const mins = done.map((o) => o.c?.childDoneAt).filter(Boolean).map((s) => { const d = new Date(s!); return d.getHours() * 60 + d.getMinutes(); });
    let status: TaskRow['status'] = 'gelişiyor';
    if (occ.length < 5 || fullWeeks.some((w) => w === null)) status = 'yeni';
    if (fullWeeks.every((w) => w !== null && w >= 85)) status = 'kalıcı';
    else if (rate !== null && rate < 40 && occ.length >= 5) status = 'zorlanıyor';
    return {
      task: t, scheduled: occ.length, pct: round(rate), trend: r === null || p === null ? null : Math.round(r - p), status,
      avgDoneMinute: mins.length ? Math.round(mins.reduce((a, b) => a + b, 0) / mins.length) : null,
    };
  }).sort((a, b) => (b.scheduled - a.scheduled));
}

export function bySkill(childId: string, tasks: MTask[], comps: MCompletion[], today: Date): { skill: string; pct: number | null; scheduled: number }[] {
  const occ = occurrences(childId, tasks, comps, toISO(addDays(today, -27)), toISO(today));
  const m = new Map<string, { s: number; d: number }>();
  occ.forEach((o) => {
    const k = o.task.skill || 'Diğer';
    const x = m.get(k) ?? { s: 0, d: 0 };
    x.s++; if (isDone(o.c?.status)) x.d++;
    m.set(k, x);
  });
  return [...m.entries()].map(([skill, x]) => ({ skill, pct: round(pct(x.d, x.s)), scheduled: x.s })).sort((a, b) => b.scheduled - a.scheduled);
}

/* ---------- ABC özeti ---------- */

export type AbcSummary = {
  total: number;
  perWeek: { week: string; count: number; avgIntensity: number | null }[];
  topAntecedents: { text: string; count: number }[];
  avgIntensityRecent: number | null; // son 4 hafta
  avgIntensityPrev: number | null;   // önceki 4 hafta
};

export function abcSummary(events: MAbc[], today: Date, n = 8): AbcSummary {
  const base = startOfWeek(today);
  const perWeek = Array.from({ length: n }, (_, i) => {
    const ws = toISO(addDays(base, (i - (n - 1)) * 7));
    const we = toISO(addDays(fromISO(ws), 6));
    const list = events.filter((e) => { const d = toISO(new Date(e.occurredAt)); return d >= ws && d <= we; });
    return { week: ws, count: list.length, avgIntensity: list.length ? +(list.reduce((a, e) => a + e.intensity, 0) / list.length).toFixed(1) : null };
  });
  const norm = (s: string) => s.trim().toLocaleLowerCase('tr');
  const counts = new Map<string, { text: string; count: number }>();
  events.forEach((e) => {
    if (!e.antecedent.trim()) return;
    const k = norm(e.antecedent);
    const x = counts.get(k) ?? { text: e.antecedent.trim(), count: 0 };
    x.count++; counts.set(k, x);
  });
  const avg = (a: number, b: number) => {
    const from = toISO(addDays(today, -b)), to = toISO(addDays(today, -a));
    const l = events.filter((e) => { const d = toISO(new Date(e.occurredAt)); return d >= from && d <= to; });
    return l.length ? +(l.reduce((s, e) => s + e.intensity, 0) / l.length).toFixed(1) : null;
  };
  return {
    total: events.length,
    perWeek,
    topAntecedents: [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 3),
    avgIntensityRecent: avg(0, 27),
    avgIntensityPrev: avg(28, 55),
  };
}

/* ---------- Hedefe ulaşma ölçeği (GAS) ---------- */

// Kiresuk–Sherman T puanı: eşit ağırlık, hedefler arası ilişki ρ = 0,3. Hedef puanları −2…+2.
export function gasT(ratings: number[], rho = 0.3): number | null {
  if (!ratings.length) return null;
  const n = ratings.length;
  const sum = ratings.reduce((a, b) => a + b, 0);
  return Math.round(50 + (10 * sum) / Math.sqrt((1 - rho) * n + rho * n * n));
}

// Her hafta için o haftanın puanlarından T puanı (eksik hedef varsa o hafta yalnız puanlananlarla)
export function gasSeries(ratings: MRating[]): { week: string; t: number | null; n: number }[] {
  const weeks = [...new Set(ratings.map((r) => r.week))].sort();
  return weeks.map((w) => {
    const l = ratings.filter((r) => r.week === w).map((r) => r.rating);
    return { week: w, t: gasT(l), n: l.length };
  });
}

export const minuteToHHMM = (m: number | null) =>
  m === null ? '–' : `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

export const DECLINE_LABEL: Record<string, string> = {
  hard: 'Zor geldi', no_time: 'Zamanı yoktu', did_not_want: 'İstemedi', other: 'Diğer',
};
