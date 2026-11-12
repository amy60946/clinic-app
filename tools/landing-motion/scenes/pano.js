// Pano: ana ekrandaki danışan listesi. İmleç üç bölümün üstünden geçer, "Benim" süzgecine basıp geri döner,
// bir "Ebeveynden yeni" satırında "Gördüm" der (satır Diğer danışanlar'a iner).
module.exports = {
  id: 'pano',
  title_tr: 'Danışan panosu: kim neyi bekliyor',
  device: 'desktop',
  data: { more: true },
  seed: 11,
  async prepare(h) {
    await h.align('Danışanlar (', 22);          // pano ekranı doldursun (üstteki kartlar çıkar)
    await h.park(1120, 150);
  },
  async run(h) {
    await h.sleep(300);
    h.beat('Pano: Senin sıran, Ebeveynden yeni, Sessiz kalanlar');
    h.poster();
    await h.hover('Ödev düzeni', { dx: 170, ms: 1100, bend: -70, after: 380 });   // üç bölümün üstünden tek, yavaş kayış
    await h.click('Benim', { beat: 'Süzgeç: yalnız benim danışanlarım', after: 950 });
    await h.click('Hepsi', { beat: 'Yeniden hepsi', dwell: 380, after: 900 });
    await h.click('Gördüm', { nth: 1, beat: '"Gördüm": satır Diğer danışanlar\'a iner', after: 900 });
  },
};
