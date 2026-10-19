import { supabase } from './supabase';
import { MTask, MCompletion, MAbc, MRating } from './metrics';
import { toISO, addDays } from './metrics';

// Uzmanın okuyabildikleri sunucuda satır düzeyi güvenlikle sınırlıdır (ParentApp deposu,
// supabase/proposed/20261019000000_clinic.sql): yalnız ebeveynin rıza verdiği çocuklar.

export type Me = {
  id: string; name: string; title: string; role: 'owner' | 'member';
  clinicId: string; clinic: string; plan: string; seatLimit: number; trialEndsAt: string; active: boolean;
};
export type Client = {
  linkId: string; childId: string; label: string; clinicianId: string | null; consentAt: string;
  name: string; avatar: string; birthday?: string; ageBand?: string;
};
export type Note = { id: string; body: string; createdAt: string; authorId: string | null };
export type Goal = { id: string; title: string; description: string; archived: boolean; createdAt: string };
export type Suggestion = {
  id: string; title: string; emoji: string; skill: string; difficulty: 'easy' | 'medium' | 'hard';
  recurring: boolean; note: string; status: 'pending' | 'accepted' | 'declined'; createdAt: string; decidedAt?: string;
};
export type Abc = MAbc & { id: string };
export type Member = { id: string; name: string; title: string; role: 'owner' | 'member' };
export type Invite = { code: string; kind: 'family' | 'clinician'; label: string; expiresAt: string; usedAt?: string; createdAt: string };
export type Overview = { clients: Client[]; tasks: MTask[]; comps: MCompletion[] };
export type Detail = { abc: Abc[]; notes: Note[]; goals: Goal[]; ratings: MRating[]; suggestions: Suggestion[] };

type Row = Record<string, any>;
const ok = <T,>(r: { data: T; error: { message: string } | null }): T => { if (r.error) throw new Error(r.error.message); return r.data; };

export async function me(): Promise<Me | null> {
  const r = ok(await supabase.rpc('clinician_me')) as Row | null;
  if (!r) return null;
  return {
    id: r.id, name: r.name, title: r.title, role: r.role, clinicId: r.clinic_id, clinic: r.clinic, plan: r.plan,
    seatLimit: r.seat_limit, trialEndsAt: r.trial_ends_at, active: !!r.active,
  };
}

const toTask = (r: Row, childIds: string[]): MTask => ({
  id: r.id, title: r.title, emoji: r.emoji ?? '⭐', skill: r.skill ?? '', startDate: r.start_date, recurring: r.recurring,
  repeatKind: r.repeat_kind ?? 'daily', repeatDays: r.repeat_days ?? [], endDate: r.end_date ?? undefined,
  reminder: r.reminder ? String(r.reminder).slice(0, 5) : undefined, childIds,
});

// Danışan listesi ve özetler için: etkin bağlantılar + son 60 günün görev kayıtları
export async function overview(clinicId: string): Promise<Overview> {
  const links = ok(await supabase.from('clinic_links').select('*').eq('clinic_id', clinicId).eq('status', 'active').order('consent_at')) as Row[];
  const childIds = links.map((l) => l.child_id);
  if (!childIds.length) return { clients: [], tasks: [], comps: [] };
  const [kids, assigns, comps] = await Promise.all([
    supabase.from('children').select('*').in('id', childIds),
    supabase.from('task_assignments').select('task_id, child_id').in('child_id', childIds),
    supabase.from('completions').select('task_id, child_id, date, status, child_done_at, decline_reason')
      .in('child_id', childIds).gte('date', toISO(addDays(new Date(), -70))),
  ]);
  const a = ok(assigns) as Row[];
  const taskIds = [...new Set(a.map((x) => x.task_id))];
  const tasks = taskIds.length ? (ok(await supabase.from('tasks').select('*').in('id', taskIds)) as Row[]) : [];
  const kidRows = ok(kids) as Row[];
  return {
    clients: links.map((l) => {
      const c = kidRows.find((k) => k.id === l.child_id) ?? {};
      return {
        linkId: l.id, childId: l.child_id, label: l.label ?? '', clinicianId: l.clinician_id, consentAt: l.consent_at,
        name: c.name ?? '—', avatar: c.avatar, birthday: c.birthday ?? undefined, ageBand: c.age_band ?? undefined,
      };
    }),
    tasks: tasks.map((t) => toTask(t, a.filter((x) => x.task_id === t.id).map((x) => x.child_id))),
    comps: (ok(comps) as Row[]).map((r) => ({
      taskId: r.task_id, childId: r.child_id, date: r.date, status: r.status, childDoneAt: r.child_done_at ?? undefined, declineReason: r.decline_reason,
    })),
  };
}

export async function detail(c: Client): Promise<Detail> {
  const [abc, notes, goals, sugg] = await Promise.all([
    supabase.from('abc_events').select('*').eq('child_id', c.childId).order('occurred_at'),
    supabase.from('clinic_notes').select('*').eq('link_id', c.linkId).order('created_at'),
    supabase.from('clinic_goals').select('*').eq('link_id', c.linkId).order('created_at'),
    supabase.from('clinic_task_suggestions').select('*').eq('link_id', c.linkId).order('created_at'),
  ]);
  const g = ok(goals) as Row[];
  const ratings = g.length ? (ok(await supabase.from('goal_ratings').select('*').in('goal_id', g.map((x) => x.id))) as Row[]) : [];
  return {
    abc: (ok(abc) as Row[]).map((r) => ({ id: r.id, occurredAt: r.occurred_at, antecedent: r.antecedent, behavior: r.behavior, consequence: r.consequence, intensity: r.intensity }))
      .sort((x, y) => y.occurredAt.localeCompare(x.occurredAt)),
    notes: (ok(notes) as Row[]).map((r) => ({ id: r.id, body: r.body, createdAt: r.created_at, authorId: r.author_id })).reverse(),
    goals: g.map((r) => ({ id: r.id, title: r.title, description: r.description ?? '', archived: !!r.archived, createdAt: r.created_at })),
    ratings: ratings.map((r) => ({ goalId: r.goal_id, week: r.week, rating: r.rating })),
    suggestions: (ok(sugg) as Row[]).map((r) => ({
      id: r.id, title: r.title, emoji: r.emoji, skill: r.skill, difficulty: r.difficulty, recurring: r.recurring, note: r.note,
      status: r.status, createdAt: r.created_at, decidedAt: r.decided_at ?? undefined,
    })).reverse(),
  };
}

/* ---------- Yazma ---------- */

export async function addNote(m: Me, c: Client, body: string) {
  ok(await supabase.from('clinic_notes').insert({ link_id: c.linkId, clinic_id: m.clinicId, author_id: m.id, body: body.trim() }));
}
export async function addGoal(m: Me, c: Client, title: string, description: string) {
  ok(await supabase.from('clinic_goals').insert({ link_id: c.linkId, clinic_id: m.clinicId, title: title.trim(), description: description.trim(), created_by: m.id }));
}
export async function archiveGoal(id: string) {
  ok(await supabase.from('clinic_goals').update({ archived: true }).eq('id', id));
}
export async function rateGoal(m: Me, goalId: string, week: string, rating: number) {
  ok(await supabase.from('goal_ratings').upsert({ goal_id: goalId, clinic_id: m.clinicId, week, rating, rated_by: m.id }, { onConflict: 'goal_id,week' }));
}
export async function suggestTask(m: Me, c: Client, familyId: string, s: Pick<Suggestion, 'title' | 'emoji' | 'skill' | 'difficulty' | 'recurring' | 'note'>) {
  ok(await supabase.from('clinic_task_suggestions').insert({
    link_id: c.linkId, clinic_id: m.clinicId, family_id: familyId, child_id: c.childId, created_by: m.id, ...s, title: s.title.trim(), note: s.note.trim(),
  }));
}
export async function withdrawSuggestion(id: string) {
  ok(await supabase.from('clinic_task_suggestions').delete().eq('id', id));
}
export async function familyOf(linkId: string): Promise<string> {
  const r = ok(await supabase.from('clinic_links').select('family_id').eq('id', linkId).maybeSingle()) as Row | null;
  if (!r) throw new Error('Paylaşım bulunamadı');
  return r.family_id;
}
export async function setLabel(linkId: string, label: string) {
  ok(await supabase.from('clinic_links').update({ label: label.trim().slice(0, 60) }).eq('id', linkId));
}
export async function endSharing(linkId: string) {
  ok(await supabase.rpc('revoke_clinic_link', { p_link_id: linkId }));
}
export async function createInvite(kind: 'family' | 'clinician', label = ''): Promise<{ code: string; expiresAt: string }> {
  const r = ok(await supabase.rpc('clinic_create_invite', { p_kind: kind, p_label: label })) as Row;
  return { code: r.code, expiresAt: r.expires_at };
}
export async function invites(clinicId: string): Promise<Invite[]> {
  const rows = ok(await supabase.from('clinic_invites').select('*').eq('clinic_id', clinicId).order('created_at')) as Row[];
  return rows.map((r) => ({ code: r.code, kind: r.kind, label: r.label, expiresAt: r.expires_at, usedAt: r.used_at ?? undefined, createdAt: r.created_at })).reverse();
}
export async function team(clinicId: string): Promise<Member[]> {
  const rows = ok(await supabase.from('clinicians').select('*').eq('clinic_id', clinicId).order('created_at')) as Row[];
  return rows.map((r) => ({ id: r.id, name: r.name, title: r.title, role: r.role }));
}
export async function renameClinic(clinicId: string, name: string) {
  ok(await supabase.from('clinics').update({ name: name.trim() }).eq('id', clinicId));
}
export async function updateMe(id: string, p: { name?: string; title?: string }) {
  ok(await supabase.from('clinicians').update(p).eq('id', id));
}
