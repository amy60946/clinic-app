// Takip planı yeniden tasarımı testleri (ortak akislar.md 12.1). Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groupSuggestions, visibleGroup, goalUnsent, moduleUnsent } from '../src/lib/planCore.ts';

const today = '2026-11-02';
const sug = (p) => ({
  id: p.id, title: p.title ?? p.id, emoji: '⭐', skill: '', description: '', category: null, template_key: null, difficulty: 'easy', coins: 5,
  start_date: '', recurring: true, repeat_kind: 'daily', repeat_days: [], end_date: null, reminder: p.reminder ?? null, requires_review: true,
  note: '', status: p.status ?? 'draft', created_at: '2026-11-01T10:00:00Z', updated_at: null, decided_at: p.decided_at ?? null,
  task_title: null, task_id: p.task_id ?? null, kind: p.kind ?? 'new', target_task_id: p.target ?? null, change_remove: !!p.remove,
  goal_id: p.goal ?? null,
  routine: p.group ? { group: p.group, title: 'Güne hazır sabah', icon: 'sunny-outline', position: p.pos ?? 0, key: 'morning_a' } : null,
});
const task = (id, end = null) => ({ id, title: id, emoji: '⭐', skill: '', start_date: '2026-10-01', end_date: end, recurring: true,
  repeat_kind: 'daily', repeat_days: [], reminder: '07:00', requires_review: true });

test('rutin grubu: aynı paket tek grup, sıraya göre; durum taslak / bekleyen / ekli / eklenmedi', () => {
  const list = [
    sug({ id: 'b', group: 'G1', pos: 1, goal: 'g1' }), sug({ id: 'a', group: 'G1', pos: 0, goal: 'g1' }),
    sug({ id: 'p', group: 'G2', status: 'pending' }),
    sug({ id: 'x', group: 'G3', status: 'accepted', task_id: 't1' }), sug({ id: 'y', group: 'G3', status: 'declined', decided_at: '2026-11-01' }),
    sug({ id: 's', status: 'declined', decided_at: '2026-10-01' }),
  ];
  const g = groupSuggestions(list, [task('t1')], today);
  const by = Object.fromEntries(g.map((x) => [x.key, x]));
  assert.deepEqual(by.G1.items.map((s) => s.id), ['a', 'b']);
  assert.equal(by.G1.state, 'draft');
  assert.equal(by.G1.goalId, 'g1');
  assert.equal(by.G2.state, 'pending');
  assert.equal(by.G3.state, 'added');
  assert.equal(by.G3.tasks.length, 1);
  assert.equal(by.s.single, true);
  assert.equal(by.s.state, 'declined');
});

test('değişiklik önerisi rutin grubuna karışmaz, ekli görevin açık değişikliği olarak görünür', () => {
  const list = [
    sug({ id: 'x', group: 'G3', status: 'accepted', task_id: 't1' }),
    sug({ id: 'c', group: 'G3', kind: 'change', target: 't1', remove: true }),
    sug({ id: 'old', group: 'G3', kind: 'change', target: 't1', status: 'accepted' }),
  ];
  const [g] = groupSuggestions(list, [task('t1')], today);
  assert.equal(g.items.length, 1);
  assert.deepEqual(g.changes.map((c) => c.id), ['c']);
});

test('görünürlük: 14 günden eski ret ve ailede bitmiş rutin gizlenir', () => {
  const groups = groupSuggestions([
    sug({ id: 'old', status: 'declined', decided_at: '2026-10-01T09:00:00Z' }),
    sug({ id: 'new', status: 'declined', decided_at: '2026-10-30T09:00:00Z' }),
    sug({ id: 'ended', status: 'accepted', task_id: 't9' }),
    sug({ id: 'live', status: 'accepted', task_id: 't1' }),
  ], [task('t1'), task('t9', '2026-10-20')], today);
  const vis = groups.filter((r) => visibleGroup(r, today)).map((r) => r.key).sort();
  assert.deepEqual(vis, ['live', 'new']);
});

const goal = (p = {}) => ({ id: 'g1', title: 'Sabah', description: '', archived: false, created_at: '', domain: 'routine', measure: 'yesno',
  baseline: '', target: "7 günün 5'i", weeks: 6, home_support: '', shared: true, status: 'active', position: 0, template_key: null, ratings: [], ...p });
const pubOf = (g) => ({ title: g.title, description: g.description, domain: g.domain, measure: g.measure, baseline: g.baseline, target: g.target,
  weeks: g.weeks, home_support: g.home_support, status: g.status, position: g.position });

test('hedef: gönderilmiş sürümle aynıysa gönderilmiş; değişince, gizlenince ya da hiç gönderilmemişse gönderilmedi', () => {
  const g = goal();
  assert.equal(goalUnsent(g, pubOf(g)), false);
  assert.equal(goalUnsent({ ...g, target: '%80' }, pubOf(g)), true);
  assert.equal(goalUnsent(g, null), true);
  assert.equal(goalUnsent({ ...g, shared: false }, pubOf(g)), true);     // aile hâlâ görüyor
  assert.equal(goalUnsent({ ...g, shared: false }, null), false);
  assert.equal(goalUnsent({ ...g, weeks: null }, { ...pubOf(g), weeks: null }), false);
});

test('program: planlandı aileye gitmez; bağlı hedefler değişince gönderilmedi', () => {
  const m = { id: 'm1', title: 'Övgü', aim: 'a', practice: 'p', checklist: ['x'], position: 0, status: 'active', template_key: null, created_at: '' };
  const pub = { title: 'Övgü', aim: 'a', practice: 'p', checklist: ['x'], status: 'active', position: 0, goal_ids: ['g1'] };
  assert.equal(moduleUnsent(m, pub, ['g1']), false);
  assert.equal(moduleUnsent(m, pub, ['g1', 'g2']), true);
  assert.equal(moduleUnsent(m, pub, null), false);
  assert.equal(moduleUnsent({ ...m, checklist: ['x', 'y'] }, pub, ['g1']), true);
  assert.equal(moduleUnsent({ ...m, status: 'planned' }, null, []), false);
  assert.equal(moduleUnsent({ ...m, status: 'planned' }, pub, []), true);
});
