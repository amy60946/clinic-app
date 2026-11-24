// Şifre güvenliği metinleri ve Auth hata metni (ortak sozlesme/akislar.md 28, satır 2–3)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  authErrorText, weakPasswordText, hasWeakPassword, isWrongPassword, WEAK_PASSWORD_PWNED, WEAK_PASSWORD_RULE,
} from '../src/lib/authErrors.ts';

test('zayıf şifre: sızıntı listesindeyse ayrı metin, ötekilerde kuralın tamamı', () => {
  assert.equal(weakPasswordText(['pwned']), 'Bu şifre başka sitelerdeki sızıntı listelerinde var. Güvenliğin için başka bir şifre seç.');
  assert.equal(weakPasswordText(['length', 'pwned']), WEAK_PASSWORD_PWNED);
  assert.equal(weakPasswordText(['length']), 'Şifre en az 8 karakter olmalı, harf ve rakam içermeli.');
  assert.equal(weakPasswordText(['characters']), WEAK_PASSWORD_RULE);
  for (const r of [[], undefined, null, 'pwned']) assert.equal(weakPasswordText(r), WEAK_PASSWORD_RULE);
});

test('authErrorText: weak_password nedenlere göre (kayıt ve yeni şifre aynı işlevi kullanır)', () => {
  assert.equal(authErrorText({ code: 'weak_password', reasons: ['pwned'], message: 'Password is known to be weak' }), WEAK_PASSWORD_PWNED);
  assert.equal(authErrorText({ code: 'weak_password', reasons: ['characters'], message: 'x' }), WEAK_PASSWORD_RULE);
  assert.equal(authErrorText({ code: 'weak_password', message: 'x' }), WEAK_PASSWORD_RULE);
});

test('authErrorText: bilinen kodlar Türkçe, tanınmayan İngilizce metin ekrana çıkmaz', () => {
  assert.equal(authErrorText({ code: 'invalid_credentials', message: 'Invalid login credentials' }), 'E-posta ya da şifre hatalı.');
  assert.equal(authErrorText({ status: 429, message: 'Too many requests' }), 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.');
  assert.equal(authErrorText(new Error('Network request failed')), 'İnternet bağlantını kontrol et.');
  assert.equal(authErrorText({ message: 'Signups not allowed for this instance' }), 'Bir şeyler ters gitti. Tekrar dene.');
  assert.equal(authErrorText(null), 'Bir şeyler ters gitti. Tekrar dene.');
  assert.equal(authErrorText({ message: 'Kliniğin uzman koltuğu dolu' }), 'Kliniğin uzman koltuğu dolu');
});

test('girişte weakPassword: yalnız nedenli yanıt öneri açar', () => {
  assert.equal(hasWeakPassword({ session: {}, weakPassword: { reasons: ['pwned'], message: 'x' } }), true);
  assert.equal(hasWeakPassword({ session: {}, weakPassword: { reasons: [] } }), false);
  assert.equal(hasWeakPassword({ session: {} }), false);
  assert.equal(hasWeakPassword(null), false);
});

test('şifre yanlış: kod ya da (eski sunucuda) metin', () => {
  assert.equal(isWrongPassword({ code: 'invalid_credentials' }), true);
  assert.equal(isWrongPassword({ message: 'Invalid login credentials' }), true);
  assert.equal(isWrongPassword({ status: 429, message: 'Too many requests' }), false);
  assert.equal(isWrongPassword(null), false);
});
