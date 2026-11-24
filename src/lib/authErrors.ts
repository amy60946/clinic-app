// Supabase Auth hatalarının ekranda görünen Türkçe metni ve şifre güvenliği metinleri (ortak sozlesme/akislar.md 28).
// Saf işlevler; testi tests/authErrors.test.mjs. Uygulama `lib/auth.tsx` üzerinden kullanır (authErrorText oradan da dışa aktarılır).
import { errorText } from './errors.ts';

// weak_password (Supabase: sızdırılmış şifre koruması + en az 8 karakter + harf ve rakam). Nedenler `length`, `characters`, `pwned`:
// sızıntı listesindeki şifre ayrı söylenir, ötekilerde kuralın tamamı.
export const WEAK_PASSWORD_PWNED = 'Bu şifre başka sitelerdeki sızıntı listelerinde var. Güvenliğin için başka bir şifre seç.';
export const WEAK_PASSWORD_RULE = 'Şifre en az 8 karakter olmalı, harf ve rakam içermeli.';
export function weakPasswordText(reasons: unknown): string {
  return Array.isArray(reasons) && reasons.includes('pwned') ? WEAK_PASSWORD_PWNED : WEAK_PASSWORD_RULE;
}

// Girişte `signInWithPassword` yanıtı `weakPassword` taşıyorsa (eski hesap, şifresi artık kurala uymuyor): giriş sürer,
// giriş başına bir kez öneri. Düğmeler "Şimdi yenile" (yeni şifre ekranı) ve "Sonra".
export const WEAK_PASSWORD_PROMPT = 'Şifren güvenli değil; yenilemek ister misin?';
export const WEAK_PASSWORD_NOW = 'Şimdi yenile';
export const WEAK_PASSWORD_LATER = 'Sonra';
export function hasWeakPassword(data: unknown): boolean {
  const w = (data as { weakPassword?: { reasons?: unknown } | null } | null | undefined)?.weakPassword;
  return !!w && Array.isArray(w.reasons) && w.reasons.length > 0;
}

// Şifre yanlış mı (hesap silmeden önceki şifre penceresi)? Eski sunucu kodu göndermezse metne bakılır.
export function isWrongPassword(e: unknown): boolean {
  const err = e as { code?: unknown; message?: unknown } | null | undefined;
  return err?.code === 'invalid_credentials' || (typeof err?.message === 'string' && /invalid login credentials/i.test(err.message));
}

const TOO_MANY = 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.';

// Supabase hata kodlarını sade Türkçe mesajlara çevir. Tanınmayan kodda ham (İngilizce) sunucu metni gösterilmez: `errorText`
// yalnız bizim Türkçe metinlerimizi geçirir, ötekiler genel metne düşer.
export function authErrorText(e: unknown): string {
  const err = e as { code?: string; message?: string; status?: number; reasons?: unknown } | null | undefined;
  switch (err?.code) {
    case 'invalid_credentials': return 'E-posta ya da şifre hatalı.';
    case 'email_not_confirmed': return 'E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.';
    case 'user_already_exists':
    case 'email_exists': return 'Bu e-posta kullanımda. Başka bir e-posta yaz ya da giriş yap.';
    case 'weak_password': return weakPasswordText(err.reasons);
    case 'same_password': return 'Yeni şifre eskisinden farklı olmalı.';
    case 'email_address_invalid':
    case 'validation_failed': return 'Geçerli bir e-posta adresi yaz.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return TOO_MANY;
    case 'otp_expired': return 'Bağlantının süresi dolmuş. Yeniden iste.';
  }
  if (err?.status === 429) return TOO_MANY;
  const message = typeof err?.message === 'string' ? err.message.toLowerCase() : '';
  if (message.includes('network')) return 'İnternet bağlantını kontrol et.';
  // Kayıt tetikleyicisinin Türkçe hataları (ekip kodu, koltuk) Supabase'ten genel bir mesajla döner
  if (message.includes('database error saving new user')) {
    return 'Kayıt tamamlanamadı. Ekip kodu yazdıysan doğru yazdığından, 15 dakikalık süresinin dolmadığından ve kliniğin uzman koltuğunun dolu olmadığından emin ol; gerekirse klinik sahibinden yeni kod iste.';
  }
  return errorText(e, 'Bir şeyler ters gitti. Tekrar dene.');
}
