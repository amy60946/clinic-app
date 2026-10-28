// Günlük rutin v2 testleri (ortak akislar.md 5.4). Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  childBand, fitsAge, shiftTime, normalizeTime, draftOf, routineSuggestions, agesText, newGroupId,
} from '../src/lib/routineCore.ts';

const catalog = JSON.parse(readFileSync(new URL('../src/data/routines.json', import.meta.url), 'utf8'));
const templates = JSON.parse(readFileSync(new URL('../src/data/taskTemplates.json', import.meta.url), 'utf8')).templates;
const byKey = Object.fromEntries(templates.map((t) => [t.key, t]));

test('katalog: her görev rutinin bütün yaş gruplarına uygun; her yaş grubu her konuyu bir kez görür', () => {
  assert.equal(catalog.version, 2);
  for (const r of catalog.routines) {
    for (const i of r.items) {
      const t = byKey[i.key];
      assert.ok(t, `${r.id}: ${i.key} katalogda yok`);
      for (const a of r.ages) assert.ok(t.ages.includes(a), `${r.id}: "${t.title}" ${a} grubuna uygun değil`);
    }
  }
  const themes = [...new Set(catalog.routines.map((r) => r.theme))];
  for (const band of ['K', 'A', 'B', 'C']) {
    for (const th of themes) {
      const n = catalog.routines.filter((r) => r.theme === th && r.ages.includes(band)).length;
      assert.equal(n, 1, `${band} grubu "${th}" konusunda ${n} rutin görüyor`);
    }
  }
});

test('yaş grubu: seçilen grup önce, yoksa doğum gününden', () => {
  const today = new Date(2026, 9, 28);
  assert.equal(childBand({ age_band: 'C', birthday: '2021-01-01' }, today), 'C');
  assert.equal(childBand({ birthday: '2021-10-29' }, today), 'K');      // 4 yaş
  assert.equal(childBand({ birthday: '2018-10-28' }, today), 'A');      // bugün 8
  assert.equal(childBand({ birthday: '2014-10-29' }, today), 'B');      // yarın 12
  assert.equal(childBand({ birthday: '2013-01-01' }, today), 'C');
  assert.equal(childBand({ birthday: null }, today), null);
  assert.equal(fitsAge({ ages: ['A', 'B'] }, 'K'), false);
  assert.equal(fitsAge({ ages: ['A', 'B'] }, null), true);
  assert.equal(agesText(['A', 'B']), '6–12 yaş');
  assert.equal(agesText(['K']), '5 ve altı yaş');
  assert.equal(agesText(['B', 'C']), '9+ yaş');
});

test('saat: yazım düzeltme ve kaydırma gün içinde kalır', () => {
  assert.equal(normalizeTime('7:30'), '07:30');
  assert.equal(normalizeTime('0730'), '07:30');
  assert.equal(normalizeTime('7.05'), '07:05');
  assert.equal(normalizeTime('25:00'), null);
  assert.equal(shiftTime('07:45', 30), '08:15');
  assert.equal(shiftTime('00:10', -30), '00:00');
  assert.equal(shiftTime('23:50', 30), '23:59');
});

const routine = {
  id: 'morning', key: 'morning', source: 'catalog', title: 'Güne hazır sabah', subtitle: '', icon: 'sunny-outline', tint: '', repeat: 'weekdays', ages: ['A', 'B'],
  tasks: [
    { id: 'a', title: 'Yatağını topla', emoji: '🛏️', skill: 'focus', category: 'focus', template_key: 'a', difficulty: 'easy', coins: 5, time: '07:05' },
    { id: 'b', title: 'Dişlerini fırçala', emoji: '🪥', skill: 'strength', category: 'health', template_key: 'b', difficulty: 'medium', coins: 10, time: '07:15' },
    { id: 'c', title: 'Kahvaltını yap', emoji: '🥣', skill: 'strength', category: 'health', template_key: 'c', difficulty: 'medium', coins: 10, time: '07:30' },
  ],
};

test('paket: seçilenler aynı grupta, sırayla; çocukta olan baştan seçili değil; hedef ve gün seçimi taşınır', () => {
  const d = draftOf(routine, ['dişlerini fırçala ']);
  assert.deepEqual(d.tasks.map((t) => t.on), [true, false, true]);
  const group = newGroupId();
  assert.match(group, /^[0-9a-f-]{36}$/);
  let list = routineSuggestions(routine, d, '2026-10-29', 'Görsel çizelge', { group, goalId: 'g1' });
  assert.equal(list.length, 2);
  assert.deepEqual(list.map((s) => s.routine.position), [0, 1]);
  assert.ok(list.every((s) => s.routine.group === group && s.routine.title === 'Güne hazır sabah' && s.goal_id === 'g1'));
  assert.deepEqual(list[0].repeat_days, [1, 2, 3, 4, 5]);
  assert.equal(list[1].reminder, '07:30');
  assert.equal(list[0].note, 'Güne hazır sabah rutini · Görsel çizelge');
  list = routineSuggestions(routine, { ...d, repeat: 'days', days: [6, 1] }, '2026-10-29', '', { group });
  assert.deepEqual(list[0].repeat_days, [1, 6]);
  assert.equal(list[0].goal_id, null);
  list = routineSuggestions(routine, { ...d, repeat: 'daily' }, '2026-10-29', '', { group });
  assert.equal(list[0].repeat_kind, 'daily');
  list = routineSuggestions({ ...routine, source: 'own', id: 'r9' }, d, '2026-10-29', '', { group });
  assert.equal(list[0].routine.key, 'own:r9');
});
