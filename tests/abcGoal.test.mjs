// Hedefe bağlı davranış kaydı sayısı (metrics.goalAbcWeeks). Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goalAbcWeeks } from '../src/lib/metrics.ts';
import { sampleBundle } from '../src/lib/sample.ts';

const ev = (day, goal_id) => ({ id: day + (goal_id ?? ''), occurred_at: new Date(`${day}T10:00:00`).toISOString(), antecedent: '', behavior: 'x', consequence: '', intensity: 2, goal_id });

test('hedefe bağlı kayıtlar takvim haftalarına göre sayılır, bugün dahil', () => {
  const today = '2026-11-04'; // çarşamba; haftalar 13 Eki, 20 Eki, 27 Eki, 3 Kas
  const abc = [ev('2026-11-04', 'g1'), ev('2026-11-03', 'g1'), ev('2026-10-28', 'g1'), ev('2026-10-14', 'g1'), ev('2026-10-12', 'g1'), ev('2026-11-02', 'g2'), ev('2026-11-02', null)];
  const w = goalAbcWeeks(abc, 'g1', today);
  assert.deepEqual(w.map((x) => x.start), ['2026-10-12', '2026-10-19', '2026-10-26', '2026-11-02']);
  assert.deepEqual(w.map((x) => x.count), [2, 0, 1, 2]);
  assert.deepEqual(goalAbcWeeks(abc, 'g2', today).map((x) => x.count), [0, 0, 0, 1]);
});

test('örnek ailede bazı davranış kayıtları hedefe bağlı', () => {
  const b = sampleBundle('2026-11-03');
  assert.ok(b.abc.some((e) => e.goal_id === 's-g2'));
  assert.ok(b.abc.some((e) => !e.goal_id));
});
