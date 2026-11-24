// Hesap silme uyarısı metni (ortak hukuk/50 §5.2): sunucu kuralına göre doğru metin
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deleteAccountText } from '../src/lib/accountDelete.ts';

test('tek kişilik klinik: sunucu yeni kuralı uygulamıyorsa önceki metin', () => {
  const t = deleteAccountText('solo', false);
  assert.match(t, /Kliniğin ve içindeki her şey silinir/);
  assert.doesNotMatch(t, /ailede kalır/, 'sunucunun yapmadığı şey söylenmez');
  assert.match(t, /Bu işlem geri alınamaz\.$/);
});

test('tek kişilik klinik: sunucu yeni kuralı uyguluyorsa ailede kalanlar ve erişimin bittiği yazar', () => {
  const t = deleteAccountText('solo', true, true);
  assert.match(t, /Ailelere gönderdiğin eğitimler/);
  assert.match(t, /ailenin hedef davranışlara bildirdiği olaylar da \(davranışın adıyla\) ailede kalır/);
  assert.match(t, /sen ve kliniğin bunlara artık erişemezsiniz/);
  assert.match(t, /taslak ebeveyn eğitimleri/, 'taslaklar silinenler arasında');
  assert.match(t, /sonraki uzmana aktarımı da sona erer/);
  assert.match(t, /saklaman gereken kayıtları silmeden önce indir ya da yazdır/);
  assert.match(t, /Bu işlem geri alınamaz\.$/);
});

test('ekipte sahip ve ekip üyesi: klinik kalır, metin sunucu kuralından bağımsız', () => {
  for (const keeps of [false, true]) {
    assert.match(deleteAccountText('owner', keeps), /sahiplik ekibin en eski üyesine geçer/);
    assert.match(deleteAccountText('member', keeps), /^Yalnız senin hesabın silinir\./);
    assert.equal(deleteAccountText('owner', keeps), deleteAccountText('owner', !keeps));
    assert.equal(deleteAccountText('member', keeps), deleteAccountText('member', !keeps));
  }
});

test('tek kişilik klinik: ebeveyn eğitimi kapalıyken eğitim sözü yok (hukuk/50 §5.2, 23 Kasım 2026)', () => {
  const t = deleteAccountText('solo', true);
  assert.doesNotMatch(t, /eğitim/i);
  assert.match(t, /ailenin hedef davranışlara bildirdiği olaylar \(davranışın adıyla\) ailede kalır/i);
  assert.match(t, /sonraki uzmana aktarımı da sona erer/);
  assert.match(t, /Bu işlem geri alınamaz\.$/);
});

// ---------- Son adım: şifre (ortak akislar.md 28, satır 4) ----------
import { deleteWithPassword, isRecentLoginRequired, RECENT_LOGIN_HINT } from '../src/lib/accountDelete.ts';
import { isWrongPassword } from '../src/lib/authErrors.ts';

const deps = (signInError, removeError) => {
  const calls = [];
  return {
    calls,
    signIn: async (pw) => { calls.push(`signIn:${pw}`); return signInError ?? null; },
    remove: async () => { calls.push('remove'); if (removeError) throw removeError; },
    wrong: isWrongPassword,
  };
};

test('şifre yanlış: "wrong_password", silme hiç çağrılmaz', async () => {
  const d = deps({ code: 'invalid_credentials', message: 'Invalid login credentials' });
  assert.deepEqual(await deleteWithPassword('yanlis', d), { kind: 'wrong_password' });
  assert.deepEqual(d.calls, ['signIn:yanlis']);
});

test('şifre doğru: hemen silinir', async () => {
  const d = deps(null);
  assert.deepEqual(await deleteWithPassword('12345678', d), { kind: 'deleted' });
  assert.deepEqual(d.calls, ['signIn:12345678', 'remove']);
});

test('boş şifre: giriş de silme de çağrılmaz', async () => {
  const d = deps(null);
  assert.deepEqual(await deleteWithPassword('', d), { kind: 'empty' });
  assert.deepEqual(d.calls, []);
});

test('giriş başka nedenle olmadı (ağ, deneme sınırı): silme çağrılmaz, hata döner', async () => {
  const err = { status: 429, message: 'Too many requests' };
  const d = deps(err);
  assert.deepEqual(await deleteWithPassword('12345678', d), { kind: 'signin_error', error: err });
  assert.deepEqual(d.calls, ['signIn:12345678']);
  const thrown = new TypeError('Failed to fetch');
  const r = await deleteWithPassword('12345678', { ...deps(null), signIn: async () => { throw thrown; } });
  assert.deepEqual(r, { kind: 'signin_error', error: thrown });
});

test('sunucu yeni giriş isterse (recent_login_required) şifre yeniden sorulur; öteki hata "delete_error"', async () => {
  const hint = Object.assign(new Error('Hesabı silmek için şifreni yeniden girmelisin'), { hint: RECENT_LOGIN_HINT });
  assert.deepEqual(await deleteWithPassword('12345678', deps(null, hint)), { kind: 'reauth' });
  const other = new Error('Bir şey oldu');
  assert.deepEqual(await deleteWithPassword('12345678', deps(null, other)), { kind: 'delete_error', error: other });
  assert.equal(isRecentLoginRequired({ hint: 'recent_login_required' }), true);
  assert.equal(isRecentLoginRequired(new Error('recent_login_required')), false);
  assert.equal(isRecentLoginRequired(null), false);
});
