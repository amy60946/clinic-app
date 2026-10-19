// Çalıştırma: npm test  (node --test, TypeScript tip çıkarımı Node 22.18+ yerleşik)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { summarize, weekly, perTask, gasT, gasSeries, abcSummary, toISO, addDays, occursOn, type MTask, type MCompletion } from './metrics.ts';

const today = new Date(2026, 9, 19, 12); // Pazartesi
const d = (n: number) => toISO(addDays(today, n));
const task = (id: string, p: Partial<MTask> = {}): MTask => ({
  id, title: id, emoji: '⭐', skill: 'Öz Bakım', startDate: d(-60), recurring: true, repeatKind: 'daily', repeatDays: [], childIds: ['c'], ...p,
});
const done = (taskId: string, n: number, status: MCompletion['status'] = 'approved', at?: string): MCompletion =>
  ({ taskId, childId: 'c', date: d(n), status, childDoneAt: at });

test('haftalık tekrar kuralı ParentApp ile aynı', () => {
  const t = task('w', { repeatKind: 'weekly', repeatDays: [1, 3] });
  assert.equal(occursOn(t, d(0)), true);   // Pzt
  assert.equal(occursOn(t, d(1)), false);  // Sal
  assert.equal(occursOn(t, d(2)), true);   // Çar
});

test('tamamlama, onay ve seri', () => {
  const t = task('a');
  const comps = [done('a', 0, 'pending'), done('a', -1), done('a', -2), done('a', -4)];
  const s = summarize('c', [t], comps, today, 7);
  assert.equal(s.scheduled, 7);
  assert.equal(s.done, 4);
  assert.equal(s.completion, 57);
  assert.equal(s.approval, 75);
  assert.equal(s.streak, 3); // bugün (bekleyen dahil), dün, evvelsi gün
});

test('bugün henüz yapılmadıysa seri dünden sayılır', () => {
  const s = summarize('c', [task('a')], [done('a', -1), done('a', -2)], today, 7);
  assert.equal(s.streak, 2);
});

test('reddedilen ve "yapamam" yapılmış sayılmaz; neden sayılır', () => {
  const comps: MCompletion[] = [done('a', 0, 'rejected'), { ...done('a', -1, 'declined'), declineReason: 'hard' }];
  const s = summarize('c', [task('a')], comps, today, 2);
  assert.equal(s.done, 0);
  assert.deepEqual(s.declines, { hard: 1 });
});

test('zamanında: hatırlatma + 60 dk', () => {
  const t = task('r', { reminder: '08:00' });
  const at = (n: number, h: number, m: number) => { const x = addDays(today, n); x.setHours(h, m, 0, 0); return x.toISOString(); };
  const comps = [done('r', 0, 'approved', at(0, 8, 30)), done('r', -1, 'approved', at(-1, 9, 30)), done('r', -2, 'approved', at(-2, 7, 50))];
  const s = summarize('c', [t], comps, today, 3);
  assert.equal(s.onTimeN, 3);
  assert.equal(s.onTime, 67);
});

test('başka çocuğa atanmış görev sayılmaz', () => {
  const s = summarize('c', [task('x', { childIds: ['baska'] })], [], today, 7);
  assert.equal(s.scheduled, 0);
  assert.equal(s.completion, null);
});

test('haftalık seri 8 nokta, bu hafta bugüne kadar', () => {
  const w = weekly('c', [task('a')], [done('a', 0)], today, 8);
  assert.equal(w.length, 8);
  assert.equal(w[7].scheduled, 1);
  assert.equal(w[7].pct, 100);
});

test('kalıcı: son 3 tam haftanın her biri ≥ %85', () => {
  const comps = Array.from({ length: 28 }, (_, i) => done('a', -i));
  assert.equal(perTask('c', [task('a')], comps, today)[0].status, 'kalıcı');
  const few = Array.from({ length: 28 }, (_, i) => i % 3 === 0 ? done('a', -i) : null).filter(Boolean) as MCompletion[];
  assert.equal(perTask('c', [task('a')], few, today)[0].status, 'zorlanıyor');
});

test('GAS T puanı', () => {
  assert.equal(gasT([0, 0]), 50);
  assert.equal(gasT([]), null);
  assert.equal(gasT([1, 1]), 62); // 50 + 10·2 / √(0,7·2 + 0,3·4) = 62,4
  assert.equal(gasSeries([{ goalId: 'g', week: '2026-10-12', rating: 2 }])[0].t, 70);
});

test('ABC özeti: haftalık sayım ve sık öncül', () => {
  const ev = (n: number, a: string, i: number) => ({ occurredAt: addDays(today, n).toISOString(), antecedent: a, behavior: 'x', consequence: '', intensity: i });
  const s = abcSummary([ev(0, 'Tablet bitti', 4), ev(-1, 'tablet bitti ', 2), ev(-20, 'Ödev', 3)], today);
  assert.equal(s.total, 3);
  assert.equal(s.topAntecedents[0].count, 2);
  assert.equal(s.perWeek[7].count, 1);
  assert.equal(s.avgIntensityRecent, 3);
});
