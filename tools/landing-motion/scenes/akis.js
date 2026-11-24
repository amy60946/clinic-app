// Ana sayfa ürün turu (kullanıcı isteği 14 Kasım 2026, Atlassian'ın yavaş ürün animasyonu gibi; 24 Kasım 2026'da eğitimsiz yeniden kuruldu,
// ebeveyn eğitimi bütün platformlarda kapalı). 24 Kasım 2026 ikinci tur (kullanıcı: "ekran yukarıdan kesik geliyor, bütün ekran görünmüyor"):
// kamera yakınlaşması ve sayfa kaydırması yok, ekran baştan sona bütün görünür. Dört adım:
// 1 çocuğun haftalık ev rutinlerini görür → 2 ebeveynin davranış kayıtlarına bakar → 3 "+ Hedef davranış ekle" ile yeni bir hedef davranış
// girip kaydeder ("Ebeveyn davranış kaydı" açık: davranış ebeveynin uygulamasına gider) → 4 dönemin raporunu açar ve aileye gönderir.
// Adımlar manifest'te `beat` olarak durur; sayfadaki 1-2-3-4 bunlara göre yanar.
const { card, openClient } = require('./_common');

module.exports = {
  id: 'akis',
  title_tr: 'Uzman ev rutinlerini görür, davranış kayıtlarına bakar, hedef davranış ekler, raporu aileye gönderir',
  device: 'desktop',
  data: { more: true },
  maxBytes: 4e6,
  seed: 14,
  async prepare(h, s) {
    await openClient(s.page);                          // danışan Ev Rutinleri'yle açılır (eğitim kapalı)
    await h.park(1120, 620);
  },
  async run(h, s) {
    const p = s.page;
    const vis = (t) => p.getByText(t, { exact: true }).filter({ visible: true }).first();
    await h.sleep(800);
    h.beat('1 · Ev rutinlerini gör');
    h.poster();                                        // afiş haftalık rutin tablosu
    await h.hover(vis('Okul için giyin'), { dx: 520, force: true, ms: 1000, after: 900 });   // tablonun üstünden: gün gün yapılan, "Yapamam"
    await h.click(vis('Kahvaltını yap'), { after: 1900 });                       // adımın gün gün geçmişi: "Yapamam" nedeni, ebeveynin onayı
    await h.click(p.locator('[aria-label="Kapat"]').filter({ visible: true }).last(), { after: 900 });

    h.beat('2 · Davranış kayıtlarına bak');
    await h.click(vis('Davranışlar ve Olaylar'), { after: 1300 });
    if (h.d.from) await h.click(p.getByRole('button', { name: 'Menüyü kapat', exact: true }), { after: 900 });   // dikeyde olay tablosu tam genişlikte
    await h.click(card(p, 'Ekranı kapatırken ağlama'), { fx: 0.2, after: 1500 });
    await h.hover(vis('Öncül'), { ms: 900, after: 700 });
    await h.hover(vis('Uygulanan strateji'), { ms: 900, after: 1300 });
    await h.click(card(p, 'Ekranı kapatırken ağlama'), { fx: 0.2, after: 900 });   // kart kapanır: yeni davranış listede ekranın ortasında görünsün

    h.beat('3 · Hedef davranış ekle');
    await h.click(vis('+ Hedef davranış ekle'), { after: 1200 });
    await h.click(p.getByPlaceholder('ör. Ekranı kapatırken ağlama').filter({ visible: true }), { after: 400 });
    await h.type('Ödev başında masadan kalkma', { after: 600 });
    await h.click(p.getByPlaceholder('Strateji 1').filter({ visible: true }), { after: 400 });
    await h.type('Görsel zamanlayıcı kur', { after: 700 });
    await h.hover(vis('Ebeveyn davranış kaydı'), { dx: 120, force: true, ms: 900, after: 1300 });   // açık: ebeveyn olayları Moyo Ebeveyn'den bildirir
    await h.click(vis('Kaydet'), { after: 700 });
    const yeni = vis('Ödev başında masadan kalkma');
    await yeni.waitFor({ timeout: 8000 });                                        // liste yenilenir: yeni davranış "Başlangıç: bugün · 0 olay"
    await h.hover(yeni, { ms: 900, after: 1600 });

    h.beat('4 · Raporu aileye gönder');
    if (h.d.from) await h.click(p.getByRole('button', { name: /Menüyü aç$/ }).filter({ visible: true }).first(), { after: 900 });
    await h.click(vis('Rapor'), { after: 1200 });
    await h.click(vis('Raporu aç'), { after: 2200 });
    await h.click(p.getByText('Aileye gönder', { exact: true }).filter({ visible: true }), { last: true, after: 1300 });   // rapor penceresinin üstündeki düğme
    await h.click(p.getByText('Gönder', { exact: true }).filter({ visible: true }), { last: true, after: 2600 });        // "Rapor gönderildi", Gönderilen raporlar
  },
};
