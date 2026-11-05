// Takip planı — saf yardımcılar (veritabanı/JSON içe aktarmaz; testleri tests/plan.test.mjs). Ortak akislar.md 12.1.
import type { Suggestion, RoutineRef } from './clinic.ts';
import type { Task } from './metrics.ts';
import type { PlanGoal, PlanModule } from './plan.ts';

/* ---------- Aileye gönderilmemiş değişiklikler ---------- */
// Aile planı sunucudaki gönderilmiş sürümden (pub, care_plan_snapshot) okur. Uzmanın gördüğü hâl ile pub karşılaştırılır.
export type Pub = Record<string, unknown> | null;
const str = (v: unknown) => (v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v));
const differs = (want: Record<string, unknown> | null, pub: Pub) => {
  if (!want || !pub) return !want !== !pub;
  return Object.keys(want).some((k) => str(want[k]) !== str(pub[k]));
};
// Ailenin gördüğü hâl (care_plan_snapshot ile aynı alanlar); aileye gitmeyen hedef/program için null
export const goalSnapshot = (g: PlanGoal): Record<string, unknown> | null => (g.shared && !g.archived ? {
  title: g.title, description: g.description, domain: g.domain, measure: g.measure, baseline: g.baseline, target: g.target,
  weeks: g.weeks, home_support: g.home_support, status: g.status, position: g.position,
} : null);
export const moduleSnapshot = (m: PlanModule): Record<string, unknown> | null => (m.status !== 'planned' ? {
  title: m.title, aim: m.aim, practice: m.practice, checklist: m.checklist, status: m.status, position: m.position,
} : null);
export function goalUnsent(g: PlanGoal, pub: Pub): boolean {
  return differs(goalSnapshot(g), pub);
}
// sharedGoals: programın bağlı olduğu, aileye açık ve arşivlenmemiş hedefler (sıra önemsiz); null: bağ bilinmiyor
export function moduleUnsent(m: PlanModule, pub: Pub, sharedGoals: string[] | null): boolean {
  const want = moduleSnapshot(m);
  if (differs(want, pub)) return true;
  if (!want || !pub || sharedGoals === null) return false;
  const was = Array.isArray(pub.goal_ids) ? (pub.goal_ids as string[]) : [];
  return was.length !== sharedGoals.length || sharedGoals.some((x) => !was.includes(x));
}


/* ---------- Rutin grupları (öneri satırlarından) ---------- */
type RState = 'draft' | 'pending' | 'added' | 'declined';
export type RGroup = {
  key: string; title: string; icon: string; emoji: string; single: boolean; routine: RoutineRef | null; goalId: string | null;
  items: Suggestion[]; state: RState; added: number; waiting: number; drafts: number;
  tasks: Task[];               // ailede ekli ve sürmekte olan görevler
  ended: boolean;              // ailedeki görevlerin hepsi bitti (görevler biliniyor ve bitiş günleri geçti)
  changes: Suggestion[];       // bu görevlere açık (taslak / bekleyen) değişiklik önerileri
  decidedAt: string | null;
};

export function groupSuggestions(list: Suggestion[], tasks: Task[], today: string): RGroup[] {
  const map = new Map<string, Suggestion[]>();
  list.filter((s) => s.kind !== 'change').forEach((s) => {
    const k = s.routine?.group ?? s.id;
    const l = map.get(k);
    if (l) l.push(s); else map.set(k, [s]);
  });
  const opens = list.filter((s) => s.kind === 'change' && (s.status === 'draft' || s.status === 'pending'));
  return [...map.entries()].map(([key, items]) => {
    items.sort((a, b) => (a.routine?.position ?? 0) - (b.routine?.position ?? 0));
    const first = items[0];
    const added = items.filter((s) => s.status === 'accepted').length;
    const waiting = items.filter((s) => s.status === 'pending').length;
    const drafts = items.filter((s) => s.status === 'draft').length;
    const state: RState = added ? 'added' : drafts ? 'draft' : waiting ? 'pending' : 'declined';
    const ids = items.map((s) => s.task_id).filter((x): x is string => !!x);
    const known = tasks.filter((t) => ids.includes(t.id));
    const ts = known.filter((t) => !t.end_date || t.end_date >= today);
    // Görev listesi henüz gelmediyse (aile az önce kabul etti) ya da öneriye görev kimliği yazılmadıysa bitmiş sayılmaz
    const ended = ids.length > 0 && known.length === new Set(ids).size && ts.length === 0;
    return {
      key, title: first.routine?.title || first.title, icon: first.routine?.icon ?? '', emoji: first.emoji, single: !first.routine,
      routine: first.routine ?? null, goalId: items.find((s) => s.goal_id)?.goal_id ?? null, items, state, added, waiting, drafts,
      tasks: ts, ended, changes: opens.filter((c) => !!c.target_task_id && ts.some((t) => t.id === c.target_task_id)),
      decidedAt: items.map((s) => s.decided_at).filter((x): x is string => !!x).sort().pop() ?? null,
    };
  });
}
// Planda görünenler: reddedilen (14 günden eski) ve ailede bittiği bilinen rutinler gizlenir
export const visibleGroup = (r: RGroup, today: string) => {
  if (r.state === 'declined') return !!r.decidedAt && r.decidedAt.slice(0, 10) >= shiftDay(today, -14);
  if (r.state === 'added') return !r.ended || r.waiting > 0 || r.drafts > 0;
  return true;
};
export function shiftDay(d: string, n: number) {
  const t = new Date(`${d}T12:00:00Z`);
  t.setUTCDate(t.getUTCDate() + n);
  return t.toISOString().slice(0, 10);
}


/* ---------- Hedef zamanı: kaçıncı hafta, değerlendirme zamanı (kullanıcı kararı 2 Kasım 2026, "A1") ---------- */
const dayMs = 86400000;
export const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T12:00:00Z`) - Date.parse(`${a}T12:00:00Z`)) / dayMs);
// Hedef eklendiği haftadan itibaren kaçıncı haftada (1'den başlar)
export const goalWeek = (createdAt: string, today: string) => Math.max(1, Math.floor(daysBetween(createdAt.slice(0, 10), today) / 7) + 1);
export const lastRating = (g: Pick<PlanGoal, 'ratings'>) => [...g.ratings].sort((a, b) => a.week.localeCompare(b.week)).pop() ?? null;
// GAS her hafta girilmez; gözden geçirme zamanı gelince sorulur: son değerlendirmeden (yoksa eklenişten) 4 hafta geçti
// ya da süre doldu ve son haftasında değerlendirilmedi. Yalnız süren hedefler.
export function reviewDue(g: Pick<PlanGoal, 'status' | 'archived' | 'created_at' | 'weeks' | 'ratings'>, today: string): boolean {
  if (g.status !== 'active' || g.archived) return false;
  const last = lastRating(g);
  const start = g.created_at.slice(0, 10);
  if (daysBetween(last ? last.week : start, today) >= 28) return true;
  if (g.weeks) {
    const end = shiftDay(start, g.weeks * 7);
    if (today >= end && (!last || last.week < shiftDay(end, -7))) return true;
  }
  return false;
}

/* ---------- "Aileye gönder" özeti (kullanıcı kararı 2 Kasım 2026, "G1"; ortak care_plan_publish_selected) ---------- */
// Her satır bir işaret kutusu: işareti kaldırılırsa `hold` kimlikleri bu gönderimde bekler. GAS ve hiç gönderilmemiş gizli hedef listede yok.
export type PubItem = {
  key: string; hold: string[]; kind: 'goal' | 'module' | 'routine' | 'task' | 'change';
  title: string; detail: string; goalId: string | null;
};
export function publishItems(p: {
  goals: PlanGoal[]; modules: PlanModule[]; groups: RGroup[]; changes: Suggestion[];
  pub: { goals: Record<string, Pub>; modules: Record<string, Pub> }; links: Record<string, string[]> | null;
}): PubItem[] {
  const out: PubItem[] = [];
  const live = p.goals.filter((g) => !g.archived);
  for (const g of p.goals) {
    const was = p.pub.goals[g.id] ?? null;
    if (!goalUnsent(g, was)) continue;
    const gone = !g.shared || g.archived;
    out.push({ key: `g:${g.id}`, hold: [g.id], kind: 'goal', title: g.title, goalId: g.id,
      detail: gone ? (g.archived ? 'arşivlendi · aileden kalkar' : 'aileden gizlendi · aileden kalkar') : was ? 'değişti' : 'yeni davranış hedefi' });
  }
  for (const m of p.modules) {
    const was = p.pub.modules[m.id] ?? null;
    const linked = p.links ? (p.links[m.id] ?? []).filter((id) => live.some((g) => g.id === id)) : [];
    const shared = p.links ? linked.filter((id) => live.some((g) => g.id === id && g.shared)) : null;
    if (!moduleUnsent(m, was, shared)) continue;
    out.push({ key: `m:${m.id}`, hold: [m.id], kind: 'module', title: m.title, goalId: linked[0] ?? null,
      detail: m.status === 'planned' ? 'planlandı · aileden kalkar' : was ? 'değişti' : 'yeni program' });
  }
  for (const r of p.groups) {
    const ids = r.items.filter((s) => s.status === 'draft').map((s) => s.id);
    if (!ids.length) continue;
    out.push({ key: `r:${r.key}`, hold: ids, kind: r.single ? 'task' : 'routine', title: r.title, goalId: r.goalId,
      detail: r.single ? 'yeni macera' : r.state === 'added' ? `${ids.length} macera rutine eklenecek` : `${ids.length} macera · yeni rutin` });
  }
  const ch = new Map<string, Suggestion[]>();
  p.changes.filter((s) => s.kind === 'change' && s.status === 'draft').forEach((s) => {
    const k = s.routine?.group ?? s.target_task_id ?? s.id;
    ch.set(k, [...(ch.get(k) ?? []), s]);
  });
  ch.forEach((list, k) => {
    const removes = list.filter((s) => s.change_remove).length;
    out.push({ key: `c:${k}`, hold: list.map((s) => s.id), kind: 'change', title: list[0].routine?.title || list[0].title,
      goalId: list.find((s) => s.goal_id)?.goal_id ?? null,
      detail: [`${list.length} değişiklik önerisi`, removes ? `${removes} macera çıkar` : ''].filter(Boolean).join(' · ') });
  });
  return out;
}
