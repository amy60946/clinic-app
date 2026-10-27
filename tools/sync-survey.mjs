// Ortak uzman karşılama anketini (ortak/veri/uzman_anketi.json) ClinicApp'e kopyalar.
// Kullanım: node tools/sync-survey.mjs ../ortak/veri/uzman_anketi.json
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) throw new Error('Kaynak yolu ver: node tools/sync-survey.mjs <uzman_anketi.json>');
const { _doc, ...data } = JSON.parse(readFileSync(src, 'utf8'));
writeFileSync('src/data/survey.json', JSON.stringify(data, null, 1) + '\n');
console.log(`anket sürüm ${data.version}: ${data.profession.options.length} meslek, ${data.challenges.options.length} zorluk, ${data.features.options.length} özellik, ${data.intent.options.length} neden`);
