// Örnek aile verisinin testleri. Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleBundle } from '../src/lib/sample.ts';
import { weekly, weekGrid } from '../src/lib/metrics.ts';

test('örnek aile: aynı gün aynı veri, sonlara doğru iyileşme, bugün kayıtları', () => {
  const today = '2026-10-28';
  const a = sampleBundle(today);
  assert.deepEqual(sampleBundle(today), a); // tohumlu: her açılışta aynı
  assert.equal(a.tasks.length, 7);
  const w = weekly(a.tasks, a.completions, today, 8);
  const early = (w[0].rate ?? 0) + (w[1].rate ?? 0);
  const late = (w[6].rate ?? 0) + (w[7].rate ?? 0);
  assert.ok(late > early, `iyileşme beklenir: ${early} → ${late}`);
  assert.ok(a.completions.some((c) => c.date === today && c.status === 'pending'));
  assert.ok(a.completions.every((c) => c.date <= today));
  const grid = weekGrid(a.tasks, a.completions, today);
  assert.ok(grid.rows.length >= 5);
  // davranış kayıtları başta daha sık
  const first = a.abc.filter((e) => e.occurred_at < new Date('2026-09-15').toISOString()).length;
  const last = a.abc.filter((e) => e.occurred_at >= new Date('2026-10-14').toISOString()).length;
  assert.ok(first > last);
  assert.equal(a.plan.goals.length, 2);
  assert.ok(a.plan.goals[0].ratings.length > 4);
});
