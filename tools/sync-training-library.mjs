// Ebeveyn eğitimi kaynak kütüphanesini ortaktan kopyalar: node tools/sync-training-library.mjs <ortak>/veri/ebeveyn_egitimi_kutuphane.json
// Tek kaynak ortak deposu; uygulamadaki src/data/trainingLibrary.json elle düzenlenmez.
import fs from 'fs';
const src = process.argv[2];
if (!src) { console.error('Kullanım: node tools/sync-training-library.mjs <ortak>/veri/ebeveyn_egitimi_kutuphane.json'); process.exit(1); }
const lib = JSON.parse(fs.readFileSync(src, 'utf8'));
const keys = new Set();
for (const it of lib.items) {
  if (keys.has(it.key)) throw new Error(`çift anahtar: ${it.key}`);
  keys.add(it.key);
  if (!['reading', 'quiz', 'short', 'video', 'pdf'].includes(it.type)) throw new Error(`tür: ${it.key}`);
}
fs.writeFileSync(new URL('../src/data/trainingLibrary.json', import.meta.url), JSON.stringify(lib, null, 1) + '\n');
console.log(`${lib.items.length} öğe kopyalandı`);
