// Örnek aile verisinin testleri. Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleBundle } from '../src/lib/sample.ts';
import { weekly, weekGrid } from '../src/lib/metrics.ts';
import { reviewDue, groupSuggestions, publishItems } from '../src/lib/planCore.ts';

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
  // GAS dört haftada bir (2 Kasım 2026): ilk hedefte değerlendirme zamanı geldi, ikincisinde yakın
  assert.ok(a.plan.goals.every((g) => g.ratings.length >= 2));
  assert.equal(reviewDue(a.plan.goals[0], today), true);
  assert.equal(reviewDue(a.plan.goals[1], today), false);
});

test('örnek ailenin Takip Planı gerçek ekranla gösterilecek kadar dolu', () => {
  const today = '2026-11-03';
  const a = sampleBundle(today);
  const { goals, modules, links, suggestions, pub } = a.plan;
  // bir program birden çok hedefe bağlı; her bağ var olan hedeflere
  assert.ok(Object.values(links).some((ids) => ids.length > 1));
  assert.ok(Object.values(links).flat().every((id) => goals.some((g) => g.id === id)));
  // ailede ekli öneriler var olan görevlere, taslak aileye gönderilmemiş
  const ids = new Set(a.tasks.map((t) => t.id));
  assert.ok(suggestions.filter((s) => s.status === 'accepted').every((s) => s.task_id && ids.has(s.task_id)));
  assert.ok(suggestions.filter((s) => s.status === 'accepted' && s.task_id).every((s) => a.fromClinic.includes(s.task_id)));
  const groups = groupSuggestions(suggestions, a.tasks, today);
  assert.ok(groups.some((r) => r.state === 'draft'));
  assert.ok(groups.some((r) => r.state === 'added' && !r.single && r.goalId === 's-g1'));
  // "Aileye gönder (2)": değişen bir hedef + bir taslak paket; Planlandı program aileye gitmez
  const items = publishItems({ goals, modules, groups, changes: suggestions, pub, links });
  assert.deepEqual(items.map((x) => x.kind).sort(), ['goal', 'routine']);
  assert.equal(pub.modules['s-m3'], undefined);
});
