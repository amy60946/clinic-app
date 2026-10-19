import { supabase } from './supabase';
import type { Task, Completion, AbcEvent } from './metrics';

// Sunucu sözleşmesi: ortak/sozlesme/veritabani.md bölüm 4 (klinik önerisi).
// Uzman yalnız ebeveynin rıza verdiği (clinic_links.status = 'active') çocuğu görür ve yalnız okur.

export type ClinicianMe = {
  id: string;
  name: string;
  title: string;
  role: 'owner' | 'member';
  clinic_id: string;
  clinic: string;
  plan: 'trial' | 'small' | 'business' | 'custom' | 'inactive';
  seat_limit: number;
  trial_ends_at: string;
  active: boolean;
};

export type Client = {
  link_id: string;
  clinic_id: string;
  family_id: string;
  child_id: string;
  child_name: string;
  label: string;
  consent_at: string;
};

export type Invite = { code: string; expires_at: string };

// Klinik SQL'i Supabase'e henüz uygulanmadıysa fonksiyon/tablo bulunamaz
export class ClinicNotInstalled extends Error {}

function check<T>(data: T, error: { code?: string; message: string } | null): T {
  if (error) {
    if (error.code === 'PGRST202' || error.code === 'PGRST205' || error.code === '42883' || error.code === '42P01') {
      throw new ClinicNotInstalled('Klinik veritabanı henüz kurulmadı');
    }
    throw new Error(error.message);
  }
  return data;
}

// null: oturum açık ama uzman hesabı değil (ör. ebeveyn hesabıyla girildi)
export async function clinicianMe(): Promise<ClinicianMe | null> {
  const { data, error } = await supabase.rpc('clinician_me');
  return check(data as ClinicianMe | null, error);
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clinic_links')
    .select('id, clinic_id, family_id, child_id, label, consent_at, children(name)')
    .eq('status', 'active')
    .order('consent_at', { ascending: false });
  const rows = check(data ?? [], error) as unknown as {
    id: string; clinic_id: string; family_id: string; child_id: string; label: string; consent_at: string;
    children: { name: string } | null;
  }[];
  return rows.map((r) => ({
    link_id: r.id,
    clinic_id: r.clinic_id,
    family_id: r.family_id,
    child_id: r.child_id,
    child_name: r.children?.name ?? '',
    label: r.label,
    consent_at: r.consent_at,
  }));
}

// Aileye verilecek paylaşım kodu (ebeveyn ParentApp › Aile › Hesap › Uzmanım'da girer). 7 gün, tek kullanım.
export async function createFamilyInvite(label: string): Promise<Invite> {
  const { data, error } = await supabase.rpc('clinic_create_invite', { p_kind: 'family', p_label: label.trim() });
  return check(data as Invite, error);
}

// Uzman paylaşımı sonlandırabilir (ebeveyn de). Erişim hemen biter; notlar ve hedefler klinikte kalır.
export async function revokeLink(linkId: string): Promise<void> {
  const { error } = await supabase.rpc('revoke_clinic_link', { p_link_id: linkId });
  check(null, error);
}

export async function updateLinkLabel(linkId: string, label: string): Promise<void> {
  const { error } = await supabase.from('clinic_links').update({ label: label.trim().slice(0, 60) }).eq('id', linkId);
  check(null, error);
}

/* ---------- Danışan verisi (yalnız okuma; RLS etkin rıza ister) ---------- */

export type Child = { id: string; name: string; gender: string | null; birthday: string | null; age_band: string | null };

export type ClientData = { child: Child | null; tasks: Task[]; completions: Completion[]; abc: AbcEvent[] };

const TASK_COLS = 'id, title, emoji, skill, start_date, end_date, recurring, repeat_kind, repeat_days, reminder, requires_review';

export async function loadClientData(childId: string, from: string): Promise<ClientData> {
  const [child, assigned, comps, abc] = await Promise.all([
    supabase.from('children').select('id, name, gender, birthday, age_band').eq('id', childId).maybeSingle(),
    supabase.from('task_assignments').select(`tasks(${TASK_COLS})`).eq('child_id', childId),
    supabase.from('completions')
      .select('task_id, date, status, child_done_at, reviewed_at, decline_reason, parent_note')
      .eq('child_id', childId).gte('date', from),
    supabase.from('abc_events')
      .select('id, occurred_at, antecedent, behavior, consequence, intensity')
      .eq('child_id', childId).order('occurred_at', { ascending: false }).limit(500),
  ]);
  const rows = check(assigned.data ?? [], assigned.error) as unknown as { tasks: Task | null }[];
  return {
    child: check(child.data as Child | null, child.error),
    tasks: rows.map((r) => r.tasks).filter((t): t is Task => !!t),
    completions: check((comps.data ?? []) as Completion[], comps.error),
    abc: check((abc.data ?? []) as AbcEvent[], abc.error),
  };
}

/* ---------- Uzman notları (aile görmez) ---------- */

export type Note = { id: string; body: string; created_at: string; author_id: string | null; author: string };

export async function listNotes(linkId: string): Promise<Note[]> {
  const { data, error } = await supabase.from('clinic_notes')
    .select('id, body, created_at, author_id, clinicians(name)')
    .eq('link_id', linkId).order('created_at', { ascending: false });
  const rows = check(data ?? [], error) as unknown as (Omit<Note, 'author'> & { clinicians: { name: string } | null })[];
  return rows.map(({ clinicians, ...n }) => ({ ...n, author: clinicians?.name ?? '' }));
}

export async function addNote(c: Client, authorId: string, body: string): Promise<void> {
  const { error } = await supabase.from('clinic_notes')
    .insert({ link_id: c.link_id, clinic_id: c.clinic_id, author_id: authorId, body: body.trim() });
  check(null, error);
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('clinic_notes').delete().eq('id', id);
  check(null, error);
}

/* ---------- Hedefe ulaşma ölçeği (GAS, -2 … +2, haftalık) ---------- */

export type GoalRating = { week: string; rating: number; note: string };
export type Goal = { id: string; title: string; description: string; archived: boolean; created_at: string; ratings: GoalRating[] };

export async function listGoals(linkId: string): Promise<Goal[]> {
  const { data, error } = await supabase.from('clinic_goals')
    .select('id, title, description, archived, created_at, goal_ratings(week, rating, note)')
    .eq('link_id', linkId).order('created_at');
  const rows = check(data ?? [], error) as unknown as (Omit<Goal, 'ratings'> & { goal_ratings: GoalRating[] })[];
  return rows.map(({ goal_ratings, ...g }) => ({ ...g, ratings: goal_ratings ?? [] }));
}

export async function addGoal(c: Client, by: string, title: string, description: string): Promise<void> {
  const { error } = await supabase.from('clinic_goals').insert({
    link_id: c.link_id, clinic_id: c.clinic_id, title: title.trim(), description: description.trim(), created_by: by,
  });
  check(null, error);
}

export async function setGoalArchived(id: string, archived: boolean): Promise<void> {
  const { error } = await supabase.from('clinic_goals').update({ archived }).eq('id', id);
  check(null, error);
}

export async function rateGoal(c: Client, by: string, goalId: string, week: string, rating: number, note = ''): Promise<void> {
  const { error } = await supabase.from('goal_ratings').upsert(
    { goal_id: goalId, clinic_id: c.clinic_id, week, rating, note: note.trim(), rated_by: by },
    { onConflict: 'goal_id,week' },
  );
  check(null, error);
}

/* ---------- Aileye görev önerisi (ekleme kararı ebeveynin) ---------- */

export type Difficulty = 'easy' | 'medium' | 'hard';
export type Suggestion = {
  id: string; title: string; emoji: string; skill: string; difficulty: Difficulty; recurring: boolean; note: string;
  status: 'pending' | 'accepted' | 'declined'; created_at: string; decided_at: string | null; task_title: string | null;
};
export type SuggestionInput = Pick<Suggestion, 'title' | 'emoji' | 'skill' | 'difficulty' | 'recurring' | 'note'>;

export async function listSuggestions(linkId: string): Promise<Suggestion[]> {
  const { data, error } = await supabase.from('clinic_task_suggestions')
    .select('id, title, emoji, skill, difficulty, recurring, note, status, created_at, decided_at, tasks(title)')
    .eq('link_id', linkId).order('created_at', { ascending: false });
  const rows = check(data ?? [], error) as unknown as (Omit<Suggestion, 'task_title'> & { tasks: { title: string } | null })[];
  return rows.map(({ tasks, ...s }) => ({ ...s, task_title: tasks?.title ?? null }));
}

export async function addSuggestion(c: Client, by: string, s: SuggestionInput): Promise<void> {
  const { error } = await supabase.from('clinic_task_suggestions').insert({
    link_id: c.link_id, clinic_id: c.clinic_id, family_id: c.family_id, child_id: c.child_id, created_by: by,
    title: s.title.trim(), emoji: s.emoji.trim() || '⭐', skill: s.skill.trim(), difficulty: s.difficulty,
    recurring: s.recurring, note: s.note.trim(),
  });
  check(null, error);
}

// Yalnız bekleyen öneri geri çekilebilir (RLS)
export async function withdrawSuggestion(id: string): Promise<void> {
  const { error } = await supabase.from('clinic_task_suggestions').delete().eq('id', id);
  check(null, error);
}

/* ---------- Ekip ---------- */

export type Member = { id: string; name: string; title: string; role: 'owner' | 'member' };

export async function listTeam(): Promise<Member[]> {
  const { data, error } = await supabase.from('clinicians').select('id, name, title, role').order('created_at');
  return check((data ?? []) as Member[], error);
}

// Yalnız klinik sahibi; koltuk sınırı kayıtta denetlenir
export async function createTeamInvite(): Promise<Invite> {
  const { data, error } = await supabase.rpc('clinic_create_invite', { p_kind: 'clinician', p_label: '' });
  return check(data as Invite, error);
}
