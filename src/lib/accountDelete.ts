// "Hesabın silinsin mi?" uyarısının metni (ortak hukuk/50-uygulama-ici-metinler.md §5.2). Saf işlev; testi tests/accountDelete.test.mjs.
// Üç durum: tek kişilik klinik (klinik ve içindekiler silinir) · ekipte sahip (klinik kalır, sahiplik devredilir) · ekip üyesi.
// familyKeeps: sunucu "ailenin kayıtları ailede kalır" kuralını uyguluyor (ortak 20261120200000_family_keeps_records.sql;
// kullanıcının hukuk kararı 20 Kasım 2026, 3A). Uygulanmadıysa önceki metin gösterilir: uygulama sunucunun yapmadığını söylemez.
export type DeleteCase = 'solo' | 'owner' | 'member';

const END = ' App Store üyeliğin varsa Apple Ayarlar\'dan ayrıca kapat. Bu işlem geri alınamaz.';

// training: ebeveyn eğitimi bayrağı (`parent_training`); kapalıyken eğitim sözleri yok (ortak hukuk/50 §5.2, 23 Kasım 2026)
export function deleteAccountText(kind: DeleteCase, familyKeeps: boolean, training = false): string {
  if (kind === 'owner') return 'Klinik kalır; sahiplik ekibin en eski üyesine geçer. Kliniğe ait kayıtlar klinikte kalır. Yalnız senin hesabın silinir. Bu işlem geri alınamaz.';
  if (kind === 'member') return 'Yalnız senin hesabın silinir. Kliniğe ait kayıtlar klinikte kalır. Bu işlem geri alınamaz.';
  if (!familyKeeps) {
    return 'Kliniğin ve içindeki her şey silinir: danışan paylaşımları, notlar, davranış hedefleri, haftalık değerlendirmeler, rutin ve adım önerileri, takip planları, davetler ve üyelik kaydı. Ailelerin Moyo\'daki kendi verileri silinmez; yalnız seninle paylaşımları biter. Saklaman gereken kayıtları önce yazdır.' + END;
  }
  if (!training) {
    return 'Kliniğin ve içindeki her şey silinir: danışan paylaşımları, notlar, davranış hedefleri, değerlendirmeler, rutin ve adım önerileri, hedef davranışlar, takip planları, davetler ve üyelik kaydı.'
      + ' Ailelerin Moyo\'daki kendi verileri silinmez; yalnız seninle paylaşımları biter.'
      + ' Ailenin hedef davranışlara bildirdiği olaylar (davranışın adıyla) ailede kalır; sen ve kliniğin bunlara artık erişemezsiniz.'
      + ' Kayıtların, ailenin izniyle sonraki uzmana aktarımı da sona erer.'
      + ' Mevzuatın sana yüklediği kayıt saklama yükümlülüğü sende; saklaman gereken kayıtları silmeden önce indir ya da yazdır.' + END;
  }
  return 'Kliniğin ve içindeki her şey silinir: danışan paylaşımları, notlar, davranış hedefleri, değerlendirmeler, rutin ve adım önerileri, taslak ebeveyn eğitimleri, eğitimlerdeki gözlem verilerin ve ustalık ölçütlerin, hedef davranışlar, takip planları, davetler ve üyelik kaydı.'
    + ' Ailelerin Moyo\'daki kendi verileri silinmez; yalnız seninle paylaşımları biter.'
    + ' Ailelere gönderdiğin eğitimler, ebeveynlerin bu eğitimlere verdiği yanıtlar ve kayıtlarla birlikte, ailenin hedef davranışlara bildirdiği olaylar da (davranışın adıyla) ailede kalır; sen ve kliniğin bunlara artık erişemezsiniz.'
    + ' Kayıtların, ailenin izniyle sonraki uzmana aktarımı da sona erer.'
    + ' Mevzuatın sana yüklediği kayıt saklama yükümlülüğü sende; saklaman gereken kayıtları silmeden önce indir ya da yazdır.' + END;
}

// ---------- Son adım: şifre (ortak sozlesme/akislar.md 28, satır 4) ----------
// Uyarı onaylandıktan sonra şifre sorulur. Uygulama aynı e-postayla `signInWithPassword` çağırır: şifre yanlışsa silme hiç
// çağrılmaz; doğruysa hemen `delete_account()`. Sunucu "son 10 dakikada şifreyle giriş" şartını ararsa (bayrak
// `delete_recent_login`; hata ipucu `recent_login_required`) şifre penceresi yeniden açılır.
export const DELETE_PASSWORD_TITLE = 'Hesabını silmek için şifreni gir';
export const WRONG_PASSWORD = 'Şifre yanlış';
export const REENTER_PASSWORD = 'Güvenlik için şifreni yeniden gir.';
export const RECENT_LOGIN_HINT = 'recent_login_required';

export function isRecentLoginRequired(e: unknown): boolean {
  return (e as { hint?: unknown } | null | undefined)?.hint === RECENT_LOGIN_HINT;
}

export type DeleteOutcome =
  | { kind: 'deleted' }
  | { kind: 'empty' }                           // şifre yazılmadı: hiçbir şey çağrılmaz
  | { kind: 'wrong_password' }                  // silme çağrılmadı
  | { kind: 'reauth' }                          // sunucu yeni giriş istedi: şifre yeniden sorulur
  | { kind: 'signin_error'; error: unknown }    // ağ, deneme sınırı…: silme çağrılmadı
  | { kind: 'delete_error'; error: unknown };

// signIn: şifre doğruysa null, değilse Auth hatası döner (ya da atar). remove: `delete_account()` (hata atar).
// wrong: hatanın "şifre yanlış" olup olmadığı (lib/authErrors.ts isWrongPassword).
export async function deleteWithPassword(password: string, deps: {
  signIn: (password: string) => Promise<unknown>;
  remove: () => Promise<void>;
  wrong: (e: unknown) => boolean;
}): Promise<DeleteOutcome> {
  if (!password) return { kind: 'empty' };
  let error: unknown;
  try { error = await deps.signIn(password); } catch (e) { error = e; }
  if (error) return deps.wrong(error) ? { kind: 'wrong_password' } : { kind: 'signin_error', error };
  try {
    await deps.remove();
  } catch (e) {
    return isRecentLoginRequired(e) ? { kind: 'reauth' } : { kind: 'delete_error', error: e };
  }
  return { kind: 'deleted' };
}
