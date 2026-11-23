// Davranışlar ve Olaylar: "Diğer bildirilen olaylar"ın birleşik listesi ve bildirimden gelen kaydın yeri (behaviorRows). Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { otherRows, locateFocus, abcWhen, OTHER } from '../src/lib/behaviorRows.ts';

const iso = (day, hh = 10) => new Date(`${day}T${String(hh).padStart(2, '0')}:00:00`).toISOString();
const inc = (id, day, behavior_id = null) => ({ id, occurred_at: iso(day), behavior_id, other_behavior: behavior_id ? '' : 'x' });
const abc = (id, day, extra = {}) => ({ id, occurred_at: iso(day, 19), antecedent: '', behavior: 'y', consequence: '', intensity: 3, ...extra });
const behaviors = [{ id: 'b1', archived: false }, { id: 'b2', archived: true }];

test('diğer olaylar ve davranış kayıtları tarih sırasıyla, yeniden eskiye', () => {
  const rows = otherRows([inc('i1', '2026-11-20'), inc('i2', '2026-11-18', 'b1'), inc('i3', '2026-11-10', 'silinmis')],
    behaviors, [abc('a1', '2026-11-21'), abc('a2', '2026-11-15')]);
  assert.deepEqual(rows.map((r) => r.key), ['abc:a1', 'incident:i1', 'abc:a2', 'incident:i3']);
});

test('arşivlenen hedef davranışın olayı diğerlerde değil, kendi kartında', () => {
  const rows = otherRows([inc('i1', '2026-11-20', 'b2')], behaviors, []);
  assert.equal(rows.length, 0);
  assert.deepEqual(locateFocus({ kind: 'incident', id: 'i1' }, behaviors, [inc('i1', '2026-11-20', 'b2')], []),
    { card: 'b2', archived: true, row: 'incident:i1' });
});

test('bildirimden gelen kaydın yeri', () => {
  const incidents = [inc('i1', '2026-11-20', 'b1'), inc('i2', '2026-11-19')];
  const list = [abc('a1', '2026-11-21')];
  assert.deepEqual(locateFocus({ kind: 'incident', id: 'i1' }, behaviors, incidents, list), { card: 'b1', archived: false, row: 'incident:i1' });
  assert.deepEqual(locateFocus({ kind: 'incident', id: 'i2' }, behaviors, incidents, list), { card: OTHER, archived: false, row: 'incident:i2' });
  assert.deepEqual(locateFocus({ kind: 'abc', id: 'a1' }, behaviors, incidents, list), { card: OTHER, archived: false, row: 'abc:a1' });
  assert.equal(locateFocus({ kind: 'abc', id: 'yok' }, behaviors, incidents, list), null);
});

test('davranış kaydında saat yerine gün bölümü; eski kayıtta saat', () => {
  assert.equal(abcWhen({ occurred_at: iso('2026-11-20', 8), day_part: 'morning' }), 'Sabah');
  assert.equal(abcWhen({ occurred_at: iso('2026-11-20', 19), day_part: null }), '19:00');
});
