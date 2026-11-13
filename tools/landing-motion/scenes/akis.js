// Ana sayfa ürün turu (kullanıcı isteği 14 Kasım 2026, Atlassian'ın yavaş ürün animasyonu gibi):
// 1 uzman ebeveyn eğitimi oluşturur (hedef, modüller, Etkin) → 2 çocuğun ev rutinlerini görür → 3 ebeveynin bildirdiği ABC olaylarına bakar.
// Önemli anlarda "kamera" yavaşça yakınlaşır, sonra geri çıkar. Adımlar manifest'te `beat` olarak durur; sayfadaki 1-2-3 bunlara göre yanar.
const { card, tab, openClient } = require('./_common');

module.exports = {
  id: 'akis',
  title_tr: 'Uzman eğitim oluşturur, çocuğun rutinlerini görür, ABC olaylarına bakar',
  device: 'desktop',
  data: { more: true },
  maxBytes: 4e6,
  seed: 14,
  async prepare(h, s) {
    await openClient(s.page);
    await h.park(1120, 620);
  },
  async run(h, s) {
    const p = s.page;
    await h.sleep(700);
    h.beat('1 · Ebeveyn eğitimi oluştur');
    await h.click('+ Eğitim ekle', { after: 1000 });
    await h.click(p.getByPlaceholder(/jeton sistemini/).filter({ visible: true }), { after: 400 });
    await h.type('Ebeveyn sabah rutininde görsel çizelgeyi kullanır', { after: 700 });
    await h.click(p.getByRole('button', { name: 'İleri', exact: true }).filter({ visible: true }), { after: 1500 });
    await h.click(tab(p, 'Öğrenme modülleri'), { after: 1000 });
    await h.click(/Etkileşimli öğrenme modülü ekle|Daha fazla ekle/, { after: 1300 });
    await h.click(p.getByText('Seç', { exact: true }).filter({ visible: true }).first(), { after: 650 });
    await h.click(p.getByText('Seç', { exact: true }).filter({ visible: true }).first(), { after: 650 });
    await h.click('Modülleri ekle', { after: 1300 });
    await h.zoom(p.getByText(/etkin modül$/).filter({ visible: true }).first(), 1.35, { fy: 0.5, after: 1500 });
    await h.unzoom();
    await h.click('durumu Etkin yap', { after: 1100 });
    await h.click('Durumu güncelle', { after: 1700, poster: true });

    h.beat('2 · Çocuğun rutinlerini gör');
    await h.click(p.getByText('Ev Rutinleri', { exact: true }).filter({ visible: true }).first(), { after: 1500 });
    await h.zoom(p.getByText('Haftalık', { exact: true }).filter({ visible: true }).first(), 1.3, { fy: 6, after: 1800 });
    await h.unzoom({ after: 500 });

    h.beat('3 · ABC olaylarına bak');
    await h.click(p.getByText('Davranışlar ve Olaylar', { exact: true }).filter({ visible: true }).first(), { after: 1300 });
    await h.click(card(p, 'Ekranı kapatırken ağlama'), { fx: 0.2, after: 1500 });
    await h.scroll(220, { ms: 800, after: 700 });
    await h.zoom(p.getByText('Öncül', { exact: true }).filter({ visible: true }).first(), 1.3, { after: 2000 });
    await h.unzoom({ after: 900 });
  },
};
