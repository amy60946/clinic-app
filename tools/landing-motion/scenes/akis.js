// Ana sayfa ürün turu (kullanıcı isteği 14 Kasım 2026, Atlassian'ın yavaş ürün animasyonu gibi; 24 Kasım 2026'da eğitimsiz yeniden kuruldu,
// ebeveyn eğitimi bütün platformlarda kapalı): 1 uzman çocuğun haftalık ev rutinlerini görür → 2 ebeveynin davranış kayıtlarına bakar →
// 3 dönemin raporunu açar ve aileye gönderir. Önemli anlarda "kamera" yavaşça yakınlaşır, sonra geri çıkar.
// Adımlar manifest'te `beat` olarak durur; sayfadaki 1-2-3 bunlara göre yanar.
const { card, openClient } = require('./_common');

module.exports = {
  id: 'akis',
  title_tr: 'Uzman çocuğun ev rutinlerini görür, davranış kayıtlarına bakar, raporu aileye gönderir',
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
    // Kamera sağ üst köşeye sabitlenir: sol menü kadrajdan tam çıkar, sağdaki sütunlar ve düğmeler kesilmez (14 Kasım incelemesi)
    const cam = async (target, o = {}) => {
      const menu = p.getByText('Danışan Bilgileri', { exact: true }).filter({ visible: true });
      const side = (await menu.count()) ? await menu.first().boundingBox() : null;   // menü kapalıysa (dikey) sol kenar
      const edge = side ? side.x + side.width + 28 : 280;
      const s = Math.min(1.3, h.W / (h.W - edge));
      await h.zoom(target, s, { ox: h.d.from && o.left ? 0 : h.W, oy: h.d.from ? 0 : (o.oy ?? 70), after: o.after ?? 1700 });   // dikeyde üst kenar sabit: başlık kesilmez
    };
    await h.sleep(700);
    h.beat('1 · Ev rutinlerini gör');
    h.poster();                                        // afiş haftalık rutin tablosu
    await cam(vis('Okul için giyin'), { after: 1900 });
    await h.unzoom({ after: 500 });
    await h.click(vis('Kahvaltını yap'), { after: 1700 });   // adımın gün gün geçmişi: "Yapamam" nedeni, ebeveynin onayı
    await h.click(p.locator('[aria-label="Kapat"]').filter({ visible: true }).last(), { after: 900 });

    h.beat('2 · Davranış kayıtlarına bak');
    await h.click(vis('Davranışlar ve Olaylar'), { after: 1300 });
    if (h.d.from) await h.click(p.getByRole('button', { name: 'Menüyü kapat', exact: true }), { after: 900 });   // dikeyde olay tablosu tam genişlikte
    await h.click(card(p, 'Ekranı kapatırken ağlama'), { fx: 0.2, after: 1500 });
    await h.scrollTo(vis('Öncül'), 190, { ms: 800, after: 700 });
    await cam(vis('Öncül'), { oy: 120, left: true, after: 2300 });   // dikeyde menü kapalı: sol kenara sabit (Tarih, Bildiren, Öncül kalır)
    await h.unzoom({ after: 700 });
    await h.scroll(-400, { ms: 700, after: 600 });

    h.beat('3 · Raporu aileye gönder');
    if (h.d.from) await h.click(p.getByRole('button', { name: /Menüyü aç$/ }).filter({ visible: true }).first(), { after: 900 });
    await h.click(vis('Rapor'), { after: 1200 });
    await h.click(vis('Raporu aç'), { after: 1500 });
    await h.scroll(420, { ms: 900, after: 900 });
    await h.click(p.getByText('Aileye gönder', { exact: true }).filter({ visible: true }), { last: true, after: 1300 });   // rapor penceresinin üstündeki düğme
    await h.click(p.getByText('Gönder', { exact: true }).filter({ visible: true }), { last: true, after: 1800 });
    const sent = p.getByText('Gönderilen raporlar', { exact: true }).filter({ visible: true }).first();
    if (await sent.count()) await h.scrollTo(sent, h.d.from ? 420 : 380, { ms: 800, after: 1800 });
  },
};
