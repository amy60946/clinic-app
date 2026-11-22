// Ekrana çıkan hata metni (güvenlik denetimi 22 Kasım 2026): Türkçe sunucu metni gösterilir, teknik / İngilizce metin genel metne düşer
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { errorText, GENERIC_ERROR, NETWORK_ERROR } from '../src/lib/errors.ts';

test('bizim Türkçe sunucu metni olduğu gibi', () => {
  const m = 'Ailenin uygulama kaydı olan program silinemez; durumunu "Tamamlandı" yapabilirsin';
  assert.equal(errorText(new Error(m)), m);
  assert.equal(errorText('Ekip kodu geçersiz.'), 'Ekip kodu geçersiz.');
});
test('teknik ya da İngilizce metin genel metne düşer', () => {
  for (const m of [
    'new row violates row-level security policy for table "care_modules"',
    'duplicate key value violates unique constraint "clinic_links_pkey"',
    'JWT expired', 'invite_owner_only', 'module_has_family_logs', 'relation "public.x" does not exist',
    'Could not find the function public.clinic_calendar_feed(p_action) in the schema cache',
  ]) assert.equal(errorText(new Error(m)), GENERIC_ERROR, m);
});
test('ağ hatası', () => {
  assert.equal(errorText(new TypeError('Failed to fetch')), NETWORK_ERROR);
  assert.equal(errorText(new Error('Network request failed')), NETWORK_ERROR);
});
test('boş, eksik ya da çok uzun metin', () => {
  assert.equal(errorText(null), GENERIC_ERROR);
  assert.equal(errorText({}), GENERIC_ERROR);
  assert.equal(errorText(new Error('')), GENERIC_ERROR);
  assert.equal(errorText(new Error('ş'.repeat(301))), GENERIC_ERROR);
  assert.equal(errorText(undefined, 'Biraz sonra yeniden dene.'), 'Biraz sonra yeniden dene.');
});
