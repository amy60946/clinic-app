// Günlük rutin v2 — saf yardımcılar (JSON/katalog içe aktarmaz; testleri tests/routines.test.mjs). Katalog ve uzman
// rutini dönüşümü routines.ts'te. Ortak akislar.md 5.4 "Günlük rutin v2" (kullanıcı kararı 28 Ekim 2026).
import type { SuggestionInput, RepeatKind, RoutineRef } from './clinic.ts';
import type { Category } from '../skills.ts';
import type { Difficulty } from '../theme.ts';
import type { AgeGroup } from '../templates.ts';

export type RoutineRepeat = 'weekdays' | 'daily' | 'weekly';
export type RoutineTask = {
  id: string; title: string; emoji: string; skill: string; category: Category | null; template_key: string | null;
  difficulty: Difficulty; coins: number; time: string; days?: number[];
};
export type Routine = {
  id: string; key: string; source: 'catalog' | 'own'; title: string; subtitle: string; icon: string; tint: string;
  repeat: RoutineRepeat; ages: AgeGroup[]; tasks: RoutineTask[]; theme?: string;
};

export const WEEKDAYS = [1, 2, 3, 4, 5];
export const AGE_LABEL: Record<AgeGroup, string> = { K: '5 ve altı', A: '6–8', B: '9–12', C: '13+' };
export const agesText = (ages: AgeGroup[]) => {
  if (!ages.length || ages.length === 4) return 'Her yaş';
  const order: AgeGroup[] = ['K', 'A', 'B', 'C'];
  const s = [...ages].sort((a, b) => order.indexOf(a) - order.indexOf(b));
  if (s.length === 1) return `${AGE_LABEL[s[0]]} yaş`;
  const lo = AGE_LABEL[s[0]].split(/[–\s]/)[0];
  const last = s[s.length - 1];
  return last === 'C' ? `${lo}+ yaş` : `${lo}–${AGE_LABEL[last].split('–').pop()} yaş`;
};

// Çocuğun yaş grubu: ebeveynin seçtiği (age_band) yoksa doğum gününden (durumlar.md §4: K ≤5 · A 6–8 · B 9–12 · C 13+)
export function childBand(child: { age_band?: string | null; birthday?: string | null } | null | undefined, today = new Date()): AgeGroup | null {
  if (child?.age_band && ['K', 'A', 'B', 'C'].includes(child.age_band)) return child.age_band as AgeGroup;
  if (!child?.birthday) return null;
  const [y, m, d] = child.birthday.slice(0, 10).split('-').map(Number);
  let age = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) age -= 1;
  return age <= 5 ? 'K' : age <= 8 ? 'A' : age <= 12 ? 'B' : 'C';
}

// Çocuğa uyan rutinler: yaş biliniyorsa yalnız o grubun sürümleri; bilinmiyorsa hepsi (yaş etiketiyle)
export const fitsAge = (r: Pick<Routine, 'ages'>, band: AgeGroup | null) => !band || !r.ages.length || r.ages.includes(band);

export const REPEAT_TEXT: Record<RoutineRepeat, string> = {
  weekdays: 'Hafta içi her gün', daily: 'Her gün', weekly: 'Her görev haftanın kendi gününde',
};

/* ---------- Düzenlenebilir taslak (saat, gün, seçim) ---------- */

// Tekrar: hafta içi · her gün · seçili günler (hepsi aynı günler) · görevin kendi günleri (katalogdaki haftalık rutinler)
export type DraftRepeat = 'weekdays' | 'daily' | 'days' | 'own';
export type DraftTask = RoutineTask & { on: boolean };
export type RoutineDraft = { repeat: DraftRepeat; days: number[]; tasks: DraftTask[] };

export function draftOf(r: Routine, taken: string[]): RoutineDraft {
  return {
    repeat: r.repeat === 'weekly' ? 'own' : r.repeat,
    days: WEEKDAYS,
    tasks: r.tasks.map((t) => ({ ...t, on: !isTaken(t.title, taken) })),
  };
}

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
export const validTime = (s: string) => TIME.test(s);
// "7:5" / "0705" gibi yazımları HH:MM'ye çevirir; olmazsa null
export function normalizeTime(s: string): string | null {
  const t = s.trim().replace('.', ':');
  const m = /^(\d{1,2}):?(\d{2})$/.exec(t);
  if (!m) return null;
  const v = `${m[1].padStart(2, '0')}:${m[2]}`;
  return validTime(v) ? v : null;
}
// Saati dakika kadar kaydırır (gün içinde kalır: 00:00–23:59)
export function shiftTime(hm: string, minutes: number): string {
  const [h, m] = hm.split(':').map(Number);
  const t = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + minutes));
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
}

function schedule(d: RoutineDraft, t: RoutineTask): { recurring: boolean; repeat_kind: RepeatKind; repeat_days: number[] } {
  if (d.repeat === 'daily') return { recurring: true, repeat_kind: 'daily', repeat_days: [] };
  if (d.repeat === 'weekdays') return { recurring: true, repeat_kind: 'weekly', repeat_days: WEEKDAYS };
  if (d.repeat === 'days') return { recurring: true, repeat_kind: 'weekly', repeat_days: [...d.days].sort() };
  return { recurring: true, repeat_kind: 'weekly', repeat_days: t.days?.length ? t.days : WEEKDAYS };
}

// Seçili görevlerden öneri satırları: aynı paket kimliği, sıra, rutin adı; isteğe bağlı hedef. Not alanında rutin adı
// (paket alanlarını okumayan eski ParentApp sürümü de hangi rutinden geldiğini görür).
export function routineSuggestions(r: Routine, d: RoutineDraft, startDate: string, note: string,
  opts: { group: string; goalId?: string | null }): SuggestionInput[] {
  const n = [`${r.title} rutini`, note.trim()].filter(Boolean).join(' · ');
  const picked = d.tasks.filter((t) => t.on);
  return picked.map((t, i) => {
    const routine: RoutineRef = { group: opts.group, title: r.title, icon: r.icon, position: i, key: r.source === 'own' ? `own:${r.id}` : r.key };
    return {
      title: t.title, emoji: t.emoji, skill: t.skill, description: '', category: t.category, template_key: t.template_key,
      difficulty: t.difficulty, coins: t.coins, start_date: startDate, ...schedule(d, t), end_date: null,
      reminder: t.time || null, requires_review: true, note: n, routine, goal_id: opts.goalId ?? null,
    };
  });
}

const norm = (s: string) => s.trim().toLocaleLowerCase('tr-TR');
// Çocukta aynı adlı görev ya da bekleyen öneri varsa baştan seçili gelmez
export const isTaken = (title: string, taken: string[]) => taken.some((x) => norm(x) === norm(title));

// Paket kimliği (öneri satırlarını gruplar)
export function newGroupId(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const h = () => Math.floor(Math.random() * 0x10000).toString(16).padStart(4, '0');
  return `${h()}${h()}-${h()}-4${h().slice(1)}-${(8 + Math.floor(Math.random() * 4)).toString(16)}${h().slice(1)}-${h()}${h()}${h()}`;
}

export type OwnItem = {
  key?: string; title: string; emoji: string; skill?: string; category?: string; difficulty: Difficulty; coins?: number; time?: string; days?: number[];
};
export type OwnRoutine = {
  id: string; title: string; icon: string; repeat: RoutineRepeat; ages: AgeGroup[]; items: OwnItem[];
  shared: boolean; archived: boolean; created_by: string | null; updated_at: string;
};
