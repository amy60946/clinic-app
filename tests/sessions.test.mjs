// Seans planlama yardımcıları (src/lib/sessionCore.ts). Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trDay, trTime, trToIso, layoutDay, canMarkDone, noteDue, attendance, weeklyCells, prepSummary, STATUS_META, outcomeOf, isOfferLeftover,
         freeStarts, seriesDates, matchClient, weekdayOf, mondayOfDay, sessionWhen } from '../src/lib/sessionCore.ts';

const S = (p = {}) => ({ id: 's', clinic_id: 'k', clinician_id: 'd1', link_id: 'L', title: null, series_id: null, starts_at: '2026-11-11T12:00:00.000Z',
  duration_min: 45, kind: 'individual', mode: 'in_person', room_id: null, status: 'planned', cancel_reason: null, visible_to_family: true,
  booked_by: 'clinic', family_response: null, family_note: null, family_responded_at: null, package_id: null, waitlist_id: null,
  offer_expires_at: null, external_uid: null, created_at: '', updated_at: '', ...p });

test('Türkiye saati: gün ve saat, geri çevirme', () => {
  assert.equal(trDay('2026-11-11T22:30:00Z'), '2026-11-12');
  assert.equal(trTime('2026-11-11T12:00:00Z'), '15:00');
  assert.equal(trToIso('2026-11-11', '15:00'), '2026-11-11T12:00:00.000Z');
  assert.equal(weekdayOf('2026-11-11'), 3);
  assert.equal(mondayOfDay('2026-11-15'), '2026-11-09');
  assert.equal(sessionWhen(S()), '11 Kas Çar · 15:00–15:45');
});

test('gün düzeni: çakışanlar yan yana, ayrık olan tek sütun', () => {
  const a = S({ id: 'a', starts_at: trToIso('2026-11-11', '10:00'), duration_min: 60 });
  const b = S({ id: 'b', starts_at: trToIso('2026-11-11', '10:30'), duration_min: 45 });
  const c = S({ id: 'c', starts_at: trToIso('2026-11-11', '13:00'), duration_min: 45 });
  const p = layoutDay([c, b, a], 9 * 60, 1);
  const by = Object.fromEntries(p.map((x) => [x.item.id, x]));
  assert.deepEqual([by.a.col, by.a.cols, by.b.col, by.b.cols, by.c.col, by.c.cols], [0, 2, 1, 2, 0, 1]);
  assert.equal(by.a.top, 60);
  assert.equal(by.c.top, 240);
});

test('işaretleme seans saatinden sonra; not bekleyenler', () => {
  const now = new Date('2026-11-11T08:00:00Z');
  assert.equal(canMarkDone('2026-11-11T12:00:00Z', now), false);
  assert.equal(canMarkDone('2026-11-11T08:20:00Z', now), true);   // en çok 30 dk önce
  assert.equal(canMarkDone('2026-11-10T12:00:00Z', now), true);
  const done = [S({ id: 'd1', status: 'done', starts_at: '2026-11-09T12:00:00Z' }), S({ id: 'd2', status: 'done', starts_at: '2026-11-10T12:00:00Z' }),
                S({ id: 'old', status: 'done', starts_at: '2026-10-01T12:00:00Z' }), S({ id: 'blk', status: 'done', link_id: null, starts_at: '2026-11-10T09:00:00Z' })];
  const recs = { d1: { session_id: 'd1', attendees: [], observation: 'x', worked: null, next_step: null, agenda: [], homework: [], author_id: null, updated_at: '' } };
  assert.deepEqual(noteDue(done, recs, now).map((s) => s.id), ['d2']);
});

test('iki sayaç: yapıldı ve yapılmadı (eski geç iptal ve iptal yapılmadı, ertelenen ve teklif kalıntısı sayılmaz)', () => {
  const now = new Date('2026-11-20T00:00:00Z');
  const ss = [S({ id: '1', status: 'done' }), S({ id: '2', status: 'done', starts_at: '2026-11-04T12:00:00Z' }), S({ id: '3', status: 'no_show' }),
              S({ id: '4', status: 'late_cancel' }), S({ id: '5', status: 'cancelled' }), S({ id: '6', status: 'postponed' }),
              S({ id: '7', status: 'planned' }),                                                    // geçmişte işaretlenmemiş: sayılmaz
              S({ id: '8', status: 'cancelled', waitlist_id: 'w' }), S({ id: '9', status: 'offered', starts_at: '2026-11-21T12:00:00Z' }),
              S({ id: '10', status: 'cancelled', starts_at: '2026-11-27T12:00:00Z' }),            // gelecekte: sayılmaz
              S({ id: '11', status: 'planned', starts_at: '2026-11-25T12:00:00Z' }), S({ id: '12', status: 'planned', starts_at: '2026-11-22T12:00:00Z' })];
  const a = attendance(ss, now);
  assert.deepEqual([a.done, a.missed, a.next?.id], [2, 3, '12']);
  assert.deepEqual(Object.keys(a).sort(), ['done', 'missed', 'next']);
});

test('durum etiketleri ve seçim: yalnız Yapıldı / Yapılmadı, gelecekteki seans Planlandı', () => {
  assert.equal(STATUS_META.done.label, 'Yapıldı');
  for (const st of ['no_show', 'late_cancel', 'cancelled']) assert.equal(STATUS_META[st].label, 'Yapılmadı');
  assert.equal(STATUS_META.planned.label, 'Planlandı');
  assert.ok(!Object.values(STATUS_META).some((m) => /Gelmedi|Geç iptal|İptal/.test(m.label)));
  assert.deepEqual(['done', 'no_show', 'late_cancel', 'cancelled', 'postponed', 'planned', 'offered'].map(outcomeOf),
    ['done', 'no_show', 'no_show', 'no_show', null, null, null]);
  assert.equal(isOfferLeftover(S({ status: 'offered' })), true);
  assert.equal(isOfferLeftover(S({ status: 'cancelled', waitlist_id: 'w' })), true);
  assert.equal(isOfferLeftover(S({ status: 'planned', waitlist_id: 'w' })), false);   // aile kabul etti: görünür
  assert.equal(isOfferLeftover(S({ status: 'cancelled' })), false);
});

test('haftalık hücreler: yapıldı > yapılmadı > planlandı; ertelenen ve teklif kalıntısı yok sayılır', () => {
  const cells = weeklyCells([S({ status: 'cancelled', starts_at: '2026-11-03T12:00:00Z' }), S({ status: 'done', starts_at: '2026-11-04T12:00:00Z' }),
                             S({ status: 'late_cancel', starts_at: '2026-11-11T12:00:00Z' }), S({ status: 'planned', starts_at: '2026-11-12T12:00:00Z' }),
                             S({ status: 'postponed', starts_at: '2026-10-27T12:00:00Z' }), S({ status: 'offered', starts_at: '2026-10-28T12:00:00Z' }),
                             S({ status: 'planned', starts_at: '2026-11-19T12:00:00Z' })], '2026-11-19', 4);
  assert.deepEqual(cells.map((c) => [c.start, c.status, c.count]),
    [['2026-10-26', null, 0], ['2026-11-02', 'done', 2], ['2026-11-09', 'no_show', 2], ['2026-11-16', 'planned', 1]]);
});

test('seans öncesi özet: son yapılan seanstan bu yana, gündem', () => {
  const task = { id: 't', title: 'Dişlerini fırçala', emoji: '', skill: 'focus', start_date: '2026-10-01', end_date: null, recurring: true,
                 repeat_kind: 'daily', repeat_days: [], reminder: null, requires_review: true };
  const comps = [];
  for (let d = 1; d <= 9; d++) comps.push({ task_id: 't', date: `2026-11-0${d}`, status: d <= 3 ? 'approved' : d % 2 ? 'declined' : 'approved', child_done_at: null, reviewed_at: null, decline_reason: 'no_time', parent_note: null });
  const abc = [{ id: 'a', occurred_at: '2026-11-06T17:00:00Z', antecedent: 'Tablet süresi bitti', behavior: 'İtiraz', consequence: 'Zamanlayıcı', intensity: 2 }];
  const target = S({ id: 'now', starts_at: '2026-11-11T12:00:00Z' });
  const prev = S({ id: 'prev', status: 'done', starts_at: '2026-11-04T12:00:00Z' });
  const p = prepSummary(target, [prev, target], { tasks: [task], completions: comps, abc },
    { pending: [{ title: 'Kıyafetini akşamdan hazırla' }], reviewDue: [{ title: 'Sabah rutini' }], declineTop: 'Zaman yetmedi' }, new Date('2026-11-11T08:00:00Z'));
  assert.equal(p.since, '2026-11-04');
  assert.equal(p.sinceSession, true);
  assert.equal(p.abc.length, 1);
  assert.equal(p.pending, 1);
  assert.ok(p.agenda.some((x) => x.text.startsWith('"Yapamam"')));
  assert.ok(p.agenda.some((x) => x.text === 'Değerlendirme zamanı: Sabah rutini'));
  assert.ok(p.declined > 0);
});

test('uygun saatler dolu saatleri ve odayı atlar; seri tarihleri', () => {
  const avail = [{ id: 'a', clinician_id: 'd1', weekday: 3, start_time: '09:00', end_time: '12:00', room_id: 'r1', bookable: true }];
  const busy = [{ clinician_id: 'd2', room_id: 'r1', starts_at: trToIso('2026-11-11', '09:45'), ends_at: trToIso('2026-11-11', '10:30') },
                { clinician_id: 'd1', room_id: null, starts_at: trToIso('2026-11-11', '11:15'), ends_at: trToIso('2026-11-11', '12:00') }];
  assert.deepEqual(freeStarts('2026-11-11', avail, busy, 'd1', 45, 'r1'), ['09:00', '10:30']);
  assert.deepEqual(freeStarts('2026-11-11', avail, busy, 'd1', 45, null), ['09:00', '09:45', '10:30']);
  assert.deepEqual(freeStarts('2026-11-12', avail, busy, 'd1', 45), []);
  assert.deepEqual(seriesDates('2026-11-11T12:00:00.000Z', 'biweekly', 3), ['2026-11-11T12:00:00.000Z', '2026-11-25T12:00:00.000Z', '2026-12-09T12:00:00.000Z']);
  assert.equal(seriesDates('2026-11-11T12:00:00.000Z', 'none', 8).length, 1);
});

test('dış takvim başlığından danışan önerisi (tek eşleşme)', () => {
  const clients = [{ link_id: 'L1', child_name: 'Nazlı' }, { link_id: 'L2', child_name: 'Ege' }, { link_id: 'L3', child_name: 'Ege Can' }];
  assert.equal(matchClient('NAZLI seans 15:00', clients)?.link_id, 'L1');
  assert.equal(matchClient('Ege - kontrol', clients), null);      // iki Ege: belirsiz
  assert.equal(matchClient('Diş hekimi', clients), null);
});

// Seans ücreti (ortak akislar 27.1, 23 Kasım 2026)
test('ücret: Türkçe yazımı sunucu biçimine çevirir, geçersizi reddeder', async () => {
  const { parseFee, feeText, feeInput } = await import('../src/lib/sessionCore.ts');
  assert.equal(parseFee(''), null);
  assert.equal(parseFee('450'), '450.00');
  assert.equal(parseFee('450,5'), '450.50');
  assert.equal(parseFee('1.200'), '1200.00');
  assert.equal(parseFee('1.200,75 TL'), '1200.75');
  assert.equal(parseFee('-5'), undefined);
  assert.equal(parseFee('12,345'), undefined);
  assert.equal(parseFee('1000001'), undefined);
  assert.equal(feeText(450), '450 TL');
  assert.equal(feeText('450.50'), '450,50 TL');
  assert.equal(feeText(1200), '1.200 TL');
  assert.equal(feeText(null), null);
  assert.equal(feeInput(1200.5), '1200,50');
});
