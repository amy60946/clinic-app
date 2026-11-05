import { supabase } from './supabase';
import type { Attention } from './attention';
import type { Task, Completion, AbcEvent } from './metrics';
import type { SamplePlan, SampleNote } from './sample';

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
  billing_source?: 'revenuecat' | 'app_store' | 'iyzico' | 'manual' | null;   // ortak durumlar.md (iyzico ileride kendi sistem için; bugün kullanılmaz)
  auto_renew?: boolean;
  member_count?: number;
  // ortak 20261021100000: ekip üyesi profilinde klinik sahibi ve davet eden (yoksa boş gelir)
  owner_name?: string | null;
  invited_by_name?: string | null;
  joined_at?: string | null;
  // ortak proposed/20261105090000_workspaces.sql (çalışma alanları): yoksa eski sunucu (tek alan)
  personal?: boolean;                // seçili alan uzmanın bireysel alanı
  members_can_invite?: boolean;      // ekip üyeleri aile davet edebilir (sahip ayarı)
  default_clinic_id?: string;
  workspace_invalid?: boolean;       // seçili alan artık geçerli değil (ayrıldı / çıkarıldı)
  workspaces?: number;               // etkin alan sayısı
  has_personal?: boolean;
  requests?: number;                 // bekleyen ekibe katılma isteği
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

// Tüm danışanlar dikkat panosu (ortak clinic_attention_summary, veritabani.md 23): bağlantı kimliğine göre sayılar.
// İşlev sunucuda yoksa null (pano görünmez, düz liste kalır).
export async function loadAttention(): Promise<Record<string, Attention> | null> {
  const { data, error } = await supabase.rpc('clinic_attention_summary');
  if (error) return null;
  const out: Record<string, Attention> = {};
  ((data ?? []) as any[]).forEach((r) => {
    const n = (v: unknown) => Number(v) || 0;
    out[r.link_id] = {
      link_id: r.link_id, last_family_at: r.last_family_at ?? null, done_7d: n(r.done_7d), abc_7d: n(r.abc_7d), abc_last_at: r.abc_last_at ?? null,
      logs_7d: n(r.logs_7d), decided_7d: n(r.decided_7d), decided_last_at: r.decided_last_at ?? null, pending: n(r.pending), drafts: n(r.drafts),
      plan_unsent: n(r.plan_unsent), goals_active: n(r.goals_active), review_due: n(r.review_due), plan_published_at: r.plan_published_at ?? null,
    };
  });
  return out;
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

// Aileye verilecek paylaşım kodu (ebeveyn ParentApp › Uzmanım › Uzman bağla ya da Aile › Hesap › Kod gir). 7 gün, tek kullanım.

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

// fromClinic: uzman önerisinden eklenmiş görevler (kabul edilen önerinin task_id'si; "Ekleyen" süzgeci). sample: örnek aile (salt okunur)
export type ClientData = {
  child: Child | null; tasks: Task[]; completions: Completion[]; abc: AbcEvent[]; fromClinic: string[];
  sample?: boolean; samplePlan?: SamplePlan; sampleNotes?: SampleNote[];
};

const TASK_COLS = 'id, title, emoji, skill, start_date, end_date, recurring, repeat_kind, repeat_days, reminder, requires_review';

const COMP_COLS = 'task_id, date, status, child_done_at, reviewed_at, decline_reason, parent_note';

// motivation (ebeveynin "motive etmek ne kadar zordu" gözlemi, ortak 20261027130000) sunucuda yoksa onsuz okunur
async function loadCompletions(childId: string, from: string) {
  const q = (cols: string) => supabase.from('completions').select(cols).eq('child_id', childId).gte('date', from);
  const r = await q(`${COMP_COLS}, motivation`);
  return r.error?.code === '42703' || r.error?.code === 'PGRST204' ? q(COMP_COLS) : r;
}

export async function loadClientData(childId: string, from: string): Promise<ClientData> {
  const [child, assigned, comps, abc, sugg] = await Promise.all([
    supabase.from('children').select('id, name, gender, birthday, age_band').eq('id', childId).maybeSingle(),
    supabase.from('task_assignments').select(`tasks(${TASK_COLS})`).eq('child_id', childId),
    loadCompletions(childId, from),
    supabase.from('abc_events')
      .select('*')   // ses, gün bölümü ve grup alanları eski şemada yoksa da çalışsın
      .eq('child_id', childId).order('occurred_at', { ascending: false }).limit(500),
    supabase.from('clinic_task_suggestions').select('task_id').eq('child_id', childId).not('task_id', 'is', null),
  ]);
  const rows = check(assigned.data ?? [], assigned.error) as unknown as { tasks: Task | null }[];
  return {
    child: check(child.data as Child | null, child.error),
    tasks: rows.map((r) => r.tasks).filter((t): t is Task => !!t),
    completions: check((comps.data ?? []) as unknown as Completion[], comps.error),
    abc: check((abc.data ?? []) as AbcEvent[], abc.error),
    // öneri tablosu okunamazsa süzgeç yalnız "Ebeveyn" der; ekranı durdurmaz
    fromClinic: sugg.error ? [] : ((sugg.data ?? []) as { task_id: string }[]).map((r) => r.task_id),
  };
}

// Davranış kaydı sesi: Storage 'abc' kovası; uzman yalnız rızalı çocuğun kaydına bağlı sesi okuyabilir (RLS). 1 saatlik bağlantı.
export async function abcAudioUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage.from('abc').createSignedUrl(path, 3600);
  if (error || !data?.signedUrl) throw new Error(error?.message ?? 'Ses kaydı açılamadı');
  return data.signedUrl;
}

/* ---------- Uzman notları (aile görmez) ---------- */

// goal_id: hedefe bağlı not (ortak proposed/20261103100000_goal_notes.sql, veritabani.md 24); sütun yoksa null
export type Note = { id: string; body: string; created_at: string; author_id: string | null; author: string; goal_id?: string | null };
const missingColumn = (e: { code?: string } | null) => !!e && (e.code === '42703' || e.code === 'PGRST204');

export async function listNotes(linkId: string): Promise<Note[]> {
  return (await listNotesRaw(linkId)).notes;
}
// goals: sunucuda notun hedef bağı var mı (yoksa hedef notu simgesi görünmez)
async function listNotesRaw(linkId: string): Promise<{ notes: Note[]; goals: boolean }> {
  const q = (cols: string) => supabase.from('clinic_notes').select(cols).eq('link_id', linkId).order('created_at', { ascending: false });
  let goals = true;
  let res = await q('id, body, created_at, author_id, goal_id, clinicians(name)');
  if (missingColumn(res.error)) { goals = false; res = await q('id, body, created_at, author_id, clinicians(name)'); }
  const rows = check(res.data ?? [], res.error) as unknown as (Omit<Note, 'author'> & { clinicians: { name: string } | null })[];
  return { notes: rows.map(({ clinicians, ...n }) => ({ ...n, author: clinicians?.name ?? '' })), goals };
}
// Takip Planı: hedefe bağlı notlar; sunucuda bağ yoksa null
export async function listGoalNotes(linkId: string): Promise<Note[] | null> {
  const r = await listNotesRaw(linkId);
  return r.goals ? r.notes.filter((n) => !!n.goal_id) : null;
}

export async function addNote(c: Pick<Client, 'link_id' | 'clinic_id'>, authorId: string, body: string, goalId?: string | null): Promise<void> {
  const { error } = await supabase.from('clinic_notes')
    .insert({ link_id: c.link_id, clinic_id: c.clinic_id, author_id: authorId, body: body.trim(), ...(goalId ? { goal_id: goalId } : {}) });
  check(null, error);
}

export async function deleteNote(id: string): Promise<void> {
  const { error } = await supabase.from('clinic_notes').delete().eq('id', id);
  check(null, error);
}

/* ---------- Hedefler ve haftalık GAS puanı (rapor için; düzenleme lib/plan.ts) ---------- */

export type GoalRating = { week: string; rating: number; note: string };
export type Goal = { id: string; title: string; description: string; archived: boolean; created_at: string; ratings: GoalRating[] };

export async function listGoals(linkId: string): Promise<Goal[]> {
  const { data, error } = await supabase.from('clinic_goals')
    .select('id, title, description, archived, created_at, goal_ratings(week, rating, note)')
    .eq('link_id', linkId).order('created_at');
  const rows = check(data ?? [], error) as unknown as (Omit<Goal, 'ratings'> & { goal_ratings: GoalRating[] })[];
  return rows.map(({ goal_ratings, ...g }) => ({ ...g, ratings: goal_ratings ?? [] }));
}

/* ---------- Aileye görev önerisi (ekleme kararı ebeveynin) ---------- */
// Alanlar ParentApp "Görev Oluştur" ile birebir aynı; ebeveyn kabul edince görev bu ayarlarla açılır
// (ortak/sozlesme/akislar.md 5.4, proposed/20261019140000_clinic_suggestion_details.sql).

export type { Difficulty } from '../theme';
import type { Difficulty } from '../theme';
export type RepeatKind = 'daily' | 'weekly' | 'monthly';
import { Category, normalizeCategory } from '../skills';
export type { Category } from '../skills';

// Rutin paketi (ortak migrations/20261028200000_routines_v2.sql): aynı `group` = aynı paket; ebeveyn tek kartta görür
export type RoutineRef = { group: string; title: string; icon: string; position: number; key: string };
export type SuggestionInput = {
  title: string; emoji: string; skill: string; description: string;
  category: Category | null; template_key: string | null;
  difficulty: Difficulty; coins: number;
  start_date: string; recurring: boolean; repeat_kind: RepeatKind; repeat_days: number[]; end_date: string | null;
  reminder: string | null; requires_review: boolean; note: string;
  routine?: RoutineRef | null; goal_id?: string | null;
};
// draft: gönderilmemiş taslak (aile görmez; "Aileye gönder" ile gider). kind 'change': ailede ekli göreve değişiklik önerisi
// (ortak migrations/20261102100000_plan_redesign.sql, akislar.md 12.1)
export type Suggestion = SuggestionInput & {
  id: string; status: 'draft' | 'pending' | 'accepted' | 'declined'; created_at: string; updated_at: string | null;
  decided_at: string | null; task_title: string | null; task_id: string | null;
  kind: 'new' | 'change'; target_task_id: string | null; change_remove: boolean;
};

// Yeni sütunlar Supabase'e uygulanmadıysa (PGRST204 / 42703) açık bir mesaj
export class SuggestionSchemaMissing extends Error {}
const SCHEMA_MSG = 'Öneri ayrıntıları için veritabanı güncellemesi bekleniyor (ortak: 20261019140000_clinic_suggestion_details.sql).';
function checkSuggestion<T>(data: T, error: { code?: string; message: string } | null): T {
  if (error && (error.code === 'PGRST204' || error.code === '42703' || error.code === 'PGRST202')) throw new SuggestionSchemaMissing(SCHEMA_MSG);
  return check(data, error);
}

const SUGGESTION_COLS = 'id, title, emoji, skill, description, category, template_key, difficulty, coins, start_date, recurring, '
  + 'repeat_kind, repeat_days, end_date, reminder, requires_review, note, status, created_at, updated_at, decided_at, task_id, tasks(title)';
const ROUTINE_COLS = ', routine_group, routine_title, routine_icon, routine_position, routine_key, goal_id';
const CHANGE_COLS = ', kind, target_task_id, change_remove';
const OLD_COLS = 'id, title, emoji, skill, difficulty, recurring, note, status, created_at, decided_at, task_id, tasks(title)';
const missingCol = (e: { code?: string } | null) => e?.code === '42703' || e?.code === 'PGRST204';

type SuggestionRow = Partial<Suggestion> & { tasks: { title: string } | null; routine_group?: string | null; routine_title?: string | null;
  routine_icon?: string | null; routine_position?: number | null; routine_key?: string | null };

export async function listSuggestions(linkId: string): Promise<Suggestion[]> {
  const q = (cols: string) => supabase.from('clinic_task_suggestions').select(cols).eq('link_id', linkId).order('created_at', { ascending: false });
  let res: { data: unknown[] | null; error: { code?: string; message: string } | null } = await q(SUGGESTION_COLS + ROUTINE_COLS + CHANGE_COLS);
  // Takip planı yeniden tasarımı, rutin v2 ya da ayrıntı sütunları henüz yoksa daha eski alanlarla listele
  if (missingCol(res.error)) res = await q(SUGGESTION_COLS + ROUTINE_COLS);
  if (missingCol(res.error)) res = await q(SUGGESTION_COLS);
  if (missingCol(res.error)) res = await q(OLD_COLS);
  const rows = check(res.data ?? [], res.error) as unknown as SuggestionRow[];
  return rows.map(({ tasks, routine_group, routine_title, routine_icon, routine_position, routine_key, ...r }) => ({
    id: r.id!, title: r.title ?? '', emoji: r.emoji ?? '⭐', skill: r.skill ?? '', description: r.description ?? '',
    category: normalizeCategory(r.category), template_key: r.template_key ?? null,
    difficulty: (r.difficulty as Difficulty) ?? 'easy', coins: r.coins ?? difficultyCoins(r.difficulty as Difficulty),
    start_date: r.start_date ?? '', recurring: r.recurring ?? true, repeat_kind: (r.repeat_kind as RepeatKind) ?? 'daily',
    repeat_days: r.repeat_days ?? [], end_date: r.end_date ?? null, reminder: r.reminder ?? null,
    requires_review: r.requires_review ?? true, note: r.note ?? '', status: r.status!, created_at: r.created_at!,
    updated_at: r.updated_at ?? null, decided_at: r.decided_at ?? null, task_title: tasks?.title ?? null, task_id: r.task_id ?? null,
    routine: routine_group ? { group: routine_group, title: routine_title ?? '', icon: routine_icon ?? 'repeat-outline',
      position: routine_position ?? 0, key: routine_key ?? '' } : null,
    goal_id: r.goal_id ?? null,
    kind: r.kind === 'change' ? 'change' : 'new', target_task_id: r.target_task_id ?? null, change_remove: !!r.change_remove,
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
    // rutin paketi ve hedef yalnız varsa gönderilir (eski sunucuda sıradan öneri yine çalışır)
    ...(s.routine ? { routine_group: s.routine.group, routine_title: s.routine.title.slice(0, 60), routine_icon: s.routine.icon,
      routine_position: s.routine.position, routine_key: s.routine.key.slice(0, 60) } : {}),
    ...(s.goal_id ? { goal_id: s.goal_id } : {}),
  };
}

// Sunucu henüz altı kategoriye açılmadıysa (ortak proposed/20261023020000_skill_keys.sql) eski kısıta takılır:
// o zaman eski kategoriyle yeniden dene (Sağlık → self; Odak/İlişki → boş). Beceri anahtarı her durumda doğru yazılır.
const isCategoryCheck = (e: { code?: string; message: string } | null) => e?.code === '23514' && e.message.includes('cts_category_check');
const legacy = (s: SuggestionInput): SuggestionInput => ({
  ...s, category: s.category === 'health' ? ('self' as Category) : ['home', 'mind', 'learn'].includes(s.category ?? '') ? s.category : null,
});

// Dönüş: paket olarak gitti mi (rutin v2 sütunları sunucuda yoksa görevler ayrı öneri olarak gider) ve taslak mı.
// draft: öneri taslak yazılır (aile görmez); "Aileye gönder" (care_plan_publish) gönderir. Sunucu taslağı bilmiyorsa
// (eski sürüm: durum kısıtı ya da politika) öneri eskisi gibi hemen gider.
const isDraftRejected = (e: { code?: string; message: string } | null) =>
  (e?.code === '23514' && e.message.includes('status_check')) || e?.code === '42501';
export async function addSuggestions(c: Client, by: string, list: SuggestionInput[], opts: { draft?: boolean } = {}): Promise<{ grouped: boolean; draft: boolean }> {
  let draft = !!opts.draft;
  const insert = (items: SuggestionInput[]) => supabase.from('clinic_task_suggestions').insert(items.map((s) => ({
    link_id: c.link_id, clinic_id: c.clinic_id, family_id: c.family_id, child_id: c.child_id, created_by: by, ...payload(s),
    ...(draft ? { status: 'draft' } : {}),
  })));
  let items = list;
  let { error } = await insert(items);
  if (draft && isDraftRejected(error)) { draft = false; ({ error } = await insert(items)); }
  const grouped = list.some((s) => s.routine || s.goal_id);
  if (grouped && missingCol(error)) {
    items = list.map((s) => ({ ...s, routine: null, goal_id: null }));
    ({ error } = await insert(items));
    if (!error) return { grouped: false, draft };
  }
  if (isCategoryCheck(error)) ({ error } = await insert(items.map(legacy)));
  checkSuggestion(null, error);
  return { grouped, draft };
}

// Ailede ekli göreve değişiklik önerisi (taslak; "Aileye gönder" ile gider). Görev başına tek açık öneri:
// varsa onu günceller. Sunucu desteklemiyorsa SuggestionSchemaMissing.
export type ChangeInput = {
  task: Task; reminder: string | null; remove: boolean;
  routine?: RoutineRef | null; goal_id?: string | null;
};
export async function proposeChanges(c: Client, by: string, list: ChangeInput[], open: Suggestion[]): Promise<void> {
  for (const ch of list) {
    const existing = open.find((s) => s.kind === 'change' && s.target_task_id === ch.task.id && (s.status === 'draft' || s.status === 'pending'));
    if (existing) {
      const { error } = await supabase.rpc('clinic_update_suggestion', { p_id: existing.id, p: { reminder: ch.reminder, change_remove: ch.remove } });
      checkSuggestion(null, error);
      continue;
    }
    const t = ch.task;
    const { error } = await supabase.from('clinic_task_suggestions').insert({
      link_id: c.link_id, clinic_id: c.clinic_id, family_id: c.family_id, child_id: c.child_id, created_by: by,
      status: 'draft', kind: 'change', target_task_id: t.id, change_remove: ch.remove,
      title: t.title, emoji: t.emoji || '⭐', skill: t.skill ?? '', recurring: t.recurring, repeat_kind: t.repeat_kind,
      repeat_days: t.repeat_days ?? [], end_date: t.end_date, reminder: ch.reminder, requires_review: t.requires_review,
      ...(ch.routine ? { routine_group: ch.routine.group, routine_title: ch.routine.title.slice(0, 60), routine_icon: ch.routine.icon,
        routine_position: ch.routine.position, routine_key: ch.routine.key.slice(0, 60) } : {}),
      ...(ch.goal_id ? { goal_id: ch.goal_id } : {}),
    });
    if (error && (missingCol(error) || isDraftRejected(error))) {
      throw new SuggestionSchemaMissing('Değişiklik önerisi için veritabanı güncellemesi bekleniyor (ortak: 20261102100000_plan_redesign.sql).');
    }
    checkSuggestion(null, error);
  }
}

// Rutin ya da tek görev ↔ hedef bağı (ailede ekli olanlar dahil; ortak migrations/20261102100000_plan_redesign.sql 6).
// goalId null: bağı kaldır. Sunucuda işlev yoksa SuggestionSchemaMissing.
export async function setSuggestionGoal(ids: string[], goalId: string | null): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabase.rpc('clinic_set_suggestion_goal', { p_ids: ids, p_goal_id: goalId });
  if (error && (error.code === 'PGRST202' || error.code === '42883')) {
    throw new SuggestionSchemaMissing('Davranış hedefine bağlamak için veritabanı güncellemesi bekleniyor (ortak: 20261102100000_plan_redesign.sql).');
  }
  check(null, error);
}

// Uzman bekleyen öneriyi günceller (karar verilmişse sunucu reddeder)
export async function updateSuggestion(id: string, s: SuggestionInput): Promise<void> {
  let { error } = await supabase.rpc('clinic_update_suggestion', { p_id: id, p: payload(s) });
  if (isCategoryCheck(error)) ({ error } = await supabase.rpc('clinic_update_suggestion', { p_id: id, p: payload(legacy(s)) }));
  checkSuggestion(null, error);
}

// Taslak ya da bekleyen önerinin tek alanları (ör. rutin düzenlemede saat); karar verilmişse sunucu reddeder
export async function updateSuggestionFields(id: string, p: { reminder?: string | null; goal_id?: string | null; change_remove?: boolean }): Promise<void> {
  const { error } = await supabase.rpc('clinic_update_suggestion', { p_id: id, p });
  checkSuggestion(null, error);
}

// Taslak ya da bekleyen öneri geri çekilebilir (RLS)
export async function withdrawSuggestion(id: string): Promise<void> {
  const { error } = await supabase.from('clinic_task_suggestions').delete().eq('id', id);
  check(null, error);
}

/* ---------- Uzmanın kendi rutinleri (clinic_routines; ortak migrations/20261028200000_routines_v2.sql) ---------- */
import type { OwnRoutine, OwnItem } from './routines';
const ROUTINE_TABLE_MISSING = (e: { code?: string } | null) => e?.code === 'PGRST205' || e?.code === '42P01';

// Sunucuda tablo yoksa null (Rutinlerim görünmez)
export async function listOwnRoutines(): Promise<OwnRoutine[] | null> {
  const { data, error } = await supabase.from('clinic_routines')
    .select('id, title, icon, repeat, ages, items, shared, archived, created_by, updated_at').eq('archived', false).order('updated_at', { ascending: false });
  if (ROUTINE_TABLE_MISSING(error)) return null;
  return check((data ?? []) as OwnRoutine[], error);
}
export type OwnRoutineInput = Pick<OwnRoutine, 'title' | 'icon' | 'repeat' | 'ages' | 'shared'> & { items: OwnItem[] };
export async function saveOwnRoutine(me: ClinicianMe, r: OwnRoutineInput, id?: string): Promise<void> {
  const row = { title: r.title.trim().slice(0, 60), icon: r.icon, repeat: r.repeat, ages: r.ages, shared: r.shared, items: r.items,
    archived: false, updated_at: new Date().toISOString() };
  // klinik ve oluşturan sunucuda tetikleyiciyle yazılır; önizleme için yine gönderilir
  const { error } = id ? await supabase.from('clinic_routines').update(row).eq('id', id)
    : await supabase.from('clinic_routines').insert({ ...row, clinic_id: me.clinic_id, created_by: me.id });
  check(null, error);
}
export async function deleteOwnRoutine(id: string): Promise<void> {
  const { error } = await supabase.from('clinic_routines').delete().eq('id', id);
  check(null, error);
}

/* ---------- Ekip ve çalışma alanları (ortak akislar.md 21, veritabani.md 30) ---------- */

export type Member = { id: string; name: string; title: string; role: 'owner' | 'member'; joined_at?: string; invited_by_name?: string | null };
export type TeamRequest = { id: string; name: string; title: string; created_at: string; expires_at: string };
export type Team = { members: Member[]; requests: TeamRequest[]; seat_limit: number; members_can_invite: boolean; personal: boolean };
export type Workspace = { clinic_id: string; name: string; role: 'owner' | 'member'; personal: boolean; active: boolean; access: boolean;
  default: boolean; members: number; joined_at: string };
export type MyRequest = { id: string; clinic_id: string; clinic: string; by: string; by_title: string; members: number; created_at: string; expires_at: string };
export class WorkspacesNotInstalled extends Error {}
const missingFn = (e: { code?: string } | null) => e?.code === 'PGRST202' || e?.code === '42883';

// Seçili alanın ekibi (rol alandaki üyelikten). Sunucu eskiyse uzman tablosundan (tek alan).
export async function loadTeam(): Promise<Team | null> {
  const { data, error } = await supabase.rpc('clinic_team');
  if (missingFn(error)) return null;
  return check(data as Team, error);
}
export async function listTeam(): Promise<Member[]> {
  const t = await loadTeam();
  if (t) return t.members;
  const { data, error } = await supabase.from('clinicians').select('id, name, title, role').order('created_at');
  return check((data ?? []) as Member[], error);
}
export async function listWorkspaces(): Promise<Workspace[] | null> {
  const { data, error } = await supabase.rpc('clinician_workspaces');
  if (missingFn(error)) return null;
  return check((data ?? []) as Workspace[], error);
}
export async function openPersonalWorkspace(): Promise<string> {
  const { data, error } = await supabase.rpc('clinician_personal_workspace');
  return check(data as string, error);
}
export async function createClinicWorkspace(name: string): Promise<string> {
  const { data, error } = await supabase.rpc('clinic_workspace_create', { p_name: name.trim().slice(0, 120) });
  if (error?.message?.includes('too_many_clinics')) throw new Error('En çok 3 klinik açabilirsin.');
  return check(data as string, error);
}
// Kalıcı kişisel kod (yoksa üretilir); rotate yeniler
export async function personalCode(rotate = false): Promise<string | null> {
  const { data, error } = await supabase.rpc('clinician_personal_code', { p_rotate: rotate });
  if (missingFn(error)) return null;
  return check(data as string, error);
}
export type RequestResult = { status?: 'sent' | 'pending'; id?: string; name?: string; title?: string; expires_at?: string; error?: string; hint?: string; message?: string };
export const REQUEST_ERROR: Record<string, string> = {
  invalid_code: 'Bu kodla bir uzman bulunamadı. Kodu uzmandan yeniden iste.',
  too_many_attempts: 'Çok fazla hatalı deneme. 15 dakika sonra tekrar dene.',
  self: 'Bu senin kendi kodun.',
  already_member: 'Bu uzman zaten ekibinde.',
  seat_full: 'Koltuklar dolu. Klinik paketini yükselt ya da bekleyen bir isteği geri çek.',
  personal_workspace: 'Bireysel çalışma alanına uzman eklenmez. Ekip için bir klinik aç.',
};
export async function requestMember(code: string): Promise<RequestResult> {
  const { data, error } = await supabase.rpc('clinic_member_request', { p_code: code.replace(/[^A-Za-z0-9]/g, '').toUpperCase() });
  if (missingFn(error)) throw new WorkspacesNotInstalled('Bu özellik için veritabanı güncellemesi bekleniyor.');
  if (error?.message?.includes('only_owner')) throw new Error('Uzmanı yalnız klinik sahibi ekler.');
  return check(data as RequestResult, error);
}
export async function cancelTeamRequest(id: string): Promise<void> {
  const { error } = await supabase.rpc('clinic_member_request_cancel', { p_request: id });
  check(null, error);
}
export async function myTeamRequests(): Promise<MyRequest[]> {
  const { data, error } = await supabase.rpc('clinic_member_requests_mine');
  if (missingFn(error)) return [];
  return check((data ?? []) as MyRequest[], error);
}
export async function respondTeamRequest(id: string, accept: boolean): Promise<{ status?: string; clinic_id?: string; clinic?: string; error?: string }> {
  const { data, error } = await supabase.rpc('clinic_member_respond', { p_request: id, p_accept: accept });
  return check(data as { status?: string; clinic_id?: string; clinic?: string; error?: string }, error);
}
export async function removeMember(clinicianId: string): Promise<void> {
  const { error } = await supabase.rpc('clinic_member_remove', { p_clinician: clinicianId });
  check(null, error);
}
export async function leaveClinic(): Promise<void> {
  const { error } = await supabase.rpc('clinic_leave');
  if (error?.message?.includes('owner_cannot_leave')) throw new Error('Klinik sahibi ayrılamaz.');
  check(null, error);
}
export async function setInvitePolicy(on: boolean): Promise<void> {
  const { error } = await supabase.rpc('clinic_invite_policy_set', { p_members_can_invite: on });
  check(null, error);
}

// Ayarlar: uzman kendi adını ve unvanını, klinik sahibi kliniğin adını değiştirir (RLS: ortak veritabani.md 4.1)
export async function updateProfile(id: string, name: string, title: string): Promise<void> {
  const { error } = await supabase.from('clinicians').update({ name: name.trim().slice(0, 80), title: title.trim().slice(0, 80) }).eq('id', id);
  check(null, error);
}

export async function updateClinicName(clinicId: string, name: string): Promise<void> {
  const { error } = await supabase.from('clinics').update({ name: name.trim().slice(0, 120) }).eq('id', clinicId);
  check(null, error);
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
