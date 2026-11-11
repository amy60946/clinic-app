// Dikkat panosu (src/lib/attention.ts). Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reasonsFor, sectionOf, buildBoard, relDay, trainingReasons } from '../src/lib/attention.ts';

const now = new Date('2026-11-02T12:00:00Z');
const ago = (d, h = 0) => new Date(now.getTime() - d * 86400000 - h * 3600000).toISOString();
const att = (p = {}) => ({
  link_id: 'L', last_family_at: ago(1), done_7d: 3, abc_7d: 0, abc_last_at: null, logs_7d: 0, decided_7d: 0, decided_last_at: null,
  pending: 0, drafts: 0, plan_unsent: 0, goals_active: 2, review_due: 0, plan_published_at: ago(10), ...p,
});
const keys = (r) => r.map((x) => x.key);

test('nedenler: gönderilmemiş, değerlendirme zamanı, plan yok; yalnız olgu', () => {
  assert.deepEqual(keys(reasonsFor(att({ drafts: 1, plan_unsent: 2, review_due: 1 }), undefined, ago(30), now)), ['unsent', 'review']);
  assert.equal(reasonsFor(att({ drafts: 1, plan_unsent: 2 }), undefined, ago(30), now)[0].text, '3 değişiklik gönderilmedi');
  assert.deepEqual(keys(reasonsFor(att({ goals_active: 0, plan_published_at: null }), undefined, ago(30), now)), ['noplan']);
  assert.deepEqual(keys(reasonsFor(att({ goals_active: 0, plan_published_at: null, drafts: 1 }), undefined, ago(30), now)), ['unsent'],
    'taslağı olan danışanda "plan yok" denmez');
  assert.deepEqual(keys(reasonsFor(att(), undefined, ago(30), now)), [], 'olağan danışanda neden yok');
});

test('aileden yeni: son 7 gün; "Gördüm"den sonra yeni bir şey gelene kadar çıkmaz', () => {
  const a = att({ abc_7d: 2, abc_last_at: ago(0, 3), decided_7d: 1, decided_last_at: ago(2) });
  assert.deepEqual(keys(reasonsFor(a, undefined, ago(30), now)), ['abc', 'decided']);
  assert.equal(reasonsFor(a, undefined, ago(30), now)[0].text, '2 davranış kaydı · bugün');
  assert.deepEqual(keys(reasonsFor(a, ago(1), ago(30), now)), ['abc'], 'görüldükten sonra yalnız yeni davranış kaydı');
  assert.deepEqual(keys(reasonsFor(a, ago(0, 1), ago(30), now)), [], 'hepsi görüldü');
});

test('sessiz: 7+ gün kayıt yok; yeni paylaşım (7 günden genç) sessiz sayılmaz', () => {
  assert.equal(reasonsFor(att({ last_family_at: ago(9) }), undefined, ago(30), now)[0].text, '9 gündür kayıt yok');
  assert.equal(reasonsFor(att({ last_family_at: null }), undefined, ago(30), now)[0].text, 'Henüz kayıt yok');
  assert.deepEqual(keys(reasonsFor(att({ last_family_at: null }), undefined, ago(3), now)), []);
});

test('bölüm önceliği: senin sıran > aileden yeni > sessiz; sıra son kayda göre', () => {
  assert.equal(sectionOf([{ key: 'abc', family: true }, { key: 'review' }]), 'mine');
  assert.equal(sectionOf([{ key: 'abc', family: true }]), 'family');
  assert.equal(sectionOf([{ key: 'quiet' }]), 'quiet');
  assert.equal(sectionOf([{ key: 'pending' }]), 'rest', 'bekleyen öneri tek başına bölüm açmaz');
  const clients = [
    { link_id: 'a', consent_at: ago(30) }, { link_id: 'b', consent_at: ago(30) }, { link_id: 'c', consent_at: ago(30) },
    { link_id: 'd', consent_at: ago(30) }, { link_id: 'yeni', consent_at: ago(1) },
  ];
  const board = buildBoard(clients, {
    a: att({ link_id: 'a', abc_7d: 1, abc_last_at: ago(1), last_family_at: ago(1) }),
    b: att({ link_id: 'b', abc_7d: 1, abc_last_at: ago(0, 2), last_family_at: ago(0, 2) }),
    c: att({ link_id: 'c', last_family_at: ago(12) }),
    d: att({ link_id: 'd', review_due: 1 }),
  }, {}, now);
  assert.deepEqual(board.family.map((r) => r.client.link_id), ['b', 'a'], 'en yeni kayıt üstte');
  assert.deepEqual(board.mine.map((r) => r.client.link_id), ['d']);
  assert.deepEqual(board.quiet.map((r) => r.client.link_id), ['c']);
  assert.deepEqual(board.rest.map((r) => r.client.link_id), ['yeni'], 'özetinde olmayan danışan diğerlerde');
});

test('göreli gün', () => {
  assert.equal(relDay(ago(0, 1), now), 'bugün');
  assert.equal(relDay(ago(1, 1), now), 'dün');
  assert.equal(relDay(ago(4), now), '4 gün önce');
});

// Lansman odağı "A" (10 Kasım 2026): Takip Planı kapalıyken plan nedenleri düşer, "Senin sıran" ebeveyn eğitimine bakar
test('Takip Planı kapalı: plan nedenleri yok, eğitim nedenleri var', () => {
  const clients = ['incele', 'taslak', 'yok', 'tamam'].map((id) => ({ link_id: id, consent_at: ago(30) }));
  const a = { incele: att({ link_id: 'incele', drafts: 2 }), taslak: att({ link_id: 'taslak', review_due: 1 }),
    yok: att({ link_id: 'yok', goals_active: 0, plan_published_at: null }), tamam: att({ link_id: 'tamam', drafts: 1, pending: 1 }) };
  const training = { incele: { total: 1, drafts: 0, review: 2 }, taslak: { total: 2, drafts: 1, review: 0 }, yok: { total: 0, drafts: 0, review: 0 }, tamam: { total: 1, drafts: 0, review: 0 } };
  const board = buildBoard(clients, a, {}, now, { plan: false, training });
  assert.deepEqual(board.mine.map((r) => r.client.link_id).sort(), ['incele', 'taslak', 'yok']);
  const all = Object.values(board).flat();
  assert.ok(all.every((r) => !r.reasons.some((x) => ['unsent', 'review', 'noplan'].includes(x.key))), 'plan nedeni kalmaz');
  assert.deepEqual(keys(all.find((r) => r.client.link_id === 'incele').reasons), ['tr_review']);
  assert.deepEqual(keys(all.find((r) => r.client.link_id === 'tamam').reasons), ['pending'], 'macera önerisi nedeni durur');
  assert.equal(board.rest.map((r) => r.client.link_id).join(), 'tamam');
});

test('eğitim nedenleri: metinler ve boş durum', () => {
  assert.deepEqual(trainingReasons(undefined), [], 'eğitim tabloları yoksa neden eklenmez');
  assert.deepEqual(keys(trainingReasons({ total: 0, drafts: 0, review: 0 })), ['tr_none']);
  assert.equal(trainingReasons({ total: 3, drafts: 2, review: 0 })[0].text, '2 taslak eğitim');
  assert.equal(trainingReasons({ total: 1, drafts: 1, review: 1 }).map((r) => r.key).join(), 'tr_review,tr_draft');
});

test('Takip Planı açık (varsayılan): eski davranış değişmez', () => {
  const clients = [{ link_id: 'a', consent_at: ago(30) }];
  const board = buildBoard(clients, { a: att({ link_id: 'a', drafts: 1 }) }, {}, now);
  assert.deepEqual(keys(board.mine[0].reasons), ['unsent']);
});
