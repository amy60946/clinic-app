import { useCallback, useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Client, ClinicianMe } from './clinic';
import { billingStatus, hasAccess } from './billing';
import { listInvites, type FamilyInvite } from './invites';
import { loadTrainingsFor, type Training } from './training';
import { planNudges, NUDGE_PREFIX, type FiredNudge, type NudgeInput, type PlannedNudge } from './nudgeCore';
import { nudgeDeviceOn, nudgePermission, requestNudgePermission, replaceNudges, type NudgePermission } from './nudgeDevice';
import { nudgeSignal, onNudgeSignal } from './nudgeSignal';
import { registerForPush } from './notifications';
import { track } from './track';

// Yaşam döngüsü hatırlatmaları: eşitleyici (uzaktan ayar bayrağı `lifecycle_nudges`; docs/arastirma/bildirim-benchmark.md 4–5).
// Faz 1: sunucu yok. Uygulama ön plana gelince ve ilgili işlerden sonra (davet, eğitim, satın alma) uzmanın durumu
// nudgeCore.planNudges'a verilir; cihazdaki "nudge." ile başlayan yerel bildirimler silinip plan yeniden kurulur.
// Geçmiş (ne zaman gönderildi, dokunuldu mu, amacı gerçekleşti mi) kullanıcı başına bu cihazda tutulur.
// Yalnız bayrak açık + iPhone/iPad + bildirim izni varken çalışır; web'de hiçbir şey planlanmaz.
// Bilinen sınır (sunucusuz): uygulama hiç açılmazsa durum değişse de planlı hatırlatma gelir (ör. aile daveti kabul etti).
export { NUDGES_FLAG } from './nudgeCore';
export { nudgeDeviceOn } from './nudgeDevice';
export type { NudgePermission } from './nudgeDevice';

const DAY = 86400e3;
type Stored = { scheduled: PlannedNudge[]; history: FiredNudge[]; pausedUntil: string | null; holdoutLogged?: boolean };
const KEY = (uid: string) => `clinic.nudge.v1.${uid}`;
const ON_KEY = (uid: string) => `clinic.nudge.on.v1.${uid}`;           // "Hatırlatmalar ve ipuçları" ('0' = kapalı; yoksa açık)
const PRIMER_KEY = (uid: string) => `clinic.nudge.primer.v1.${uid}`;   // izin açıklaması yanıtlandı (yeniden yalnız Ayarlar'dan)

async function read(uid: string): Promise<Stored> {
  const empty: Stored = { scheduled: [], history: [], pausedUntil: null };
  try { const v = await AsyncStorage.getItem(KEY(uid)); return v ? { ...empty, ...JSON.parse(v) } : empty; } catch { return empty; }
}
const write = (uid: string, st: Stored) => AsyncStorage.setItem(KEY(uid), JSON.stringify(st)).catch(() => {});

// Okuma-yazmalar sırayla (eşitleme ile "dokunuldu" işareti birbirini ezmesin)
let chain: Promise<unknown> = Promise.resolve();
function queued<T>(f: () => Promise<T>): Promise<T> {
  const p = chain.then(f, f);
  chain = p.catch(() => {});
  return p;
}

// Zamanı gelmiş planlı hatırlatma gönderilmiş sayılır (iptal edilmediyse cihaz göstermiştir)
function settle(st: Stored, now: number) {
  for (const n of st.scheduled) {
    if (Date.parse(n.fireAt) <= now && !st.history.some((h) => h.id === n.id)) {
      st.history.push({ id: n.id, type: n.type, ref: n.ref, firedAt: n.fireAt, opened: false, achieved: false });
    }
  }
  st.scheduled = st.scheduled.filter((n) => Date.parse(n.fireAt) > now);
}

// Hatırlatmanın amacı gönderildikten sonraki 24 saatte gerçekleşti mi (durma kuralı için)
function achieved(h: FiredNudge, invites: FamilyInvite[], trainings: Training[], now: number): boolean {
  const from = Date.parse(h.firedAt), to = from + DAY;
  const within = (iso?: string | null) => { const t = iso ? Date.parse(iso) : NaN; return t > from && t <= to; };
  if (h.type === 'invite_none') return invites.some((i) => within(i.created_at));
  if (h.type === 'invite_expiring') {
    return invites.some((i) => within(i.created_at) || (i.code === h.ref && (within(i.claimed_at) || within(i.used_at) || within(i.email_sent_at))));
  }
  if (h.type === 'training_none') return trainings.some((t) => t.link_id === h.ref && within(t.created_at));
  if (h.type === 'training_draft') {
    const id = h.id.slice(`${NUDGE_PREFIX}training_draft.`.length);
    return trainings.some((t) => t.id === id && t.status !== 'draft' && (t.updated_at ? within(t.updated_at) : now <= to));
  }
  return false;
}

export type NudgeBase = { me: ClinicianMe; signedUpAt: string | null; clients: Client[] };
// invites / trainings: ana ekranın belleğindeki güncel liste (verilirse sunucuya gidilmez); undefined → burada okunur; null → okunamadı
export type NudgeContext = NudgeBase & { invites?: FamilyInvite[] | null; trainings?: Training[] | null };

export function buildNudgeInput(ctx: NudgeBase, invites: FamilyInvite[] | null, trainings: Training[] | null,
  extra: Pick<NudgeInput, 'now' | 'history' | 'enabled' | 'pausedUntil'>): NudgeInput {
  const uid = ctx.me.id;
  const status = billingStatus(ctx.me);
  const byLink: Record<string, Training[]> = {};
  (trainings ?? []).forEach((t) => { (byLink[t.link_id] = byLink[t.link_id] ?? []).push(t); });
  return {
    ...extra, userId: uid, isOwner: ctx.me.role === 'owner', appOpenedAt: extra.now,
    // davetler okunamadıysa "hiç davet göndermedi" denemez: ilk davet hatırlatması kurulmaz
    signedUpAt: invites === null ? null : ctx.signedUpAt,
    invites: (invites ?? []).filter((i) => i.clinician_id === uid).map((i) => ({
      id: i.code, sentAt: i.created_at, expiresAt: i.expires_at, acceptedAt: i.claimed_at ?? i.used_at ?? null,
      open: i.status === 'sent' || i.status === 'opened',
    })),
    clients: ctx.clients.map((c) => {
      const ts = byLink[c.link_id] ?? [];
      return {
        id: c.link_id, linkedAt: c.consent_at, hasTraining: ts.length > 0,
        // eğitimler okunamadıysa ya da sorumlusu başka uzmansa eğitim hatırlatması kurulmaz
        mine: trainings !== null && (!c.clinician_id || c.clinician_id === uid || (c.assigned ?? []).includes(uid)),
        drafts: ts.filter((t) => t.status === 'draft').map((t) => ({ id: t.id, since: t.updated_at && t.updated_at > t.created_at ? t.updated_at : t.created_at })),
      };
    }),
    trialEndsAt: status === 'trial' ? ctx.me.trial_ends_at : null,
    purchased: status === 'active',
  };
}

const signature = (l: PlannedNudge[]) => l.map((n) => `${n.id}@${n.fireAt}`).sort().join('|');

async function reconcile(ctx: NudgeContext): Promise<void> {
  if (!nudgeDeviceOn) return;
  const uid = ctx.me.id;
  if ((await nudgePermission()) !== 'granted') return;
  const [invites, trainings] = await Promise.all([
    ctx.invites !== undefined ? ctx.invites : listInvites(90).catch(() => null),
    ctx.trainings !== undefined ? ctx.trainings : loadTrainingsFor(ctx.clients.map((c) => c.link_id)).catch(() => null),
  ]);
  const nowMs = Date.now();
  const st = await read(uid);
  settle(st, nowMs);
  const before = signature(st.scheduled);
  const mine = (invites ?? []).filter((i) => i.clinician_id === uid);
  st.history.forEach((h) => { if (!h.achieved) h.achieved = achieved(h, mine, trainings ?? [], nowMs); });
  st.history = st.history.filter((h) => nowMs - Date.parse(h.firedAt) < 180 * DAY);
  // üyeliği bitmiş hesapta (ödeme duvarı) hiçbir şey planlanmaz
  const plan = hasAccess(ctx.me)
    ? planNudges(buildNudgeInput(ctx, invites, trainings, {
      now: new Date(nowMs).toISOString(), history: st.history, enabled: await nudgesEnabled(uid), pausedUntil: st.pausedUntil,
    }))
    : { nudges: [], pauseUntil: st.pausedUntil, pauseStarted: false, holdout: false };
  await replaceNudges(plan.nudges, { clinic_id: ctx.me.clinic_id });
  st.scheduled = plan.nudges;
  st.pausedUntil = plan.pauseUntil;
  if (signature(plan.nudges) !== before) track('nudge.plan', { n: plan.nudges.length });
  if (plan.pauseStarted) track('nudge.pause');
  if (plan.holdout && !st.holdoutLogged) { st.holdoutLogged = true; track('nudge.holdout'); }
  await write(uid, st);
}
export const reconcileNudges = (ctx: NudgeContext) => queued(() => reconcile(ctx)).catch(() => {});

// Bayrak kapatıldı ya da çıkış yapıldı: bu cihazda planlı hatırlatma kalmaz (geçmiş durur)
export const clearNudges = (uid: string) => queued(async () => {
  if (!nudgeDeviceOn) return;
  const st = await read(uid);
  if (!st.scheduled.length) return;
  settle(st, Date.now());
  await replaceNudges([]);
  st.scheduled = [];
  await write(uid, st);
}).catch(() => {});

// Hatırlatmaya dokunuldu (durma kuralı "açıldı" sayar)
export const markNudgeOpened = (uid: string, id: string) => queued(async () => {
  const st = await read(uid);
  settle(st, Date.now());
  const h = st.history.find((x) => x.id === id);
  if (!h || h.opened) return;
  h.opened = true;
  await write(uid, st);
}).catch(() => {});

export async function nudgesEnabled(uid: string): Promise<boolean> {
  try { return (await AsyncStorage.getItem(ON_KEY(uid))) !== '0'; } catch { return true; }
}
export async function setNudgesEnabled(uid: string, on: boolean): Promise<void> {
  try { if (on) await AsyncStorage.removeItem(ON_KEY(uid)); else await AsyncStorage.setItem(ON_KEY(uid), '0'); } catch { /* depolama yoksa bu oturumluk */ }
  nudgeSignal();
}

/* İzin, yerinde (bildirim-benchmark M3): bayrak açıkken iOS izni girişte değil, uzman davet gönderdikten hemen sonra,
   ne gönderileceğini söyleyen kendi açıklamamızın ardından istenir. "Şimdi değil" denirse yeniden yalnız Ayarlar'dan. */
export async function primerDue(uid: string): Promise<boolean> {
  if (!nudgeDeviceOn) return false;
  try { if ((await AsyncStorage.getItem(PRIMER_KEY(uid))) === '1') return false; } catch { /* sorulmamış say */ }
  return (await nudgePermission()) === 'undetermined';
}
export const primerAnswered = (uid: string) => AsyncStorage.setItem(PRIMER_KEY(uid), '1').catch(() => {});
export const devicePermission = (): Promise<NudgePermission> => nudgePermission();
// iOS izin penceresi; izin verilirse cihaz anahtarı kaydedilir (sunucu bildirimleri) ve plan kurulur
export async function enableNotifications(): Promise<NudgePermission> {
  const s = await requestNudgePermission();
  if (s === 'granted') { registerForPush().catch(() => {}); nudgeSignal(); }
  return s;
}

// Ana ekran kancası. on: true açık · false kapalı (uzaktan ayar okundu) · null henüz bilinmiyor (hiçbir şey yapılmaz).
// Bellekteki listeler tazeyse sunucuya gidilmez; ön plana dönüşte ve bir iş sonrasında (nudgeSignal) taze okunur.
export function useNudges(on: boolean | null, base: NudgeBase | null, invites?: FamilyInvite[] | null, trainings?: Training[] | null) {
  const live = useRef({ base, invites, trainings, invAt: 0, trAt: 0, staleAt: 0 });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const uid = base?.me.id ?? null;
  live.current.base = base;
  useEffect(() => { live.current.invites = invites; live.current.invAt = Date.now(); }, [invites]);
  useEffect(() => { live.current.trainings = trainings; live.current.trAt = Date.now(); }, [trainings]);
  const kick = useCallback((stale: boolean) => {
    if (stale) live.current.staleAt = Date.now();
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      timer.current = null;
      const s = live.current;
      if (!s.base) return;
      reconcileNudges({ ...s.base, invites: s.invAt >= s.staleAt ? s.invites : undefined, trainings: s.trAt >= s.staleAt ? s.trainings : undefined });
    }, 1500);
  }, []);
  const me = base?.me;
  useEffect(() => {
    if (!nudgeDeviceOn || !uid || on === null) return;
    if (!on) { clearNudges(uid); return; }
    kick(false);
  }, [on, uid, base?.clients, me?.clinic_id, me?.status, me?.plan, me?.trial_ends_at, me?.access, invites, trainings, kick]);
  useEffect(() => {
    if (!nudgeDeviceOn || !on || !uid) return;
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') kick(true); });
    const off = onNudgeSignal(() => kick(true));
    return () => { sub.remove(); off(); if (timer.current) clearTimeout(timer.current); };
  }, [on, uid, kick]);
}
