// Seans (24 Kasım 2026, eğitimsiz tanıtım; "Platform Nasıl Çalışır?" 5. sekme): takvimde haftanın seansları, Nazlı'nın seansı açılır:
// ücret başlıkta, Hazırlık'ta son seanstan bu yana evden gelen kayıtların özeti ve seans gündemi (yalnız uzman görür).
module.exports = {
  id: 'seans',
  title_tr: 'Takvim ve seans hazırlığı: ücret, son seanstan bu yana evdeki kayıtlar',
  device: 'desktop',
  data: { more: true },
  seed: 61,
  async prepare(h, s) {
    const p = s.page;
    await p.getByText('Takvim', { exact: true }).filter({ visible: true }).first().click();
    await p.waitForTimeout(1800);
    await h.park(1180, 260);
  },
  async run(h, s) {
    const p = s.page;
    const vis = (t) => p.getByText(t, { exact: true }).filter({ visible: true }).first();
    await h.sleep(500);
    h.beat('Takvim: haftanın seansları');
    h.poster();
    await h.hover(vis('Defne'), { ms: 1000, after: 500 });
    await h.click(vis('Nazlı'), { beat: 'Seansı aç: ücret, oda, aile gelecek', after: 1600 });
    // seans penceresi uygulamanın kökünün dışında açılır (kamera yakınlaşması onu büyütmez): imleç özetin üstünden geçer
    await h.hover(p.getByText(/^%\d+$/).filter({ visible: true }).first(), { beat: 'Hazırlık: son seanstan bu yana evde', ms: 900, after: 900 });
    await h.hover(vis('davranış kaydı'), { ms: 800, after: 1100 });
    await h.click(p.getByRole('checkbox').filter({ visible: true }).first(), { beat: 'Seans gündemi: yalnız uzman görür', after: 900 });
    await h.click(vis('Kayıt'), { beat: 'Seans kaydı', after: 1600 });
  },
};
