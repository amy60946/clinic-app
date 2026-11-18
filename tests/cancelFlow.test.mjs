// İptal öncesi akış kuralları (src/lib/cancelFlow.ts). Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { reasonsFor, alternativeFor } from '../src/lib/cancelFlow.ts';

const plan = (p = {}) => ({ pkg: 'clinic', period: 'monthly', members: 3, gift: 2, help: true, ...p });
const actions = (a) => (a ? a.actions.map((x) => x.id) : null);

test('nedenler: ekip sorusu yalnız Klinik planında; sıra sabit', () => {
  assert.deepEqual(reasonsFor('clinic').map((r) => r.id), ['few_clients', 'expensive', 'team_small', 'families', 'pause', 'feature', 'switching', 'problem', 'other']);
  assert.deepEqual(reasonsFor('solo').map((r) => r.id), ['few_clients', 'expensive', 'families', 'pause', 'feature', 'switching', 'problem', 'other']);
  assert.equal(reasonsFor('clinic')[2].label, 'Ekibim kullanmıyor ya da ekip küçüldü');
});

test('az danışan / ekip küçüldü: Klinik → Bireysel; Bireysel yıllık → aylık; yoksa doğrudan çıkış', () => {
  for (const r of ['few_clients', 'team_small']) {
    const a = alternativeFor(r, plan());
    assert.deepEqual(actions(a), ['solo']);
    assert.deepEqual(a.lines, ['Bireysel plan tek uzman içindir.']);
    assert.equal(a.actions[0].label, 'Bireysel plana geç');
  }
  const m = alternativeFor('few_clients', plan({ pkg: 'solo', period: 'yearly' }));
  assert.deepEqual(actions(m), ['monthly']);
  assert.equal(m.actions[0].label, 'Aylık plana geç');
  assert.equal(alternativeFor('few_clients', plan({ pkg: 'solo', period: 'monthly' })), null);
  assert.equal(alternativeFor('few_clients', plan({ pkg: 'solo', period: null })), null);
});

test('pahalı geldi: aylıkta hesaplanan yıllık avantaj; tek uzmanlı Klinik\'te ayrıca Bireysel; gösterecek bir şey yoksa çıkış', () => {
  let a = alternativeFor('expensive', plan());
  assert.deepEqual(actions(a), ['yearly']);
  assert.deepEqual(a.lines, ['Yıllık pakette 2 ay hediye.']);
  assert.equal(a.actions[0].label, 'Paketleri gör');
  a = alternativeFor('expensive', plan({ members: 1 }));
  assert.deepEqual(actions(a), ['yearly', 'solo']);
  // avantaj hesaplanamıyorsa (fiyat yok) yazılmaz; yıllık planda zaten yazılmaz
  assert.deepEqual(actions(alternativeFor('expensive', plan({ gift: 0, members: 1 }))), ['solo']);
  assert.equal(alternativeFor('expensive', plan({ gift: 0 })), null);
  assert.equal(alternativeFor('expensive', plan({ period: 'yearly' })), null);
  assert.equal(alternativeFor('expensive', plan({ pkg: 'solo', period: 'yearly', members: 1 })), null);
  assert.deepEqual(actions(alternativeFor('expensive', plan({ pkg: 'solo', members: 1 }))), ['yearly']);
});

test('öteki nedenler: ipuçları + bize yaz, dondurma açıklaması, dışa aktarma bilgisi; indirim ve serbest metin yok', () => {
  assert.deepEqual(actions(alternativeFor('families', plan())), ['help', 'support']);
  assert.deepEqual(actions(alternativeFor('families', plan({ help: false }))), ['support']);
  const pause = alternativeFor('pause', plan());
  assert.deepEqual(actions(pause), []);
  assert.match(pause.lines[0], /^App Store'da abonelik dondurulamıyor\. İptal edersen üyeliğin dönem sonuna kadar açık kalır/);
  const sw = alternativeFor('switching', plan());
  assert.deepEqual(actions(sw), []);
  assert.deepEqual(sw.lines, ['Raporları ve CSV dosyalarını danışan sayfalarından indirebilirsin.']);
  for (const r of ['feature', 'problem', 'other']) assert.deepEqual(actions(alternativeFor(r, plan())), ['support']);
  // hiçbir metinde indirim, yüzde, geri sayım ya da uydurma sayı yok (yalnız hesaplanan "n ay hediye")
  for (const pkg of ['solo', 'clinic']) for (const period of ['monthly', 'yearly']) for (const r of reasonsFor(pkg)) {
    const a = alternativeFor(r.id, plan({ pkg, period, members: 1 }));
    const text = a ? [a.title, ...a.lines, ...a.actions.map((x) => x.label)].join(' ') : '';
    assert.ok(!/indirim|%|son şans|emin misin|kaybed/i.test(text), text);
  }
});
