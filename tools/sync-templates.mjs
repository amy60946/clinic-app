// Ortak görev şablonu kataloğunu (ortak/veri/gorev_sablonlari.json) ClinicApp'e kopyalar; yalnız uygulamanın kullandığı alanlar.
// Kullanım: node tools/sync-templates.mjs ../ortak/veri/gorev_sablonlari.json
import { readFileSync, writeFileSync } from 'node:fs';

const src = process.argv[2];
if (!src) throw new Error('Kaynak yolu ver: node tools/sync-templates.mjs <gorev_sablonlari.json>');
const { version, templates } = JSON.parse(readFileSync(src, 'utf8'));
const out = templates
  .slice()
  .sort((a, b) => a.sort - b.sort)
  .map(({ key, title, emoji, category, categories, ages, difficulty, coins, skill }) =>
    ({ key, title, emoji, category, categories, ages, difficulty, coins, skill }));
writeFileSync('src/data/taskTemplates.json', JSON.stringify({ version, templates: out }, null, 1) + '\n');
console.log(`${out.length} şablon yazıldı (sürüm ${version})`);
