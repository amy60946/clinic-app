// Final App Store screenshot capture. Usage: node capture.js [ipad|iphone] [scale]
const fs = require('fs');
const { open, clickText, scrollToText, cleanEdges } = require('./lib');
const dev = process.argv[2] || 'ipad';
const scale = process.argv[3] ? Number(process.argv[3]) : undefined;
const OUT = `${__dirname}/raw/${dev}`;
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const { b, p } = await open(dev, scale);
  const shot = async (name, anchor = 'Nazlı · Sabah rutini', min = -80, max = 80) => {
    await p.waitForTimeout(500);
    const c = await cleanEdges(p, anchor, min, max);
    await p.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name, JSON.stringify(c));
  };
  const phone = dev === 'iphone';
  const nav = (desk, short) => clickText(p, phone ? short : desk);

  // home (client list) first: the bell badge is still unread
  await shot('07-home', 'Örnek Danışmanlık Merkezi');
  await clickText(p, 'Nazlı');

  if (!phone) {
    // 1 Takip planı + kitaplık
    await nav('Takip planı', 'Plan');
    await clickText(p, 'Kitaplık');
    await clickText(p, 'Ekran kapatma geçişinde sakin kalır');   // collapse the 2nd goal: nothing cut at the bottom
    await shot('01-plan-kitaplik');
    // 4 Takip planı: second goal open with weekly GAS (library hidden, first goal collapsed)
    await clickText(p, 'Kitaplığı gizle');
    await clickText(p, 'Sabah rutinini hatırlatmasız başlatır');
    await clickText(p, 'Ekran kapatma geçişinde sakin kalır');
    await shot('04-plan-gas');
    // 3 Özet (8 hafta)
    await nav('Özet', 'Özet');
    await clickText(p, '8 hafta');
    await shot('03-ozet');
    // 6 Ev rutinleri › Haftalık
    await nav('Ev rutinleri', 'Rutinler');
    await clickText(p, '4 hafta');
    await shot('06-haftalik');
    // 2 Ev rutinleri › Zaman içinde (8 hafta)
    await clickText(p, '8 hafta');
    await clickText(p, 'Zaman içinde');
    await shot('02-zaman-icinde');
    // 5 Rapor › İlerleme notu (4 hafta)
    await nav('Rapor', 'Rapor');
    await clickText(p, '4 hafta');
    await scrollToText(p, 'Ev rutini gözlem raporu (4 hafta)', 8);
    await shot('05-ilerleme-notu');
    // 8 Davranış kayıtları (8 hafta)
    await nav('Davranış kayıtları', 'Davranış');
    await clickText(p, '8 hafta');
    await clickText(p, 'Tablo');
    await scrollToText(p, 'Haftalık davranış kaydı sayısı', 12);
    await shot('08-davranis');
  } else {
    // 1 Takip planı
    await nav('Takip planı', 'Plan');
    await scrollToText(p, 'Sabah rutinini hatırlatmasız başlatır', 20);   // measured: top edge in the gap above the goal card, bottom edge in a gap
    await shot('01-plan', undefined, 0, 0);
    // 2 Özet (8 hafta)
    await nav('Özet', 'Özet');
    await clickText(p, '8 hafta');
    await shot('02-ozet');
    // 3 Ev rutinleri › Haftalık
    await nav('Ev rutinleri', 'Rutinler');
    await shot('03-haftalik');
    // 5 Ev rutinleri › Zaman içinde (8 hafta)
    await clickText(p, 'Zaman içinde');
    await shot('05-zaman-icinde');
    // 4 Rapor › İlerleme notu (4 hafta)
    await nav('Rapor', 'Rapor');
    await clickText(p, '4 hafta');
    await scrollToText(p, 'İlerleme notu (4 hafta)', 14);   // measured: previous card fully above the top edge; footnote below the bottom edge
    await shot('04-ilerleme-notu', undefined, 0, 0);
    // 6 Davranış kayıtları (8 hafta)
    await nav('Davranış kayıtları', 'Davranış');
    await clickText(p, '8 hafta');
    await scrollToText(p, 'Kayıtlar (15)', 12);
    await shot('06-davranis');
  }
  if (p.errors.length) console.log('page errors:', p.errors.slice(0, 5));
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
