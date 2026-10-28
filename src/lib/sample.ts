// Örnek aile (Joon'un "sample patient" işlevinin karşılığı; içerik özgün): yeni uzman gerçek bir aile bağlamadan danışan
// ekranlarının nasıl görüneceğini görür. Veri tarayıcıda/cihazda üretilir, sunucuya hiçbir şey gitmez ve kaydedilmez.
// Aynı gün için hep aynı veri (tohumlu rastgele) — testler tests/sample.test.mjs.
import type { Task, Completion, AbcEvent, DeclineReason } from './metrics.ts';
import { addDays, occursOn } from './metrics.ts';
import type { PlanGoal, PlanModule, ModuleLog } from './plan.ts';
import type { Client, ClientData } from './clinic.ts';

export const SAMPLE_LINK = 'sample';

export type SampleNote = { id: string; body: string; created_at: string; author_id: string | null; author: string };
export type SamplePlan = { goals: PlanGoal[]; modules: PlanModule[]; logs: ModuleLog[] };

// mulberry32: küçük, tohumlu rastgele sayı üreteci
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const WEEKS = 9;

export const SAMPLE_CHILD = { id: 'sample-child', name: 'Deniz', gender: null, birthday: null, age_band: 'B' };

function tasks(start: string): Task[] {
  const t = (id: string, title: string, emoji: string, skill: string, o: Partial<Task>): Task => ({
    id, title, emoji, skill, start_date: start, end_date: null, recurring: true, repeat_kind: 'daily', repeat_days: [],
    reminder: null, requires_review: true, ...o,
  });
  return [
    t('s-teeth', 'Dişlerini 2 dakika fırçala', '🦷', 'strength', { reminder: '07:30' }),
    t('s-bed', 'Yatağını topla', '🛏️', 'teamwork', { reminder: '07:45' }),
    t('s-bag', 'Okul çantanı akşamdan hazırla', '🎒', 'teamwork', { repeat_kind: 'weekly', repeat_days: [1, 2, 3, 4, 7], reminder: '20:00' }),
    t('s-read', '15 dakika kitap oku', '📖', 'knowledge', { reminder: '19:00' }),
    t('s-toys', 'Oyuncaklarını topla', '🧸', 'teamwork', { reminder: '18:30' }),
    t('s-breathe', 'Sakinleşme köşesinde 3 derin nefes', '🌬️', 'stamina', { repeat_kind: 'weekly', repeat_days: [1, 3, 5], reminder: '17:00' }),
    t('s-help', 'Kardeşine bir işte yardım et', '🤝', 'kindness', { repeat_kind: 'weekly', repeat_days: [2, 4, 6] }),
  ];
}
// Uzmanın önerip ebeveynin onayladığı görevler ("Ekleyen" süzgeci)
const FROM_CLINIC = ['s-read', 's-breathe'];

const NOTES_OK = ['Hatırlatmadan yaptı.', 'Bugün çok istekliydi.', 'Kardeşiyle birlikte yaptı.'];
const NOTES_REJECT = ['Yarısında bıraktı.', 'Yaptım dedi ama yapılmamıştı.', 'Çok aceleyle yaptı, birlikte tekrar ettik.'];
const DECLINES: DeclineReason[] = ['hard', 'no_time', 'did_not_want', 'hard'];

const ABC: { a: string; b: string; c: string; part: AbcEvent['day_part'] }[] = [
  { a: 'Tablet kapatılması istendi', b: 'Bağırdı, tableti bırakmadı', c: 'Tablet 5 dakika sonra kapatıldı, sakinleşince konuştuk', part: 'evening' },
  { a: 'Ödeve başlama zamanı geldi', b: 'Masaya oturmayı reddetti, ağladı', c: 'İlk soruyu birlikte yaptık', part: 'noon' },
  { a: 'Sabah giyinme sırasında acele', b: 'Kıyafetini fırlattı', c: 'Sakin bir sesle tek seçenek sunuldu', part: 'morning' },
  { a: 'Kardeşi oyuncağını aldı', b: 'Kardeşini itti', c: 'İkisi ayrı odaya alındı, sonra özür diledi', part: 'evening' },
  { a: 'Yatma saati hatırlatıldı', b: 'Odadan çıkmayı reddetti, kapıyı çarptı', c: 'Görsel çizelgeye bakıldı, kitap okundu', part: 'night' },
];

const MODULE_LOG_NOTES = ['Övgüyü hemen verince işe yaradı.', 'Akşam yorgunduk, kısa tuttuk.', ''];

export type SampleBundle = {
  tasks: Task[]; completions: Completion[]; abc: AbcEvent[]; fromClinic: string[]; plan: SamplePlan; notes: SampleNote[];
  consentAt: string;
};

export function sampleBundle(today: string): SampleBundle {
  const r = rng(20261028);
  const start = addDays(today, -7 * WEEKS);
  const ts = tasks(start);
  const completions: Completion[] = [];
  const at = (d: string, hm: string) => new Date(`${d}T${hm}:00`).toISOString();
  // hatırlatma saatinden dakika kadar önce/sonra (gün içinde kalır)
  const shift = (hm: string, min: number) => {
    const [h, m] = hm.split(':').map(Number);
    const t = Math.max(0, Math.min(23 * 60 + 59, h * 60 + m + min));
    return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
  };

  // Haftalar ilerledikçe yapma olasılığı artar (müdahale başladıktan sonra iyileşme), her görevin kendi düzeyi var
  const base: Record<string, number> = { 's-teeth': 0.62, 's-bed': 0.45, 's-bag': 0.4, 's-read': 0.35, 's-toys': 0.3, 's-breathe': 0.25, 's-help': 0.5 };
  for (let d = start; d < today; d = addDays(d, 1)) {
    const week = Math.floor((Date.parse(d) - Date.parse(start)) / (7 * 864e5));
    for (const t of ts) {
      if (!occursOn(t, d)) continue;
      const p = Math.min(0.95, base[t.id] + week * 0.055);
      const x = r();
      if (x < p) {
        const motivation = r() < 0.45 ? Math.max(1, Math.min(5, Math.round(4.5 - week * 0.35 + (r() - 0.5) * 2))) : null;
        // hatırlatmadan önce başlama haftalar ilerledikçe artar
        const offset = r() < 0.2 + week * 0.07 ? -Math.round(5 + r() * 25) : Math.round(5 + r() * 45);
        completions.push({
          task_id: t.id, date: d, status: 'approved', child_done_at: at(d, shift(t.reminder ?? '18:00', offset)), reviewed_at: at(d, '21:00'),
          decline_reason: null, parent_note: r() < 0.12 ? NOTES_OK[Math.floor(r() * NOTES_OK.length)] : null, motivation,
        });
      } else if (x < p + 0.12) {
        completions.push({ task_id: t.id, date: d, status: 'declined', child_done_at: at(d, '18:00'), reviewed_at: null,
          decline_reason: DECLINES[Math.floor(r() * DECLINES.length)], parent_note: null });
      } else if (x < p + 0.18) {
        completions.push({ task_id: t.id, date: d, status: 'rejected', child_done_at: at(d, '18:00'), reviewed_at: at(d, '21:00'),
          decline_reason: null, parent_note: NOTES_REJECT[Math.floor(r() * NOTES_REJECT.length)] });
      } else if (x < p + 0.21) {
        completions.push({ task_id: t.id, date: d, status: 'retry', child_done_at: at(d, '18:00'), reviewed_at: at(d, '21:00'),
          decline_reason: null, parent_note: 'Bir daha deneyelim.' });
      }
    }
  }
  // Bugün: sabah görevleri yapıldı, biri inceleme bekliyor
  completions.push({ task_id: 's-teeth', date: today, status: 'approved', child_done_at: at(today, '07:40'), reviewed_at: at(today, '08:00'), decline_reason: null, parent_note: null });
  completions.push({ task_id: 's-bed', date: today, status: 'pending', child_done_at: at(today, '07:55'), reviewed_at: null, decline_reason: null, parent_note: null });

  // Davranış kayıtları: başta haftada 3, sonlara doğru haftada 1
  const abc: AbcEvent[] = [];
  for (let w = 0; w < WEEKS; w++) {
    const n = w < 3 ? 3 : w < 6 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const d = addDays(start, w * 7 + Math.floor(r() * 7));
      if (d >= today) continue;
      const e = ABC[Math.floor(r() * ABC.length)];
      const hm = e.part === 'morning' ? '07:50' : e.part === 'noon' ? '15:30' : e.part === 'evening' ? '19:10' : '21:40';
      abc.push({ id: `s-abc-${w}-${i}`, occurred_at: at(d, hm), antecedent: e.a, behavior: e.b, consequence: e.c,
        intensity: Math.max(1, Math.min(5, Math.round(4 - w * 0.3 + (r() - 0.5) * 2))), day_part: e.part, group_id: null, audio_path: null, duration_ms: null });
    }
  }
  abc.sort((a, b) => b.occurred_at.localeCompare(a.occurred_at));

  return { tasks: ts, completions, abc, fromClinic: FROM_CLINIC, plan: samplePlan(today, start, r), notes: sampleNotes(today), consentAt: at(start, '10:00') };
}

function samplePlan(today: string, start: string, r: () => number): SamplePlan {
  const created = new Date(`${start}T10:00:00`).toISOString();
  const monday = (d: string) => { const x = new Date(`${d}T12:00:00`); const w = x.getDay() || 7; return addDays(d, 1 - w); };
  const weeks = Array.from({ length: WEEKS }, (_, i) => monday(addDays(start, i * 7))).filter((w) => w < today);
  const goal = (id: string, title: string, domain: string, rating: (i: number) => number, o: Partial<PlanGoal> = {}): PlanGoal => ({
    id, title, description: '', archived: false, created_at: created, domain, measure: 'yesno', baseline: '', target: '7 günün 5\'i',
    weeks: 8, home_support: '', shared: true, status: 'active', position: 0, template_key: null,
    ratings: weeks.map((w, i) => ({ week: w, rating: rating(i), note: '' })), ...o,
  });
  const goals = [
    goal('s-g1', 'Sabah rutinini görsel çizelgeyle en çok 1 hatırlatmayla bitirir', 'routine', (i) => Math.min(2, -2 + Math.floor(i / 2)),
      { baseline: '7 günün 2\'si', home_support: 'Resimli sabah çizelgesi; bitince kısa övgü.', position: 0 }),
    goal('s-g2', 'Öfkelendiğinde sakinleşme köşesini kullanır', 'emotion', (i) => Math.min(1, -2 + Math.floor(i / 3)),
      { measure: 'frequency', baseline: 'Haftada 0', target: 'Haftada 3', position: 1 }),
  ];
  const mod = (id: string, title: string, aim: string, practice: string, checklist: string[], status: PlanModule['status'], position: number): PlanModule =>
    ({ id, title, aim, practice, checklist, position, status, template_key: null, created_at: created });
  const modules = [
    mod('s-m1', 'Övgü ve olumlu pekiştirme', 'İstenen davranışı hemen ve somut övmek.', 'Bu hafta her gün en az 3 somut övgü.',
      ['Davranışı adıyla söyledim', 'Hemen övdüm'], 'active', 0),
    mod('s-m2', 'Rutin ve görsel çizelge', 'Sabah ve akşam rutinini resimli çizelgeyle öngörülebilir kılmak.', 'Çizelgeyi göz hizasına as, her adımda işaretlet.',
      ['Çizelge asıldı', 'Adımları birlikte işaretledik'], 'done', 1),
    mod('s-m3', 'Planlı görmezden gelme', 'Zararsız dikkat arayışını pekiştirmemek.', 'Sızlanmaya tepki verme, sakinleşince ilgilen.',
      ['Tepki vermedim', 'Sakinleşince övdüm'], 'planned', 2),
  ];
  const logs: ModuleLog[] = [];
  for (let d = addDays(today, -20); d < today; d = addDays(d, 1)) {
    if (r() < 0.6) logs.push({ module_id: 's-m1', day: d, practiced: r() < 0.85, difficulty: 1 + Math.floor(r() * 4), barrier: null, note: MODULE_LOG_NOTES[Math.floor(r() * 3)] });
  }
  return { goals, modules, logs };
}

function sampleNotes(today: string): SampleNote[] {
  const n = (days: number, body: string, i: number): SampleNote => ({
    id: `s-n${i}`, body, created_at: new Date(`${addDays(today, -days)}T16:00:00`).toISOString(), author_id: null, author: 'Örnek uzman',
  });
  return [
    n(3, 'Görüşme: sabah rutini belirgin şekilde düzeldi; aile çizelgeyi tutarlı kullanıyor. Akşam ekran geçişleri hâlâ zor; geçiş uyarısı (5 dk kala) önerildi.', 1),
    n(17, 'Görüşme: övgü modülü başladı. Anne davranış kayıtlarını aynı gün giriyor; en sık tetikleyici tablet kapatma.', 2),
  ];
}

// Danışan ekranına verilecek hâli (ClientScreen `sample`)
export function sampleClient(today: string): { client: Client; data: ClientData } {
  const b = sampleBundle(today);
  return {
    client: {
      link_id: SAMPLE_LINK, clinic_id: '', family_id: 'sample', child_id: SAMPLE_CHILD.id, child_name: SAMPLE_CHILD.name,
      label: '', consent_at: b.consentAt, parents: 'Ayşe (örnek)', clinician_id: null, assigned: [],
    },
    data: {
      child: SAMPLE_CHILD, tasks: b.tasks, completions: b.completions, abc: b.abc, fromClinic: b.fromClinic,
      sample: true, samplePlan: b.plan, sampleNotes: b.notes,
    },
  };
}
