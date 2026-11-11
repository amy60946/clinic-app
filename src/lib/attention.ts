// Tüm danışanlar dikkat panosu (kullanıcı kararı 2 Kasım 2026: "liste + neden"; ortak veritabani.md 23, clinic_attention_summary).
// Saf yardımcılar (veritabanı içe aktarmaz; testleri tests/attention.test.mjs). Danışan başına tek satır, yalnız OLGU söyleyen
// neden çipleri. Puan, renkli risk ve "en kötüden iyiye" sıralama YOK; her bölümde sıra ailenin son kaydına göre (yeniden eskiye).
export type Attention = {
  link_id: string; last_family_at: string | null; done_7d: number; abc_7d: number; abc_last_at: string | null; logs_7d: number;
  decided_7d: number; decided_last_at: string | null; pending: number; drafts: number; plan_unsent: number;
  goals_active: number; review_due: number; plan_published_at: string | null;
};
export type Section = 'mine' | 'family' | 'quiet' | 'rest';
export type Reason = { key: 'unsent' | 'review' | 'noplan' | 'abc' | 'decided' | 'quiet' | 'pending' | 'tr_review' | 'tr_draft' | 'tr_none'; text: string; icon: string; family?: boolean };
// Lansman odağı "A" (11 Kasım 2026): Takip Planı kapalıyken "Senin sıran" ebeveyn eğitimine bakar. Danışan başına eğitim özeti:
// total = eğitim sayısı, drafts = taslak (ebeveyn görmez), review = ebeveynin bitirdiği, uzmanın henüz açmadığı modül ve yapılacak.
export type TrainingStat = { total: number; drafts: number; review: number };
export type BoardOptions = { plan?: boolean; training?: Record<string, TrainingStat> | null };
const PLAN_KEYS = ['unsent', 'review', 'noplan'];
const MINE_KEYS = [...PLAN_KEYS, 'tr_review', 'tr_draft', 'tr_none'];
export function trainingReasons(s: TrainingStat | undefined): Reason[] {
  if (!s) return [];
  const out: Reason[] = [];
  if (s.review > 0) out.push({ key: 'tr_review', text: `${s.review} yanıt incelemeni bekliyor`, icon: 'school-outline' });
  if (s.drafts > 0) out.push({ key: 'tr_draft', text: s.drafts === 1 ? 'Taslak eğitim' : `${s.drafts} taslak eğitim`, icon: 'eye-off-outline' });
  if (s.total === 0) out.push({ key: 'tr_none', text: 'Eğitim yok', icon: 'school-outline' });
  return out;
}
export type BoardRow<C> = { client: C; reasons: Reason[]; last: string | null; section: Section; fresh: boolean };

const DAY = 86400000;
export const daysSince = (iso: string, now: Date) => Math.floor((now.getTime() - Date.parse(iso)) / DAY);
export const relDay = (iso: string, now: Date) => {
  const d = daysSince(iso, now);
  return d <= 0 ? 'bugün' : d === 1 ? 'dün' : `${d} gün önce`;
};
const after = (a: string | null, b: string | undefined) => !!a && (!b || Date.parse(a) > Date.parse(b));

export function reasonsFor(a: Attention, seenAt: string | undefined, consentAt: string | null, now: Date): Reason[] {
  const out: Reason[] = [];
  const unsent = a.drafts + a.plan_unsent;
  if (unsent > 0) out.push({ key: 'unsent', text: `${unsent} değişiklik gönderilmedi`, icon: 'paper-plane-outline' });
  if (a.review_due > 0) out.push({ key: 'review', text: `Değerlendirme zamanı: ${a.review_due} davranış hedefi`, icon: 'time-outline' });
  if (a.goals_active === 0 && !a.plan_published_at && unsent === 0) out.push({ key: 'noplan', text: 'Takip planı yok', icon: 'flag-outline' });
  if (a.abc_7d > 0 && after(a.abc_last_at, seenAt)) {
    out.push({ key: 'abc', text: `${a.abc_7d} davranış kaydı · ${relDay(a.abc_last_at!, now)}`, icon: 'pulse-outline', family: true });
  }
  if (a.decided_7d > 0 && after(a.decided_last_at, seenAt)) {
    out.push({ key: 'decided', text: `${a.decided_7d} öneriye karar verdi`, icon: 'checkmark-done-outline', family: true });
  }
  // sessiz: paylaşım en az 7 günlük ve ailenin son 7 günde hiç kaydı yok
  const settled = !consentAt || daysSince(consentAt, now) >= 7;
  if (settled && (!a.last_family_at || daysSince(a.last_family_at, now) >= 7)) {
    out.push({ key: 'quiet', text: a.last_family_at ? `${daysSince(a.last_family_at, now)} gündür kayıt yok` : 'Henüz kayıt yok', icon: 'moon-outline' });
  }
  if (a.pending > 0) out.push({ key: 'pending', text: `${a.pending} öneri ebeveyn kararı bekliyor`, icon: 'hourglass-outline' });
  return out;
}

export function sectionOf(reasons: Reason[]): Section {
  if (reasons.some((r) => MINE_KEYS.includes(r.key))) return 'mine';
  if (reasons.some((r) => r.family)) return 'family';
  if (reasons.some((r) => r.key === 'quiet')) return 'quiet';
  return 'rest';
}

// Bölümlere ayır; özetinde olmayan danışan (ör. yeni paylaşım) "rest"e düşer. Sıra: ailenin son kaydı yeniden eskiye, kaydı olmayan sonda.
export function buildBoard<C extends { link_id: string; consent_at: string | null }>(
  clients: C[], att: Record<string, Attention>, seen: Record<string, string>, now: Date, opt: BoardOptions = {},
): Record<Section, BoardRow<C>[]> {
  const plan = opt.plan !== false;
  const out: Record<Section, BoardRow<C>[]> = { mine: [], family: [], quiet: [], rest: [] };
  for (const c of clients) {
    const a = att[c.link_id];
    const base = a ? reasonsFor(a, seen[c.link_id], c.consent_at, now) : [];
    // Takip Planı kapalı: plan nedenleri düşer, eğitim nedenleri başa gelir
    const reasons = plan ? base : [...trainingReasons(opt.training?.[c.link_id]), ...base.filter((r) => !PLAN_KEYS.includes(r.key))];
    const section = sectionOf(reasons);
    out[section].push({ client: c, reasons, last: a?.last_family_at ?? null, section, fresh: reasons.some((r) => r.family) });
  }
  const byLast = (x: BoardRow<C>, y: BoardRow<C>) => (y.last ? Date.parse(y.last) : 0) - (x.last ? Date.parse(x.last) : 0);
  (Object.keys(out) as Section[]).forEach((k) => out[k].sort(byLast));
  return out;
}
