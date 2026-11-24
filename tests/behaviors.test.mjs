// Davranışlar ve Olaylar: "Diğer bildirilen olaylar"ın birleşik listesi, bildirimden gelen kaydın yeri ve kayıt türü çoklu seçim
// (tür listesi, tablo sütunları, olay formu; ortak akislar.md 27.3) (behaviorRows). Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  otherRows, locateFocus, abcWhen, OTHER,
  normLogTypes, behaviorTypes, incidentTypes, typesShown, detailCols, toggleLogType, missingFields,
} from '../src/lib/behaviorRows.ts';

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

test('kayıt türleri sabit sırada ve tekil; bilinmeyen düşer', () => {
  assert.deepEqual(normLogTypes(['duration', 'abc', 'abc', 'x', null]), ['abc', 'duration']);
  assert.deepEqual(normLogTypes(null), []);
});

test('davranışın türleri: log_types, sütun yoksa eski log_type', () => {
  assert.deepEqual(behaviorTypes({ log_type: 'abc', log_types: ['duration', 'abc'] }), ['abc', 'duration']);
  assert.deepEqual(behaviorTypes({ log_type: 'duration' }), ['duration']);          // eski sunucu: sütun yok
  assert.deepEqual(behaviorTypes({ log_type: 'abc', log_types: [] }), ['abc']);
  assert.deepEqual(behaviorTypes({}), ['frequency']);
});

test('olayın kendi türleri: log_types, yoksa log_type, o da yoksa davranışınki', () => {
  assert.deepEqual(incidentTypes({ log_type: 'abc', log_types: ['abc', 'duration'] }, ['frequency']), ['abc', 'duration']);
  assert.deepEqual(incidentTypes({ log_type: 'frequency' }, ['abc']), ['frequency']);
  assert.deepEqual(incidentTypes({ log_type: null, log_types: null }, ['abc']), ['abc']);
});

test('tablo: davranışın bütün türleri + eski olayların kendi türleri', () => {
  // davranış sonradan ABC + Süre oldu; eski olay sıklıkla bildirilmişti
  const b = { log_type: 'abc', log_types: ['abc', 'duration'] };
  assert.deepEqual(typesShown(b, [{ log_type: 'frequency', log_types: ['frequency'] }, { log_type: 'abc', log_types: ['abc'] }]),
    ['frequency', 'abc', 'duration']);
  assert.deepEqual(typesShown(b, []), ['abc', 'duration']);
  // eski sunucu: yalnız log_type
  assert.deepEqual(typesShown({ log_type: 'duration' }, [{ log_type: 'abc' }]), ['abc', 'duration']);
});

test('sütunlar: sıklık → Sayı, ABC → Öncül + Sonuç, süre → Süre', () => {
  assert.deepEqual(detailCols(['frequency']), ['count']);
  assert.deepEqual(detailCols(['duration', 'abc']), ['antecedent', 'consequence', 'duration']);
  assert.deepEqual(detailCols(['abc', 'frequency', 'duration']), ['count', 'antecedent', 'consequence', 'duration']);
});

test('çoklu seçim: ekle / çıkar, en az biri kalır', () => {
  assert.deepEqual(toggleLogType(['frequency'], 'duration'), ['frequency', 'duration']);
  assert.deepEqual(toggleLogType(['abc', 'duration'], 'abc'), ['duration']);
  assert.deepEqual(toggleLogType(['abc'], 'abc'), ['abc']);
  assert.deepEqual(toggleLogType(['duration'], 'frequency'), ['frequency', 'duration']);
});

test('olay formu: seçili her türün alanı zorunlu (family_incident_report)', () => {
  const empty = { count: '', minutes: '', before: '', after: '' };
  assert.deepEqual(missingFields(['abc', 'duration'], empty), ['abc', 'duration']);
  assert.deepEqual(missingFields(['abc', 'duration'], { ...empty, before: 'a', after: 'b' }), ['duration']);
  assert.deepEqual(missingFields(['abc', 'duration'], { ...empty, before: 'a', after: ' ', minutes: '0' }), ['abc']);   // 0 dakika geçerli
  assert.deepEqual(missingFields(['frequency'], { ...empty, count: '0' }), ['frequency']);                          // sayı en az 1
  assert.deepEqual(missingFields(['frequency', 'abc', 'duration'], { count: '2', minutes: '5', before: 'a', after: 'b' }), []);
});
