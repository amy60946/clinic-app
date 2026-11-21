// "Hesabın silinsin mi?" uyarısının metni (ortak hukuk/50-uygulama-ici-metinler.md §5.2). Saf işlev; testi tests/accountDelete.test.mjs.
// Üç durum: tek kişilik klinik (klinik ve içindekiler silinir) · ekipte sahip (klinik kalır, sahiplik devredilir) · ekip üyesi.
// familyKeeps: sunucu "ailenin kayıtları ailede kalır" kuralını uyguluyor (ortak 20261120200000_family_keeps_records.sql;
// kullanıcının hukuk kararı 20 Kasım 2026, 3A). Uygulanmadıysa önceki metin gösterilir: uygulama sunucunun yapmadığını söylemez.
export type DeleteCase = 'solo' | 'owner' | 'member';

const END = ' App Store üyeliğin varsa Apple Ayarlar\'dan ayrıca kapat. Bu işlem geri alınamaz.';

export function deleteAccountText(kind: DeleteCase, familyKeeps: boolean): string {
  if (kind === 'owner') return 'Klinik kalır; sahiplik ekibin en eski üyesine geçer. Kliniğe ait kayıtlar klinikte kalır. Yalnız senin hesabın silinir. Bu işlem geri alınamaz.';
  if (kind === 'member') return 'Yalnız senin hesabın silinir. Kliniğe ait kayıtlar klinikte kalır. Bu işlem geri alınamaz.';
  if (!familyKeeps) {
    return 'Kliniğin ve içindeki her şey silinir: danışan paylaşımları, notlar, davranış hedefleri, haftalık değerlendirmeler, rutin ve adım önerileri, takip planları, davetler ve üyelik kaydı. Ailelerin Moyo\'daki kendi verileri silinmez; yalnız seninle paylaşımları biter. Saklaman gereken kayıtları önce yazdır.' + END;
  }
  return 'Kliniğin ve içindeki her şey silinir: danışan paylaşımları, notlar, davranış hedefleri, değerlendirmeler, rutin ve adım önerileri, taslak ebeveyn eğitimleri, eğitimlerdeki gözlem verilerin ve ustalık ölçütlerin, hedef davranışlar, takip planları, davetler ve üyelik kaydı.'
    + ' Ailelerin Moyo\'daki kendi verileri silinmez; yalnız seninle paylaşımları biter.'
    + ' Ailelere gönderdiğin eğitimler, ebeveynlerin bu eğitimlere verdiği yanıtlar ve kayıtlarla birlikte, ailenin hedef davranışlara bildirdiği olaylar da (davranışın adıyla) ailede kalır; sen ve kliniğin bunlara artık erişemezsiniz.'
    + ' Kayıtların, ailenin izniyle sonraki uzmana aktarımı da sona erer.'
    + ' Mevzuatın sana yüklediği kayıt saklama yükümlülüğü sende; saklaman gereken kayıtları silmeden önce indir ya da yazdır.' + END;
}
