// Yaşam döngüsü hatırlatmaları: hakem (src/lib/nudgeCore.ts). Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { planNudges, inHoldout, NUDGE_TITLE, NUDGE_TEXT, NUDGE_PREFIX } from '../src/lib/nudgeCore.ts';
import { trToIso, trDay, trTime, weekdayOf } from '../src/lib/sessionCore.ts';

const tr = (day, hhmm) => trToIso(day, hhmm);
const DAY = 86400e3;
const pick = (want) => { for (let i = 0; ; i++) if (inHoldout(`kullanici-${i}`) === want) return `kullanici-${i}`; };
const USER = pick(false), HOLD = pick(true);
// 18 Kasım 2026 Çarşamba 12:00 (Türkiye saati); uygulama o an açık
const NOW = tr('2026-11-18', '12:00');
const base = (p = {}) => ({
  now: NOW, userId: USER, isOwner: true, signedUpAt: null, invites: [], clients: [], trialEndsAt: null, purchased: true,
  history: [], enabled: true, appOpenedAt: p.now ?? NOW, pausedUntil: null, ...p,
});
const when = (plan) => plan.nudges.map((n) => `${n.type} ${trDay(n.fireAt)} ${trTime(n.fireAt)}`);
const invite = (id, expDay, expTime, p = {}) => ({ id, sentAt: tr('2026-11-17', '10:00'), expiresAt: tr(expDay, expTime), acceptedAt: null, open: true, ...p });
const client = (id, linkedDay, p = {}) => ({ id, linkedAt: tr(linkedDay, '10:00'), hasTraining: false, drafts: [], ...p });
const fired = (type, day, p = {}) => ({ id: `${NUDGE_PREFIX}${type}.${day}`, type, firedAt: tr(day, '10:00'), opened: false, achieved: false, ...p });
// Sınırların genel denetimi: hafta içi 08:30–19:00, günde 1, kayan 7 günde 2, aynı tür en az 7 gün arayla (ilk davet dizisi hariç)
function assertLimits(plan, history = []) {
  const all = [...history.filter((h) => h.type !== 'trial_ending').map((h) => ({ type: h.type, t: Date.parse(h.firedAt) })),
    ...plan.nudges.filter((n) => n.type !== 'trial_ending').map((n) => ({ type: n.type, t: Date.parse(n.fireAt), planned: true, iso: n.fireAt }))];
  for (const a of all) {
    if (a.planned) {
      assert.ok(weekdayOf(trDay(a.iso)) <= 5, `hafta sonu: ${a.iso}`);
      assert.ok(trTime(a.iso) >= '08:30' && trTime(a.iso) <= '19:00', `saat dışı: ${a.iso}`);
    }
    assert.ok(all.filter((b) => b.t <= a.t && b.t > a.t - 7 * DAY).length <= 2, '7 günde ikiden fazla');
    for (const b of all) {
      if (a === b) continue;
      assert.notEqual(trDay(new Date(a.t).toISOString()), trDay(new Date(b.t).toISOString()), 'aynı gün iki hatırlatma');
      if (a.type === b.type && a.type !== 'invite_none') assert.ok(Math.abs(a.t - b.t) >= 7 * DAY, `aynı tür 7 günden sık: ${a.type}`);
    }
  }
}

test('karşılaştırma grubu: sabit, yaklaşık %10; yalnız deneme bitişi hatırlatması alır', () => {
  assert.equal(inHoldout(HOLD), true);
  assert.equal(inHoldout(HOLD), inHoldout(HOLD), 'aynı kimlik hep aynı grupta');
  const n = Array.from({ length: 4000 }, (_, i) => `3f2a${i.toString(16).padStart(4, '0')}-9c1b-4d7e-8a11-0000${i}`).filter(inHoldout).length;
  assert.ok(n > 280 && n < 520, `%10 civarı bekleniyor: ${n} / 4000`);
  const p = planNudges(base({ userId: HOLD, signedUpAt: tr('2026-11-16', '09:00'), trialEndsAt: tr('2026-11-30', '09:00'), purchased: false,
    clients: [client('c1', '2026-11-14')], invites: [invite('i1', '2026-11-20', '14:00')] }));
  assert.equal(p.holdout, true);
  assert.deepEqual(when(p), ['trial_ending 2026-11-27 10:00']);
  assert.equal(planNudges(base()).holdout, false);
});

test('ilk davet: kayıttan 24 saat sonra, sonraki iş günü 10:00; ikinci ve son hatırlatma 5. gün; hafta sonu pazartesiye kayar', () => {
  // Pazartesi 09:00 kayıt → Salı 10:00; 5. gün Cumartesi → Pazartesi
  let now = tr('2026-11-16', '09:00');
  let p = planNudges(base({ now, signedUpAt: now }));
  assert.deepEqual(when(p), ['invite_none 2026-11-17 10:00', 'invite_none 2026-11-23 10:00']);
  assert.deepEqual(p.nudges.map((n) => n.id), ['nudge.invite_none.1', 'nudge.invite_none.2']);
  // Cuma 15:00 kayıt → 24 saat sonrası Cumartesi → Pazartesi 10:00; 5. gün Çarşamba
  now = tr('2026-11-20', '15:00');
  p = planNudges(base({ now, signedUpAt: now }));
  assert.deepEqual(when(p), ['invite_none 2026-11-23 10:00', 'invite_none 2026-11-25 10:00']);
  assertLimits(p);
  // ilki gönderildiyse yalnız ikincisi; ikisi de gönderildiyse hiç
  const h1 = { id: 'nudge.invite_none.1', type: 'invite_none', firedAt: tr('2026-11-17', '10:00'), opened: true, achieved: false };
  now = tr('2026-11-18', '12:00');
  p = planNudges(base({ now, signedUpAt: tr('2026-11-16', '09:00'), history: [h1] }));
  assert.deepEqual(when(p), ['invite_none 2026-11-23 10:00']);
  p = planNudges(base({ now, signedUpAt: tr('2026-11-16', '09:00'), history: [h1, { ...h1, id: 'nudge.invite_none.2', firedAt: tr('2026-11-23', '10:00') }] }));
  assert.deepEqual(when(p), []);
  // davet gönderildiyse ya da danışan varsa yok; kayıt bilinmiyorsa yok; 30 günden eski hesapta başlatılmaz
  assert.deepEqual(when(planNudges(base({ signedUpAt: tr('2026-11-16', '09:00'), invites: [invite('i1', '2026-11-20', '14:00', { open: false })] }))), []);
  assert.deepEqual(when(planNudges(base({ signedUpAt: tr('2026-11-16', '09:00'), clients: [client('c1', '2026-11-17', { hasTraining: true })] }))), []);
  assert.deepEqual(when(planNudges(base({ signedUpAt: null }))), []);
  assert.deepEqual(when(planNudges(base({ signedUpAt: tr('2026-09-01', '09:00') }))), []);
});

test('süresi dolan davet: davet başına bir kez, çalışma saatinde, mümkünse en az 2 saat önce', () => {
  const one = (inv, p = {}) => planNudges(base({ invites: [inv], ...p }));
  // Cuma 14:00'te doluyor → Perşembe 14:00 ("yarın")
  let p = one(invite('A1B2C3', '2026-11-20', '14:00'));
  assert.deepEqual(when(p), ['invite_expiring 2026-11-19 14:00']);
  assert.equal(p.nudges[0].body, NUDGE_TEXT.invite_expiring);
  assert.equal(p.nudges[0].id, 'nudge.invite_expiring.A1B2C3');
  assert.equal(p.nudges[0].ref, 'A1B2C3');
  // Salı 22:00'de doluyor → 24 saat öncesi mesai dışında → Pazartesi 19:00; Salı 06:00 → Pazartesi 08:30
  assert.deepEqual(when(one(invite('i', '2026-11-24', '22:00'))), ['invite_expiring 2026-11-23 19:00']);
  assert.deepEqual(when(one(invite('i', '2026-11-24', '06:00'))), ['invite_expiring 2026-11-23 08:30']);
  // Pazartesi 12:00'de doluyor → önceki gün Pazar → Pazartesi sabahı 08:30 ("bugün")
  p = one(invite('i', '2026-11-23', '12:00'));
  assert.deepEqual(when(p), ['invite_expiring 2026-11-23 08:30']);
  assert.equal(p.nudges[0].body, NUDGE_TEXT.invite_expiring_today);
  // 2 saat kalmıyorsa yine de süre dolmadan (mümkünse kuralı); Pazar günü dolan davet için hiç yok
  assert.deepEqual(when(one(invite('i', '2026-11-23', '09:00'))), ['invite_expiring 2026-11-23 08:30']);
  assert.deepEqual(when(one(invite('i', '2026-11-22', '14:00'))), []);
  // kabul edilmiş / kapanmış / süresi geçmiş / daha önce hatırlatılmış davet
  assert.deepEqual(when(one(invite('i', '2026-11-20', '14:00', { acceptedAt: NOW }))), []);
  assert.deepEqual(when(one(invite('i', '2026-11-20', '14:00', { open: false }))), []);
  assert.deepEqual(when(one(invite('i', '2026-11-18', '11:00'))), []);
  assert.deepEqual(when(one(invite('i', '2026-11-20', '14:00'), { history: [{ id: 'nudge.invite_expiring.i', type: 'invite_expiring', firedAt: tr('2026-11-10', '10:00'), opened: true, achieved: false }] })), []);
  // hatırlatma günü uygulama açıldıysa (bugün Perşembe) o güne konmaz; son gün sabahına kayar
  const thu = tr('2026-11-19', '09:00');
  assert.deepEqual(when(one(invite('i', '2026-11-20', '14:00'), { now: thu })), ['invite_expiring 2026-11-20 08:30']);
});

test('eğitim: aile 48 saattir bağlı ve eğitim yok; taslakta 72 saat bekleyen eğitim', () => {
  // Pazartesi 10:00 bağlandı → 48 saat: Çarşamba 10:00; şimdi Çarşamba 12:00 ve uygulama açık → Perşembe 10:00
  let p = planNudges(base({ clients: [client('L1', '2026-11-16')] }));
  assert.deepEqual(when(p), ['training_none 2026-11-19 10:00']);
  assert.equal(p.nudges[0].ref, 'L1');
  // 48 saat dolmadan önce de ileri tarihe planlanır (uygulama bir daha açılmasa da gelsin): Salı 10:00 bağlandı → Perşembe 10:00
  assert.deepEqual(when(planNudges(base({ clients: [client('L1', '2026-11-17')] }))), ['training_none 2026-11-19 10:00']);
  // Perşembe 15:00 bağlandı → 48 saat: Cumartesi → Pazartesi 10:00
  const now = tr('2026-11-12', '16:00');
  assert.deepEqual(when(planNudges(base({ now, clients: [{ ...client('L1', '2026-11-12'), linkedAt: tr('2026-11-12', '15:00') }] }))), ['training_none 2026-11-16 10:00']);
  // eğitimi varsa yok; taslak 72 saat: Pazar 10:00'dan beri taslak → Çarşamba 10:00 → (bugün açık) Perşembe 10:00
  p = planNudges(base({ clients: [client('L1', '2026-11-10', { hasTraining: true, drafts: [{ id: 'T9', since: tr('2026-11-15', '10:00') }] })] }));
  assert.deepEqual(when(p), ['training_draft 2026-11-19 10:00']);
  assert.equal(p.nudges[0].id, 'nudge.training_draft.T9');
  assert.equal(p.nudges[0].ref, 'L1', 'dokununca o danışan açılır');
  // sorumlusu başka uzman olan danışan ve bayatlamış durum (14 günden eski) için başlatılmaz; bir kez gönderilen yinelenmez
  assert.deepEqual(when(planNudges(base({ clients: [client('L1', '2026-11-16', { mine: false })] }))), []);
  assert.deepEqual(when(planNudges(base({ clients: [client('L1', '2026-10-01')] }))), []);
  assert.deepEqual(when(planNudges(base({ clients: [client('L1', '2026-11-16')], history: [{ id: 'nudge.training_none.L1', type: 'training_none', firedAt: tr('2026-11-17', '10:00'), opened: true, achieved: false }] }))), []);
});

test('sınırlar: günde en çok 1, kayan 7 günde en çok 2, aynı tür 7 gün içinde yeniden yok', () => {
  // üç yeni danışan + bir taslak: Per eğitim yok (L1) · Cum taslak · sonraki Per eğitim yok (L2); L3 14 gün içinde sığmaz
  const clients = [client('L1', '2026-11-14'), client('L2', '2026-11-14'), client('L3', '2026-11-14'),
    client('L4', '2026-11-01', { hasTraining: true, drafts: [{ id: 'T1', since: tr('2026-11-14', '10:00') }] })];
  let p = planNudges(base({ clients }));
  assert.deepEqual(when(p), ['training_none 2026-11-19 10:00', 'training_draft 2026-11-20 10:00', 'training_none 2026-11-26 10:00']);
  assertLimits(p);
  // geçmişte son 7 günde iki hatırlatma varsa üçüncüsü pencere boşalınca: Pzt + Sal gönderildi → sonraki Pzt
  let history = [fired('invite_expiring', '2026-11-16', { opened: true }), fired('training_draft', '2026-11-17', { opened: true })];
  p = planNudges(base({ clients: [client('L1', '2026-11-14')], history }));
  assert.deepEqual(when(p), ['training_none 2026-11-23 10:00']);
  assertLimits(p, history);
  // aynı tür: Pazartesi "eğitim yok" gönderildi → yeni danışan için en erken sonraki Pazartesi
  history = [fired('training_none', '2026-11-16', { opened: true })];
  p = planNudges(base({ clients: [client('L2', '2026-11-15')], history }));
  assert.deepEqual(when(p), ['training_none 2026-11-23 10:00']);
  assertLimits(p, history);
  // süresi dolan davet öncelikli: aynı güne denk gelen eğitim hatırlatması sonraki iş gününe
  p = planNudges(base({ clients: [client('L1', '2026-11-14')], invites: [invite('i', '2026-11-20', '14:00')] }));
  assert.deepEqual(when(p), ['invite_expiring 2026-11-19 14:00', 'training_none 2026-11-20 10:00']);
  assertLimits(p);
  // aynı hafta süresi dolan ikinci davet: aynı tür 7 gün kuralına takılır, gönderilmez
  p = planNudges(base({ invites: [invite('a', '2026-11-20', '14:00'), invite('b', '2026-11-24', '14:00')] }));
  assert.deepEqual(when(p), ['invite_expiring 2026-11-19 14:00']);
});

test('durma kuralı: son üç hatırlatma açılmadı ve amacı gerçekleşmediyse 14 gün hiçbir şey planlanmaz', () => {
  const ignored = [fired('training_none', '2026-11-03'), fired('training_draft', '2026-11-05'), fired('training_none', '2026-11-10')];
  const clients = [client('L1', '2026-11-16')];
  let p = planNudges(base({ clients, history: ignored, trialEndsAt: tr('2026-12-04', '09:00'), purchased: false }));
  assert.deepEqual(when(p), ['trial_ending 2026-12-01 10:00'], 'deneme bitişi durma kuralına bağlı değil');
  assert.equal(p.pauseStarted, true);
  assert.equal(p.pauseUntil, tr('2026-11-24', '10:00'));
  // ara sürerken yeniden hesap: hâlâ yok, "yeni başladı" denmez
  p = planNudges(base({ clients, history: ignored, pausedUntil: tr('2026-11-24', '10:00') }));
  assert.deepEqual(when(p), []);
  assert.equal(p.pauseStarted, false);
  // ara bitince eski üçlü yeniden sayılmaz
  const later = tr('2026-11-25', '09:00');
  p = planNudges(base({ now: later, clients: [client('L2', '2026-11-23')], history: ignored, pausedUntil: tr('2026-11-24', '10:00') }));
  assert.deepEqual(when(p), ['training_none 2026-11-26 10:00']);
  assert.equal(p.pauseStarted, false);
  // biri açıldıysa ya da amacı gerçekleştiyse ara yok
  for (const fix of [{ opened: true }, { achieved: true }]) {
    p = planNudges(base({ clients, history: [ignored[0], { ...ignored[1], ...fix }, ignored[2]] }));
    assert.deepEqual(when(p), ['training_none 2026-11-19 10:00']);
    assert.equal(p.pauseUntil, null);
  }
  // sonuncusu 24 saatten yeniyse henüz "yok sayıldı" denmez
  p = planNudges(base({ clients: [], history: [ignored[0], ignored[1], fired('training_none', '2026-11-18')] }));
  assert.equal(p.pauseStarted, false);
  // deneme bitişi hatırlatması üçlüye sayılmaz
  p = planNudges(base({ clients, history: [ignored[0], ignored[1], { ...fired('trial_ending', '2026-11-10'), id: 'nudge.trial_ending' }] }));
  assert.equal(p.pauseStarted, false);
});

test('deneme bitişi: bitişten 3 gün önce 10:00, hafta sonuysa önceki cuma; sınırlara, anahtara ve "bugün açıldı"ya bağlı değil', () => {
  const trial = (endDay, p = {}) => planNudges(base({ trialEndsAt: tr(endDay, '14:00'), purchased: false, ...p }));
  // Cuma bitiyor → Salı; Salı bitiyor → 3 gün öncesi Cumartesi → Cuma (4 gün önce, metin de öyle der); Pazartesi → Cuma
  let p = trial('2026-12-04');
  assert.deepEqual(when(p), ['trial_ending 2026-12-01 10:00']);
  assert.equal(p.nudges[0].body, 'Denemen 3 gün sonra bitiyor. Paketleri iPhone ya da iPad\'deki uygulamadan görebilirsin.');
  assert.equal(p.nudges[0].id, 'nudge.trial_ending');
  p = trial('2026-12-01');
  assert.deepEqual(when(p), ['trial_ending 2026-11-27 10:00']);
  assert.match(p.nudges[0].body, /^Denemen 4 gün sonra bitiyor\./);
  assert.deepEqual(when(trial('2026-11-30')), ['trial_ending 2026-11-27 10:00']);
  // anahtar kapalı, son 7 günde iki hatırlatma var ve uygulama bugün (Cuma 08:00) açıldı: yine de bugün 10:00
  const now = tr('2026-11-27', '08:00');
  const history = [fired('training_none', '2026-11-25', { opened: true }), fired('training_draft', '2026-11-26', { opened: true })];
  p = trial('2026-12-01', { now, enabled: false, history, clients: [client('L1', '2026-11-24')] });
  assert.deepEqual(when(p), ['trial_ending 2026-11-27 10:00']);
  // öteki hatırlatma deneme hatırlatmasının gününe konmaz ve o günü sınırdan düşmez
  p = planNudges(base({ now: tr('2026-11-26', '12:00'), trialEndsAt: tr('2026-12-01', '14:00'), purchased: false, clients: [client('L1', '2026-11-24')] }));
  assert.deepEqual(when(p), ['trial_ending 2026-11-27 10:00', 'training_none 2026-11-30 10:00']);
  // tam olarak bir kez; sahip değilse, satın aldıysa, zamanı geçtiyse yok
  assert.deepEqual(when(trial('2026-12-04', { history: [{ id: 'nudge.trial_ending', type: 'trial_ending', firedAt: tr('2026-11-17', '10:00'), opened: false, achieved: false }] })), []);
  assert.deepEqual(when(trial('2026-12-04', { isOwner: false })), []);
  assert.deepEqual(when(trial('2026-12-04', { purchased: true })), []);
  assert.deepEqual(when(trial('2026-11-20')), [], '3 gün öncesi geçtiyse "3 gün sonra" denmez');
});

test('uygulama o gün açıldıysa o güne hatırlatma kalmaz (açılışta yeniden hesaplanır)', () => {
  const signedUpAt = tr('2026-11-13', '09:00');   // Cuma
  // Pazartesi 07:00, uygulama en son Cuma açıldı: bugün 10:00 planlı
  let p = planNudges(base({ now: tr('2026-11-16', '07:00'), appOpenedAt: signedUpAt, signedUpAt }));
  assert.equal(when(p)[0], 'invite_none 2026-11-16 10:00');
  // Pazartesi 09:00'da uygulama açıldı: bugünkü düşer, sonraki iş gününe geçer
  const open = tr('2026-11-16', '09:00');
  p = planNudges(base({ now: open, appOpenedAt: open, signedUpAt }));
  assert.equal(when(p)[0], 'invite_none 2026-11-17 10:00');
  assert.ok(p.nudges.every((n) => trDay(n.fireAt) > trDay(open)));
});

test('anahtar kapalıysa yalnız deneme bitişi; metinlerde ad yok, başlık Moyo Mercek, kimlikler "nudge." ile başlar', () => {
  const full = { signedUpAt: tr('2026-11-16', '09:00'), trialEndsAt: tr('2026-12-04', '09:00'), purchased: false,
    clients: [client('Deniz-L1', '2026-11-14', { drafts: [{ id: 'T1', since: tr('2026-11-14', '10:00') }] })], invites: [invite('i1', '2026-11-20', '14:00')] };
  assert.deepEqual(when(planNudges(base({ ...full, enabled: false }))), ['trial_ending 2026-12-01 10:00']);
  const p = planNudges(base(full));
  assert.ok(p.nudges.length >= 3);
  for (const n of p.nudges) {
    assert.equal(n.title, NUDGE_TITLE);
    assert.equal(n.title, 'Moyo Mercek');
    assert.ok(n.id.startsWith('nudge.'));
    assert.ok(!/Deniz/.test(n.title + n.body), 'metinde danışan adı / kimliği yok');
    assert.ok(Date.parse(n.fireAt) > Date.parse(NOW));
  }
  assertLimits(p);
});
