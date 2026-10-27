// Ortak hazır günlük rutinleri (ortak/veri/hazir_rutinler.json) ClinicApp'e kopyalar.
// Kullanım: node tools/sync-routines.mjs ../ortak/veri/hazir_rutinler.json
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) throw new Error('Kaynak yolu ver: node tools/sync-routines.mjs <hazir_rutinler.json>');
const { _doc, ...data } = JSON.parse(readFileSync(src, 'utf8'));
writeFileSync('src/data/routines.json', JSON.stringify(data, null, 1) + '\n');
console.log(`${data.routines.length} rutin, ${data.routines.reduce((n, r) => n + r.items.length, 0)} görev (sürüm ${data.version})`);
