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
  plan: 'trial' | 'solo' | 'clinic' | 'small' | 'business' | 'custom' | 'inactive';
  seat_limit: number;
  trial_ends_at: string;
  active: boolean;
  // ortak 20261022000000 (üyelik): yoksa eski sunucu
  access?: boolean;                  // bu uzman paneli kullanabilir mi (Bireysel pakette yalnız sahip)
  status?: 'trial' | 'active' | 'expired';
  billing_period?: 'monthly' | 'yearly' | null;
  period_end?: string | null;
  billing_source?: 'app_store' | 'iyzico' | 'manual' | null;
  auto_renew?: boolean;
  member_count?: number;
  // ortak 20261021100000: ekip üyesi profilinde klinik sahibi ve davet eden (yoksa boş gelir)
  owner_name?: string | null;
  invited_by_name?: string | null;
  joined_at?: string | null;
};

export type Client = {
  link_id: string;
  clinic_id: string;
  family_id: string;
  child_id: string;
  child_name: string;
  label: string;
  consent_at: string;
  parents: string; // ailedeki ebeveynlerin adı (aynı adlı çocukları ayırt etmek için)
  // ortak 20261022100000 (klinik içi atama): sorumlu uzman ve sahibin atadığı ekip üyeleri
  clinician_id?: string | null;
  clinician_name?: string;
  assigned?: string[];
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
  const rpc = await supabase.rpc('clinic_clients');
  if (!rpc.error) {
    return ((rpc.data ?? []) as any[]).map((r) => ({
      link_id: r.link_id, clinic_id: r.clinic_id, family_id: r.family_id, child_id: r.child_id,
      child_name: r.child_name ?? '', label: r.label ?? '', consent_at: r.consent_at, parents: r.parents ?? '',
      clinician_id: r.clinician_id ?? null, clinician_name: r.clinician_name ?? '', assigned: r.assigned ?? [],
    }));
  }
  // clinic_clients henüz uygulanmadıysa (ortak 20261019140000) ebeveyn adı olmadan
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
    parents: '',
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
      .select('*')   // ses, gün bölümü ve grup alanları eski şemada yoksa da çalışsın
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

// Zor an sesi: Storage 'abc' kovası; uzman yalnız rızalı çocuğun kaydına bağlı sesi okuyabilir (RLS). 1 saatlik bağlantı.
export async function abcAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('abc').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Ses kaydı açılamadı');
  return data.signedUrl;
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
// Alanlar ParentApp "Görev Oluştur" ile birebir aynı; ebeveyn kabul edince görev bu ayarlarla açılır
// (ortak/sozlesme/akislar.md 5.4, proposed/20261019140000_clinic_suggestion_details.sql).

export type { Difficulty } from '../theme';
import type { Difficulty } from '../theme';
export type RepeatKind = 'daily' | 'weekly' | 'monthly';
import { Category, normalizeCategory } from '../skills';
export type { Category } from '../skills';

export type SuggestionInput = {
  title: string; emoji: string; skill: string; description: string;
  category: Category | null; template_key: string | null;
  difficulty: Difficulty; coins: number;
  start_date: string; recurring: boolean; repeat_kind: RepeatKind; repeat_days: number[]; end_date: string | null;
  reminder: string | null; requires_review: boolean; note: string;
};
export type Suggestion = SuggestionInput & {
  id: string; status: 'pending' | 'accepted' | 'declined'; created_at: string; updated_at: string | null;
  decided_at: string | null; task_title: string | null;
};

// Yeni sütunlar Supabase'e uygulanmadıysa (PGRST204 / 42703) açık bir mesaj
export class SuggestionSchemaMissing extends Error {}
const SCHEMA_MSG = 'Öneri ayrıntıları için veritabanı güncellemesi bekleniyor (ortak: 20261019140000_clinic_suggestion_details.sql).';
function checkSuggestion<T>(data: T, error: { code?: string; message: string } | null): T {
  if (error && (error.code === 'PGRST204' || error.code === '42703' || error.code === 'PGRST202')) throw new SuggestionSchemaMissing(SCHEMA_MSG);
  return check(data, error);
}

const SUGGESTION_COLS = 'id, title, emoji, skill, description, category, template_key, difficulty, coins, start_date, recurring, '
  + 'repeat_kind, repeat_days, end_date, reminder, requires_review, note, status, created_at, updated_at, decided_at, tasks(title)';
const OLD_COLS = 'id, title, emoji, skill, difficulty, recurring, note, status, created_at, decided_at, tasks(title)';

export async function listSuggestions(linkId: string): Promise<Suggestion[]> {
  let res: { data: unknown[] | null; error: { code?: string; message: string } | null } = await supabase
    .from('clinic_task_suggestions').select(SUGGESTION_COLS).eq('link_id', linkId).order('created_at', { ascending: false });
  // Yeni sütunlar henüz yoksa eski alanlarla listele
  if (res.error && (res.error.code === '42703' || res.error.code === 'PGRST204')) {
    res = await supabase.from('clinic_task_suggestions').select(OLD_COLS).eq('link_id', linkId).order('created_at', { ascending: false });
  }
  const rows = check(res.data ?? [], res.error) as unknown as (Partial<Suggestion> & { tasks: { title: string } | null })[];
  return rows.map(({ tasks, ...r }) => ({
    id: r.id!, title: r.title ?? '', emoji: r.emoji ?? '⭐', skill: r.skill ?? '', description: r.description ?? '',
    category: normalizeCategory(r.category), template_key: r.template_key ?? null,
    difficulty: (r.difficulty as Difficulty) ?? 'easy', coins: r.coins ?? difficultyCoins(r.difficulty as Difficulty),
    start_date: r.start_date ?? '', recurring: r.recurring ?? true, repeat_kind: (r.repeat_kind as RepeatKind) ?? 'daily',
    repeat_days: r.repeat_days ?? [], end_date: r.end_date ?? null, reminder: r.reminder ?? null,
    requires_review: r.requires_review ?? true, note: r.note ?? '', status: r.status!, created_at: r.created_at!,
    updated_at: r.updated_at ?? null, decided_at: r.decided_at ?? null, task_title: tasks?.title ?? null,
  }));
}

const difficultyCoins = (d: Difficulty | undefined) => ({ easy: 5, medium: 10, hard: 20 }[d ?? 'easy']);

function payload(s: SuggestionInput) {
  const recurring = s.recurring;
  return {
    title: s.title.trim(), emoji: s.emoji || '⭐', skill: s.skill.trim(), description: s.description.trim(),
    category: s.category, template_key: s.template_key, difficulty: s.difficulty,
    coins: Math.max(0, Math.min(50, Math.round(s.coins))), start_date: s.start_date || null, recurring,
    repeat_kind: recurring ? s.repeat_kind : 'daily',
    repeat_days: recurring && s.repeat_kind !== 'daily' ? s.repeat_days : [],
    end_date: recurring ? s.end_date : null, reminder: s.reminder, requires_review: s.requires_review, note: s.note.trim(),
  };
}

// Sunucu henüz altı kategoriye açılmadıysa (ortak proposed/20261023020000_skill_keys.sql) eski kısıta takılır:
// o zaman eski kategoriyle yeniden dene (Sağlık → self; Odak/İlişki → boş). Beceri anahtarı her durumda doğru yazılır.
const isCategoryCheck = (e: { code?: string; message: string } | null) => e?.code === '23514' && e.message.includes('cts_category_check');
const legacy = (s: SuggestionInput): SuggestionInput => ({
  ...s, category: s.category === 'health' ? ('self' as Category) : ['home', 'mind', 'learn'].includes(s.category ?? '') ? s.category : null,
});

export async function addSuggestions(c: Client, by: string, list: SuggestionInput[]): Promise<void> {
  const insert = (items: SuggestionInput[]) => supabase.from('clinic_task_suggestions').insert(items.map((s) => ({
    link_id: c.link_id, clinic_id: c.clinic_id, family_id: c.family_id, child_id: c.child_id, created_by: by, ...payload(s),
  })));
  let { error } = await insert(list);
  if (isCategoryCheck(error)) ({ error } = await insert(list.map(legacy)));
  checkSuggestion(null, error);
}

// Uzman bekleyen öneriyi günceller (karar verilmişse sunucu reddeder)
export async function updateSuggestion(id: string, s: SuggestionInput): Promise<void> {
  let { error } = await supabase.rpc('clinic_update_suggestion', { p_id: id, p: payload(s) });
  if (isCategoryCheck(error)) ({ error } = await supabase.rpc('clinic_update_suggestion', { p_id: id, p: payload(legacy(s)) }));
  checkSuggestion(null, error);
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

// Giriş yapmış uzman ekip koduyla kliniğe katılır (eski kliniği boşsa silinir; doluysa sunucu reddeder)
export async function joinTeam(code: string): Promise<void> {
  const { error } = await supabase.rpc('clinic_join_team', { p_code: code.trim().toUpperCase() });
  if (error?.code === 'PGRST202') throw new Error('Bu özellik için veritabanı güncellemesi bekleniyor.');
  check(null, error);
}

// Yalnız klinik sahibi; koltuk sınırı kayıtta denetlenir
export async function createTeamInvite(): Promise<Invite> {
  const { data, error } = await supabase.rpc('clinic_create_invite', { p_kind: 'clinician', p_label: '' });
  return check(data as Invite, error);
}

// Hesabı kalıcı sil (App Store kuralı + KVKK). Tek kişilik klinikte danışan paylaşımları, notlar ve hedefler de silinir;
// ekip varsa klinik kalır, sahiplik en eski üyeye geçer.
export async function deleteAccount(): Promise<void> {
  const { error } = await supabase.rpc('delete_account');
  check(null, error);
}

// Klinik sahibi: danışanı bir ekip üyesine açar / kapatır; sorumlu uzmanı değiştirir (ortak 20261022100000)
export async function assignClient(linkId: string, clinicianId: string, assigned: boolean): Promise<void> {
  const { error } = await supabase.rpc('clinic_assign', { p_link_id: linkId, p_clinician_id: clinicianId, p_assigned: assigned });
  if (error?.code === 'PGRST202') throw new Error('Bu özellik için veritabanı güncellemesi bekleniyor.');
  check(null, error);
}

export async function setResponsible(linkId: string, clinicianId: string): Promise<void> {
  const { error } = await supabase.rpc('clinic_set_responsible', { p_link_id: linkId, p_clinician_id: clinicianId });
  if (error?.code === 'PGRST202') throw new Error('Bu özellik için veritabanı güncellemesi bekleniyor.');
  check(null, error);
}
