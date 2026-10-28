// Dışa aktarma (CSV) testleri. Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toCsv, abcRows, routineRows, csvName, ABC_HEADER } from '../src/lib/csv.ts';

const at = (date, hm) => new Date(`${date}T${hm}:00`).toISOString();

test('CSV: noktalı virgül, tırnak, BOM ve formül koruması', () => {
  const out = toCsv([['a;b', 'say "x"', '=1+1', '-3', 'düz'], [null, 5]]);
  assert.ok(out.startsWith('﻿'));
  const [l1, l2] = out.slice(1).split('\r\n');
  assert.equal(l1, `"a;b";"say ""x""";'=1+1;'-3;düz`);
  assert.equal(l2, ';5');
});

test('zor anlar: dönem dışı ayıklanır, eskiden yeniye, gün bölümü seçiliyse saat boş', () => {
  const ev = (id, date, hm, o = {}) => ({ id, occurred_at: at(date, hm), antecedent: 'Ekran kapandı', behavior: 'Bağırdı', consequence: 'Sakinleşti', intensity: 3, ...o });
  const rows = abcRows([
    ev('2', '2026-10-10', '19:30'),
    ev('1', '2026-10-08', '08:15', { day_part: 'morning', audio_path: 'abc/x.m4a' }),
    ev('3', '2026-09-01', '10:00'),
  ], '2026-10-01', '2026-10-31');
  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0], ['2026-10-08', '', 'Sabah', 'Ekran kapandı', 'Bağırdı', 'Sakinleşti', '3', 'var']);
  assert.deepEqual(rows[1].slice(0, 3), ['2026-10-10', '19:30', 'Akşam']);
  assert.equal(ABC_HEADER.length, rows[0].length);
});

test('ev rutini: kayıtsız planlı günler de yazılır', () => {
  const t = { id: 't1', title: 'Dişini fırçala', emoji: '🪥', skill: 'health', start_date: '2026-10-01', end_date: null, recurring: true, repeat_kind: 'daily', repeat_days: [], reminder: null, requires_review: true };
  const c = (date, status, o = {}) => ({ task_id: 't1', date, status, child_done_at: null, reviewed_at: null, decline_reason: null, parent_note: null, ...o });
  const rows = routineRows([t], [c('2026-10-01', 'approved', { motivation: 2 }), c('2026-10-02', 'declined', { decline_reason: 'hard', parent_note: 'yorgundu' })], '2026-10-01', '2026-10-03');
  assert.equal(rows.length, 3);
  assert.equal(rows[0][3], 'Yaptı, ebeveyn onayladı');
  assert.equal(rows[0][6], '2');
  assert.deepEqual(rows[1].slice(3, 6), ['"Yapamam" dedi', 'Zor geldi', 'yorgundu']);
  assert.equal(rows[2][3], 'Planlıydı, kayıt yok');
});

test('dosya adında yalnız baş harf', () => {
  assert.equal(csvName('zor-anlar', 'İpek Yılmaz', '2026-10-01', '2026-10-28'), 'zor-anlar-i-2026-10-01_2026-10-28.csv');
});
