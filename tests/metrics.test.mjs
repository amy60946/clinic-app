// Gösterge hesaplarının testleri. Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  occursOn, weekly, perTask, observations, bySkill, abcSummary, mondayOf, addDays, dayCell, weekGrid, timeOfDay, weeklyCounts,
} from '../src/lib/metrics.ts';

const task = (o) => ({
  id: 't1', title: 'Odanı topla', emoji: '🧹', skill: 'Ev', start_date: '2026-09-01', end_date: null,
  recurring: true, repeat_kind: 'daily', repeat_days: [], reminder: null, requires_review: true, ...o,
});
const comp = (date, status, o = {}) => ({
  task_id: 't1', date, status, child_done_at: null, reviewed_at: null, decline_reason: null, parent_note: null, ...o,
});
// Yerel saatle ISO zaman damgası
const at = (date, hm) => new Date(`${date}T${hm}:00`).toISOString();

test('tekrar kuralları sunucudaki task_occurs_on ile aynı', () => {
  assert.equal(occursOn(task({ recurring: false, start_date: '2026-10-05' }), '2026-10-05'), true);
  assert.equal(occursOn(task({ recurring: false, start_date: '2026-10-05' }), '2026-10-06'), false);
  assert.equal(occursOn(task({ repeat_kind: 'weekly', repeat_days: [1, 3] }), '2026-10-19'), true); // pazartesi
  assert.equal(occursOn(task({ repeat_kind: 'weekly', repeat_days: [1, 3] }), '2026-10-20'), false);
  assert.equal(occursOn(task({ start_date: '2026-01-01', repeat_kind: 'monthly', repeat_days: [31] }), '2026-02-28'), true);
  assert.equal(occursOn(task({ start_date: '2026-01-01', repeat_kind: 'monthly', repeat_days: [31] }), '2026-02-27'), false);
  assert.equal(occursOn(task({ end_date: '2026-10-01' }), '2026-10-02'), false);
  assert.equal(occursOn(task(), '2026-08-31'), false);
});

test('pazartesi ve haftalık oran', () => {
  assert.equal(mondayOf('2026-10-25'), '2026-10-19'); // pazar → aynı haftanın pazartesisi
  const today = '2026-10-21'; // çarşamba: oranlar dünkü güne kadar → bu hafta 2 gün
  const comps = [comp('2026-10-19', 'approved'), comp('2026-10-20', 'declined'), comp('2026-10-14', 'approved')];
  const [prev, cur] = weekly([task()], comps, today, 2);
  assert.deepEqual([cur.planned, cur.approved, cur.declined, cur.rate, cur.fullDays, cur.plannedDays], [2, 1, 1, 50, 1, 2]);
  assert.deepEqual([prev.planned, prev.approved, prev.rate], [7, 1, 14]);
});

test('ustalık: tamamlanmış son 4 hafta üst üste ≥ %90 (içinde bulunulan hafta sayılmaz)', () => {
  const today = '2026-10-21';
  const start = addDays(mondayOf(today), -28);
  const comps = [];
  for (let d = start; d <= today; d = addDays(d, 1)) comps.push(comp(d, 'approved'));
  assert.equal(perTask([task()], comps, today, 4)[0].mastered, true);
  const missing = comps.filter((c) => c.date !== start && c.date !== addDays(start, 1));
  assert.equal(perTask([task()], missing, today, 4)[0].mastered, false); // ilk hafta 5/7 = %71
  assert.equal(weekly([task()], comps, today, 1)[0].planned, 2); // bugün (21'i) sayılmaz
});

test('gözlem özeti: hatırlatmadan önce başlama, nedenler, ret, onay gecikmesi', () => {
  const t = task({ reminder: '18:00' });
  const comps = [
    comp('2026-10-19', 'approved', { child_done_at: at('2026-10-19', '17:30'), reviewed_at: at('2026-10-19', '19:30') }),
    comp('2026-10-20', 'approved', { child_done_at: at('2026-10-20', '18:45'), reviewed_at: at('2026-10-20', '19:45') }),
    comp('2026-10-21', 'declined', { child_done_at: at('2026-10-21', '18:10'), decline_reason: 'hard' }),
    comp('2026-10-22', 'rejected', { child_done_at: at('2026-10-22', '17:00'), reviewed_at: at('2026-10-22', '20:00') }),
  ];
  const o = observations([t], comps, '2026-10-19', '2026-10-23');
  assert.equal(o.planned, 5);
  assert.equal(o.approved, 2);
  assert.equal(o.withReminder, 2); // yalnız approved/pending sayılır
  assert.equal(o.beforeReminder, 1);
  assert.equal(o.declineReasons.hard, 1);
  assert.equal(o.declineRate, 20);
  assert.equal(o.rejectRate, 33);
  assert.equal(o.reviewDelayHours, 2); // 2, 1, 3 saat → ortanca 2
});

test('beceri alanı ve zor an özeti', () => {
  const tasks = [task({ skill: 'teamwork' }), task({ id: 't2', skill: '' }), task({ id: 't3', skill: 'Sorumluluk' }), task({ id: 't4', skill: 'Odaklanma' })];
  const s = bySkill(tasks, [comp('2026-10-19', 'approved')], '2026-10-19', '2026-10-20');
  assert.deepEqual(s.map((x) => [x.skill, x.planned, x.approved]), [['Takım Çalışması', 4, 1], ['Odak', 2, 0], ['Diğer', 2, 0]]);
  const ev = (d, hm, i) => ({ id: d + hm, occurred_at: at(d, hm), antecedent: '', behavior: 'x', consequence: '', intensity: i });
  const a = abcSummary([ev('2026-10-19', '07:30', 2), ev('2026-10-20', '19:00', 4), ev('2026-09-01', '19:00', 5)], '2026-10-21', 2);
  assert.equal(a.total, 2);
  assert.deepEqual(a.perWeek[1], { start: '2026-10-19', count: 2, avgIntensity: 3 });
  assert.equal(a.byDayPart.sabah, 1);
  assert.equal(a.byDayPart['akşam'], 1);
  // ebeveynin seçtiği gün bölümü saatten önce gelir
  const b = abcSummary([{ ...ev('2026-10-20', '13:00', 3), day_part: 'night' }], '2026-10-21', 1);
  assert.equal(b.byDayPart.gece, 1);
});

test('pazartesi günü dönem geçen haftayla biter (boş hafta gösterilmez)', async () => {
  const { windowStarts } = await import('../src/lib/metrics.ts');
  assert.deepEqual(windowStarts('2026-10-19', 2), ['2026-10-05', '2026-10-12']);
  assert.deepEqual(windowStarts('2026-10-20', 2), ['2026-10-12', '2026-10-19']);
  const w = weekly([task()], [], '2026-10-19', 1);
  assert.equal(w[0].planned, 7);
});

test('pazartesi günü ustalık geçen haftayı da sayar', () => {
  const today = '2026-10-19'; // pazartesi: son tamamlanmış hafta 12–18 Ekim
  const comps = [];
  for (let d = '2026-09-21'; d <= '2026-10-18'; d = addDays(d, 1)) comps.push(comp(d, 'approved'));
  assert.equal(perTask([task()], comps, today, 4)[0].mastered, true);
});

test('"Tekrar dene" (retry) tamamlandı sayılmaz, planlıda kalır', () => {
  const t = task({ start_date: '2026-10-19' });
  const w = weekly([t], [comp('2026-10-19', 'retry'), comp('2026-10-20', 'approved')], '2026-10-22', 1);
  assert.equal(w[0].planned, 3);
  assert.equal(w[0].approved, 1);
  assert.equal(w[0].rejected, 0);
});

test('motive etmek: kolay/orta/zor sayıları ve eğilim (ebeveyn gözlemi)', async () => {
  const { motivationStats, motivationText } = await import('../src/lib/metrics.ts');
  const m = (date, v, id = 't1') => comp(date, 'approved', { motivation: v, task_id: id });
  // önceki 14 gün zor (5,4,5), son 14 gün kolay (1,2,2) → kolaylaşıyor
  const comps = [m('2026-10-01', 5), m('2026-10-03', 4), m('2026-10-05', 5), m('2026-10-16', 1), m('2026-10-18', 2), m('2026-10-20', 2),
    m('2026-10-19', 3, 't2'), comp('2026-10-21', 'approved')];
  const all = motivationStats(comps, '2026-09-25', '2026-10-21');
  assert.deepEqual([all.answered, all.easy, all.medium, all.hard], [7, 3, 1, 3]);
  const t1 = motivationStats(comps, '2026-09-25', '2026-10-21', 't1');
  assert.equal(t1.trend, 'easier');
  assert.equal(motivationText(t1), 'kolay 3 · orta 0 · zor 3 · son 2 haftada kolaylaşıyor');
  assert.equal(motivationStats(comps, '2026-09-25', '2026-10-21', 't2').trend, null); // az yanıt: eğilim yok
  assert.equal(motivationStats([comp('2026-10-20', 'approved')], '2026-10-01', '2026-10-21').answered, 0); // eski sunucu: alan yok
});

test('haftalık tablo: gün hücreleri, planlı ve yapılan', () => {
  const today = '2026-10-21'; // çarşamba
  const t = task({ repeat_kind: 'weekly', repeat_days: [1, 2, 3, 4, 5] }); // hafta içi
  const comps = [comp('2026-10-19', 'approved'), comp('2026-10-20', 'pending'), comp('2026-10-16', 'declined')];
  const { dates, rows } = weekGrid([t], comps, today);
  assert.deepEqual(dates, ['2026-10-15', '2026-10-16', '2026-10-17', '2026-10-18', '2026-10-19', '2026-10-20', '2026-10-21']);
  assert.deepEqual(rows[0].cells.map((c) => c.state), ['missed', 'declined', 'off', 'off', 'approved', 'waiting', 'today']);
  assert.deepEqual([rows[0].planned, rows[0].done], [5, 1]);
  assert.equal(dayCell(t, comp('2026-10-18', 'retry'), '2026-10-18', today), 'retry'); // planlı olmasa da kayıt gösterilir
  // dönemde hiç planı olmayan görev tabloda yok
  assert.equal(weekGrid([task({ start_date: '2026-11-01' })], [], today).rows.length, 0);
});

test('günün bölümü hatırlatma saatinden', () => {
  assert.equal(timeOfDay({ reminder: null }), 'any');
  assert.equal(timeOfDay({ reminder: '07:30' }), 'morning');
  assert.equal(timeOfDay({ reminder: '12:00' }), 'noon');
  assert.equal(timeOfDay({ reminder: '19:45' }), 'evening');
  assert.equal(timeOfDay({ reminder: '21:00' }), 'night');
});

test('zaman içinde: haftalık yapılan ve planlanan, ortalama', () => {
  const today = '2026-10-21';
  const comps = [comp('2026-10-19', 'approved'), comp('2026-10-20', 'approved'), comp('2026-10-13', 'approved'), comp('2026-10-14', 'rejected')];
  const { starts, series } = weeklyCounts([task()], comps, today, 2);
  assert.deepEqual(starts, ['2026-10-12', '2026-10-19']);
  assert.deepEqual(series[0].done, [1, 2]);
  assert.deepEqual(series[0].planned, [7, 2]); // bu hafta dünkü güne kadar
  assert.equal(series[0].avg, 1.5);
  assert.equal(weeklyCounts([task({ start_date: '2026-11-01' })], [], today, 2).series.length, 0);
});
