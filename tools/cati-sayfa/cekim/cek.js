// Moyo Mercek: odaklı, büyük yazılı ekranlar (640 px genişlik, ×2); tam sayfa görüntüler, kırpım sonra
const path = '/home/user/clinic-app/tools/landing-motion/';
const { open } = require(path + 'kit.js'); const { openClient, vis } = require(path + 'scenes/_common.js');
const OUT = process.argv[2];
(async () => {
  const s = await open('desktop');
  const p = s.page;
  await p.setViewportSize({ width: 640, height: 1100 }); await p.waitForTimeout(1200);
  await openClient(p);
  const shoot = async (n) => { await p.waitForTimeout(1400); await p.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }); console.log('ok', n); };
  await shoot('egitim');
  for (const [name, n] of [['Özet', 'ozet'], ['Ev Rutinleri', 'rutin'], ['Davranışlar ve Olaylar', 'davranis']]) {
    try { await vis(p, name).first().click({ timeout: 4000 }); await shoot(n); } catch (e) { try { await p.getByText(name).first().click({ timeout: 3000 }); await shoot(n); } catch { console.log('MISS', name); } }
  }
  try { await p.getByRole('button', { name: 'Ekranı kapatırken ağlama', exact: true }).filter({ visible: true }).first().click({ timeout: 4000 }); await shoot('davranis-acik'); } catch { console.log('MISS kart'); }
  console.log(p.errors.slice(0, 3));
  process.exit(0);
})();
