// Yaşam döngüsü hatırlatmaları: "hakem" (uzaktan ayar bayrağı `lifecycle_nudges`; docs/arastirma/bildirim-benchmark.md 4–5).
// Saf işlevler (React Native yok; testi tests/nudges.test.mjs). Cihaza yazan taraf: src/lib/nudges.ts.
// Faz 1: sunucu ve e-posta yok. Uzmanın o anki durumuna bakılır, hangi hatırlatmaların cihazda PLANLI durması gerektiği
// hesaplanır; her açılışta baştan hesaplanır (o güne planlı hatırlatma uygulama açılınca düşer).
// Değişmez çizgiler: başlık ve metinde çocuk / ebeveyn adı ve davranış ayrıntısı yok; gece ve hafta sonu yok.
import { trDay, trMinutes, trToIso, weekdayOf, hhmmToMin } from './sessionCore.ts';
import { addDays } from './metrics.ts';

export const NUDGES_FLAG = 'lifecycle_nudges';
// Sunucu motoru (aşama 2; ortak akislar.md 25 "Sunucu motoru", proposed/20261120230000_nudge_engine.sql): uzaktan ayarda
// `nudges_server_clinic` tanımlıysa o, değilse `nudges_server` geçer (sunucudaki nudge_flag_on ile aynı sıra). Açıkken
// hatırlatmaları sunucu gönderir (bildirim türü `nudge`); cihaz içi planlama yapılmaz ve planlı yerel hatırlatmalar silinir.
export const NUDGES_SERVER_FLAG = 'nudges_server_clinic';
export const NUDGES_SERVER_ANY = 'nudges_server';
export function serverNudgesOn(flags: Record<string, boolean> | null | undefined): boolean {
  if (!flags) return false;
  return NUDGES_SERVER_FLAG in flags ? flags[NUDGES_SERVER_FLAG] === true : flags[NUDGES_SERVER_ANY] === true;
}
// Bildirim verisinden açılacak yer: sunucu `code` / `link_id` yazar (ref eğitim kimliği olabilir), cihaz içi yalnız `ref`
export function nudgeTarget(data: Record<string, unknown> | null | undefined): { type: string; code: string | null; linkId: string | null } {
  const d = data ?? {};
  const str = (v: unknown) => (typeof v === 'string' && v ? v : null);
  const type = String(d.nudge ?? '');
  const ref = str(d.ref);
  return {
    type,
    code: type === 'invite_expiring' ? str(d.code) ?? ref : null,
    linkId: type === 'training_none' || type === 'training_draft' ? str(d.link_id) ?? ref : null,
  };
}
export const NUDGE_PREFIX = 'nudge.';
export const NUDGE_TITLE = 'Moyo Mercek';
export const WORK_START = '08:30';
export const WORK_END = '19:00';
export const NUDGE_TIME = '10:00';

export type NudgeType = 'invite_none' | 'invite_expiring' | 'training_none' | 'training_draft' | 'trial_ending';
// ref: dokununca açılacak şey (davet kodu, danışan bağı); metne girmez
export type PlannedNudge = { id: string; type: NudgeType; fireAt: string; title: string; body: string; ref: string | null };
// opened: bildirime dokunuldu · achieved: 24 saat içinde amacı gerçekleşti (davet gönderildi, eğitim kuruldu …)
export type FiredNudge = { id: string; type: NudgeType; firedAt: string; opened: boolean; achieved: boolean; ref?: string | null };

export type NudgeInput = {
  now: string;
  userId: string;
  isOwner: boolean;
  signedUpAt: string | null;
  // uzmanın gönderdiği bütün davetler (hiç yoksa "hiç davet göndermedi")
  invites: { id: string; sentAt: string; expiresAt: string; acceptedAt: string | null; open: boolean }[];
  // mine: false → eğitim hatırlatması bu uzmana düşmez (sorumlusu başkası); "danışanı var mı" sayımına yine girer
  clients: { id: string; linkedAt: string; hasTraining: boolean; drafts: { id: string; since: string }[]; mine?: boolean }[];
  trialEndsAt: string | null;
  purchased: boolean;
  history: FiredNudge[];
  enabled: boolean;                 // Ayarlar › "Hatırlatmalar ve ipuçları"
  appOpenedAt?: string | null;      // uygulamanın son açılışı (açıkken hesaplanıyorsa = now)
  pausedUntil?: string | null;      // durma kuralının önceki sonucu
};
export type NudgePlan = {
  nudges: PlannedNudge[];
  pauseUntil: string | null;        // saklanacak değer (değişmediyse girdideki)
  pauseStarted: boolean;            // bu hesapta yeni bir 14 günlük ara başladı
  holdout: boolean;
};

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const HORIZON_DAYS = 21;            // daha ilerisi planlanmaz; sonraki açılışta yeniden bakılır
const FRESH_DAYS = 14;              // bayatlamış durum için hatırlatma başlatılmaz (bayrak açılınca eski hesaplar bildirim yağmuru almasın)
const SIGNUP_DAYS = 30;
const CAPPED: NudgeType[] = ['invite_none', 'invite_expiring', 'training_none', 'training_draft'];
const ORDER: NudgeType[] = ['training_none', 'training_draft', 'invite_none'];

export const NUDGE_TEXT = {
  invite_none: 'İlk aileni davet etmeye hazır mısın? Ebeveynin e-postasını yazman yeterli; daveti biz göndeririz.',
  invite_expiring: 'Gönderdiğin davetin süresi yarın doluyor. İstersen yeniden gönderebilirsin.',
  invite_expiring_today: 'Gönderdiğin davetin süresi bugün doluyor. İstersen yeniden gönderebilirsin.',
  training_none: 'Yeni bir aile bağlandı. İlk eğitimi oluşturmak ister misin?',
  training_draft: 'Taslakta bekleyen bir eğitimin var. Etkin yaptığında ebeveyn görmeye başlar.',
  trial_ending: (days: number) => `Denemen ${days} gün sonra bitiyor. Paketleri iPhone ya da iPad'deki uygulamadan görebilirsin.`,
};

// Karşılaştırma grubu: kullanıcıların sabit %10'u (kimliğin FNV-1a özeti) deneme bitişi dışında hatırlatma almaz
export function inHoldout(userId: string): boolean {
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) { h ^= userId.charCodeAt(i); h = Math.imul(h, 0x01000193); }
  return (h >>> 0) % 10 === 0;
}

const isWorkday = (day: string) => weekdayOf(day) <= 5;
const at = (day: string, hhmm: string) => Date.parse(trToIso(day, hhmm));
const iso = (ms: number) => new Date(ms).toISOString();
const dayOf = (ms: number) => trDay(iso(ms));
const daysBetween = (a: string, b: string) => Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / DAY);
const isCapped = (t: NudgeType) => CAPPED.includes(t);

export function planNudges(input: NudgeInput): NudgePlan {
  const now = Date.parse(input.now);
  const openDay = input.appOpenedAt ? trDay(input.appOpenedAt) : null;
  const fired = input.history;
  const firedAt = (id: string) => { const h = fired.find((x) => x.id === id); return h ? Date.parse(h.firedAt) : null; };
  const has = (id: string) => firedAt(id) !== null;
  const holdout = inHoldout(input.userId);
  const out: PlannedNudge[] = [];

  /* Deneme bitişi: hesap bilgisi. Tek hatırlatma, bitişten 3 gün önce 10:00; hafta sonuna denk gelirse önceki cuma.
     Sınırlara, anahtara, karşılaştırma grubuna ve "bugün açıldı" kuralına bağlı değildir. Gün sayısı gerçek farktır
     (cumaya çekilince 4 ya da 5), "3 gün" diye yanlış söylenmez. */
  let trialDay: string | null = null;
  if (input.isOwner && !input.purchased && input.trialEndsAt && !has(`${NUDGE_PREFIX}trial_ending`)) {
    const endDay = trDay(input.trialEndsAt);
    let day = addDays(endDay, -3);
    const wd = weekdayOf(day);
    if (wd > 5) day = addDays(day, 5 - wd);
    const t = at(day, NUDGE_TIME);
    if (t > now) {
      trialDay = day;
      out.push({ id: `${NUDGE_PREFIX}trial_ending`, type: 'trial_ending', fireAt: iso(t), title: NUDGE_TITLE, body: NUDGE_TEXT.trial_ending(daysBetween(day, endDay)), ref: null });
    }
  }

  /* Durma kuralı: son üç hatırlatmaya dokunulmadı ve 24 saat içinde amaçları da gerçekleşmediyse 14 gün hiçbir şey planlanmaz.
     Önceki aradan önce gönderilenler yeniden sayılmaz. */
  let pausedUntil = input.pausedUntil ? Date.parse(input.pausedUntil) : 0;
  let pauseStarted = false;
  const counted = fired.filter((h) => isCapped(h.type) && Date.parse(h.firedAt) > pausedUntil)
    .sort((a, b) => a.firedAt.localeCompare(b.firedAt)).slice(-3);
  if (counted.length === 3 && counted.every((h) => !h.opened && !h.achieved && now - Date.parse(h.firedAt) >= DAY)) {
    pausedUntil = Date.parse(counted[2].firedAt) + 14 * DAY;
    pauseStarted = pausedUntil > now;
  }
  const done = (): NudgePlan => ({
    nudges: out.sort((a, b) => a.fireAt.localeCompare(b.fireAt)), pauseUntil: pausedUntil ? iso(pausedUntil) : null, pauseStarted, holdout,
  });
  if (!input.enabled || holdout || pausedUntil > now) return done();

  /* Sınırlar (deneme bitişi dışındakilerin hepsi birlikte): yalnız hafta içi 08:30–19:00; günde en çok 1, kayan 7 günde en çok 2;
     aynı tür 7 gün içinde yeniden yok (sınırlı diziler hariç); uygulamanın açıldığı gün hatırlatma yok. */
  const taken = fired.filter((h) => isCapped(h.type)).map((h) => ({ t: Date.parse(h.firedAt), type: h.type }));
  const START = hhmmToMin(WORK_START), END = hhmmToMin(WORK_END);
  const weeklyOk = (t: number) => {
    const all = [...taken.map((x) => x.t), t];
    return all.every((u) => all.filter((v) => v <= u && v > u - 7 * DAY).length <= 2);
  };
  const free = (t: number, type: NudgeType, sequence?: boolean) => {
    const day = dayOf(t), min = trMinutes(iso(t));
    if (t <= now || !isWorkday(day) || min < START || min > END) return false;
    if (openDay && day <= openDay) return false;
    if (day === trialDay) return false;                       // deneme hatırlatmasının günü ona kalır
    if (taken.some((x) => dayOf(x.t) === day)) return false;
    if (!sequence && taken.some((x) => x.type === type && Math.abs(x.t - t) < 7 * DAY)) return false;
    return weeklyOk(t);
  };
  const put = (t: number, type: NudgeType, id: string, body: string, ref: string | null) => {
    taken.push({ t, type });
    out.push({ id, type, fireAt: iso(t), title: NUDGE_TITLE, body, ref });
  };
  // "sonraki iş günü 10:00": `earliest`ten sonraki ilk uygun gün; `latest`i aşarsa planlanmaz
  const daily = (earliest: number, type: NudgeType, id: string, body: string, ref: string | null, opt: { sequence?: boolean; latest?: number } = {}) => {
    const from = Math.max(earliest, now);
    let day = dayOf(from);
    for (let i = 0; i <= HORIZON_DAYS; i++, day = addDays(day, 1)) {
      const t = at(day, NUDGE_TIME);
      if (t < from) continue;
      if (t > now + HORIZON_DAYS * DAY || (opt.latest && t > opt.latest)) return null;
      if (free(t, type, opt.sequence)) { put(t, type, id, body, ref); return t; }
    }
    return null;
  };

  /* Süresi dolan davet: davet başına bir kez. Önce son günden önceki iş günü (sona 24 saat kala, çalışma saatine çekilir: "yarın");
     olmuyorsa son günün sabahı 08:30 (mümkünse en az 2 saat önce: "bugün"). İkisi de olmuyorsa gönderilmez
     (süresi dolunca sunucunun kendi bildirimi zaten gelir). Zamana bağlı olduğu için önce yerleştirilir. */
  const openInvites = input.invites.filter((i) => i.open && !i.acceptedAt).sort((a, b) => a.expiresAt.localeCompare(b.expiresAt));
  for (const inv of openInvites) {
    const id = `${NUDGE_PREFIX}invite_expiring.${inv.id}`;
    const exp = Date.parse(inv.expiresAt);
    if (has(id) || exp <= now) continue;
    const expDay = trDay(inv.expiresAt), prev = addDays(expDay, -1);
    const before = Math.min(Math.max(exp - DAY, at(prev, WORK_START)), at(prev, WORK_END));
    const morning = at(expDay, WORK_START);
    if (free(before, 'invite_expiring')) put(before, 'invite_expiring', id, NUDGE_TEXT.invite_expiring, inv.id);
    else if (morning < exp && free(morning, 'invite_expiring')) put(morning, 'invite_expiring', id, NUDGE_TEXT.invite_expiring_today, inv.id);
  }

  /* İlk davet: kayıttan 24 saat sonra hâlâ davet ve danışan yoksa sonraki iş günü 10:00; ikinci ve son hatırlatma 5. gün
     (sınırlı dizi: 7 günlük aynı tür arası uygulanmaz). */
  const signup = input.signedUpAt ? Date.parse(input.signedUpAt) : null;
  if (signup !== null && input.invites.length === 0 && input.clients.length === 0 && now - signup <= SIGNUP_DAYS * DAY) {
    const id1 = `${NUDGE_PREFIX}invite_none.1`, id2 = `${NUDGE_PREFIX}invite_none.2`;
    const first = firedAt(id1) ?? daily(signup + DAY, 'invite_none', id1, NUDGE_TEXT.invite_none, null, { sequence: true });
    if (first !== null && !has(id2)) {
      const day5 = at(addDays(trDay(input.signedUpAt as string), 5), NUDGE_TIME);
      daily(Math.max(day5, first + 2 * DAY), 'invite_none', id2, NUDGE_TEXT.invite_none, null, { sequence: true });
    }
  }

  /* Eğitim: aile bağlanalı 48 saat olmuş ve hiç eğitim yoksa (danışan başına bir kez); taslakta 72 saat bekleyen eğitim
     (eğitim başına bir kez). Sonraki iş günü 10:00. */
  const wait: { earliest: number; type: NudgeType; id: string; body: string; ref: string }[] = [];
  for (const c of input.clients) {
    if (c.mine === false) continue;
    if (!c.hasTraining) {
      wait.push({ earliest: Date.parse(c.linkedAt) + 48 * HOUR, type: 'training_none', id: `${NUDGE_PREFIX}training_none.${c.id}`, body: NUDGE_TEXT.training_none, ref: c.id });
    }
    for (const d of c.drafts) {
      wait.push({ earliest: Date.parse(d.since) + 72 * HOUR, type: 'training_draft', id: `${NUDGE_PREFIX}training_draft.${d.id}`, body: NUDGE_TEXT.training_draft, ref: c.id });
    }
  }
  wait.filter((w) => !has(w.id) && w.earliest >= now - FRESH_DAYS * DAY)
    .sort((a, b) => a.earliest - b.earliest || ORDER.indexOf(a.type) - ORDER.indexOf(b.type) || a.id.localeCompare(b.id))
    .forEach((w) => { daily(w.earliest, w.type, w.id, w.body, w.ref, { latest: w.earliest + FRESH_DAYS * DAY }); });

  return done();
}
