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
