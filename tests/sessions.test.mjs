// Seans planlama yardımcıları (src/lib/sessionCore.ts). Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { trDay, trTime, trToIso, layoutDay, wouldBeLate, noteDue, packageUsage, attendance, weeklyCells, prepSummary,
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

test('geç iptal ve not bekleyenler', () => {
  const now = new Date('2026-11-11T08:00:00Z');
  assert.equal(wouldBeLate('2026-11-11T12:00:00Z', now, 24), true);
  assert.equal(wouldBeLate('2026-11-13T12:00:00Z', now, 24), false);
  const done = [S({ id: 'd1', status: 'done', starts_at: '2026-11-09T12:00:00Z' }), S({ id: 'd2', status: 'done', starts_at: '2026-11-10T12:00:00Z' }),
                S({ id: 'old', status: 'done', starts_at: '2026-10-01T12:00:00Z' }), S({ id: 'blk', status: 'done', link_id: null, starts_at: '2026-11-10T09:00:00Z' })];
  const recs = { d1: { session_id: 'd1', attendees: [], observation: 'x', worked: null, next_step: null, agenda: [], homework: [], author_id: null, updated_at: '' } };
  assert.deepEqual(noteDue(done, recs, now).map((s) => s.id), ['d2']);
});

test('paket kullanımı ayara göre, devam sayıları', () => {
  const now = new Date('2026-11-20T00:00:00Z');
  const pkg = { id: 'p', link_id: 'L', title: '10 seans', total: 3, starts_on: null, ends_on: null, note: null, closed_at: null, created_at: '' };
  const ss = [S({ id: '1', status: 'done', package_id: 'p' }), S({ id: '2', status: 'no_show', package_id: 'p' }), S({ id: '3', status: 'late_cancel', package_id: 'p' }),
              S({ id: '4', status: 'cancelled', package_id: 'p' }), S({ id: '5', status: 'planned', package_id: 'p', starts_at: '2026-11-25T12:00:00Z' })];
  assert.deepEqual(packageUsage(pkg, ss, { count_late_cancel: true, count_no_show: true }, now), { used: 3, planned: 1, left: 0, over: false });
  assert.equal(packageUsage(pkg, ss, { count_late_cancel: false, count_no_show: false }, now).used, 1);
  const a = attendance(ss, now);
  assert.deepEqual([a.done, a.noShow, a.late, a.cancelled, a.next?.id], [1, 1, 1, 1, '5']);
});

test('haftalık hücreler: haftada en belirgin durum', () => {
  const cells = weeklyCells([S({ status: 'cancelled', starts_at: '2026-11-03T12:00:00Z' }), S({ status: 'done', starts_at: '2026-11-04T12:00:00Z' }),
                             S({ status: 'no_show', starts_at: '2026-11-11T12:00:00Z' })], '2026-11-12', 3);
  assert.deepEqual(cells.map((c) => [c.start, c.status]), [['2026-10-26', null], ['2026-11-02', 'done'], ['2026-11-09', 'no_show']]);
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
