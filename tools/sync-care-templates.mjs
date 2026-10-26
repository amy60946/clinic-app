// Ortak takip planı şablonlarını (ortak/veri/takip_sablonlari.json) ClinicApp'e kopyalar.
// Kullanım: node tools/sync-care-templates.mjs ../ortak/veri/takip_sablonlari.json
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) throw new Error('Kaynak yolu ver: node tools/sync-care-templates.mjs <takip_sablonlari.json>');
const { _doc, ...catalog } = JSON.parse(readFileSync(src, 'utf8'));
writeFileSync('src/data/careTemplates.json', JSON.stringify(catalog, null, 1) + '\n');
console.log(`${catalog.goals.length} hedef, ${catalog.modules.length} modül, ${catalog.packages.length} paket (sürüm ${catalog.version})`);
