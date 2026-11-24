// Ev rutinleri (24 Kasım 2026, eğitimsiz tanıtım; sitede "Platform Nasıl Çalışır?" 2. sekme): uzman aileye hazır bir rutin önerir
// (Sakin akşam: bir adımı çıkarır, saatleri 15 dk kaydırır, "Rutini öner"), sonra haftalık tabloda bir adımın gün gün geçmişine bakar.
const { openClient } = require('./_common');

module.exports = {
  id: 'rutin',
  title_tr: 'Ev rutinleri: aileye rutin önerisi ve haftalık tablo',
  device: 'desktop',
  seed: 23,
  async prepare(h, s) {
    await openClient(s.page);                          // danışan Ev Rutinleri'yle açılır
    await h.park(1180, 560);
  },
  async run(h, s) {
    const p = s.page;
    const vis = (t) => p.getByText(t, { exact: true }).filter({ visible: true }).first();
    await h.sleep(400);
    h.beat('Haftalık tablo');
    await h.click(p.getByText(/Aileye öner$/).filter({ visible: true }).first(), { beat: 'Aileye öner', after: 1300 });
    await h.click(vis('Sakin akşam'), { beat: 'Hazır rutin: Sakin akşam', after: 1400, poster: true });
    await h.click(vis('Yatmadan önce kitap oku'), { fx: 0.3, beat: 'Bir adımı çıkar', after: 800 });
    await h.click(vis('+15 dk'), { beat: 'Bütün saatleri 15 dk kaydır', after: 900 });
    await h.scrollTo(p.getByText(/^Rutini öner/).filter({ visible: true }).first(), h.d.from ? h.H - 160 : 760, { ms: 700, after: 500 });
    await h.click(p.getByText(/^Rutini öner/).filter({ visible: true }).first(), { beat: 'Rutini öner: ebeveyn Moyo Ebeveyn\'de tek kartta görür', after: 1500 });
    await h.click(vis('Tamam'), { beat: '"Rutin önerildi"', after: 900 });   // onay penceresi
    await h.click(p.locator('[aria-label="Kapat"]').filter({ visible: true }).last(), { after: 1000 });
    await h.click(vis('Kahvaltını yap'), { beat: 'Adımın gün gün geçmişi: "Yapamam" nedeni, ebeveynin onayı', after: 1900 });
  },
};
