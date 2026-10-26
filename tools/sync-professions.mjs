// Ortak uzman meslekleri eşlemesini (ortak/veri/uzman_meslekleri.json) ClinicApp'e kopyalar.
// Kullanım: node tools/sync-professions.mjs ../ortak/veri/uzman_meslekleri.json
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) throw new Error('Kaynak yolu ver: node tools/sync-professions.mjs <uzman_meslekleri.json>');
const { _doc, ...data } = JSON.parse(readFileSync(src, 'utf8'));
writeFileSync('src/data/professions.json', JSON.stringify(data, null, 1) + '\n');
console.log(`${data.professions.length} meslek, ${Object.keys(data.reasons).length} ret nedeni (sürüm ${data.version})`);
