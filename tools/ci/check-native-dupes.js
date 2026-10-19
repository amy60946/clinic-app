// Yerel (iOS) kodu olan bir paketin node_modules içinde iki farklı sürümü varsa hata verir.
// Neden: @expo/vector-icons kendi içinde expo-font 58'i getirdi; iOS'ta Expo 57 çekirdeğiyle uyumsuz olduğu için
// uygulama açılışta çöktü (dyld "Symbol not found", 19 Ekim 2026). Çözüm package.json → overrides.
const fs = require('fs');
const path = require('path');

const found = new Map(); // ad → Set(sürüm@yol)
function walk(dir, depth) {
  if (depth > 6 || !fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (name.startsWith('.')) continue;
    const full = path.join(dir, name);
    if (name.startsWith('@')) { walk(full, depth); continue; }
    const pkg = path.join(full, 'package.json');
    if (!fs.existsSync(pkg)) continue;
    const native = fs.existsSync(path.join(full, 'ios')) || fs.readdirSync(full).some((f) => f.endsWith('.podspec'))
      || fs.existsSync(path.join(full, 'expo-module.config.json'));
    if (native) {
      const { name: n, version } = JSON.parse(fs.readFileSync(pkg, 'utf8'));
      if (!found.has(n)) found.set(n, new Map());
      found.get(n).set(version, path.relative(process.cwd(), full));
    }
    walk(path.join(full, 'node_modules'), depth + 1);
  }
}
walk(path.join(process.cwd(), 'node_modules'), 0);
const dupes = [...found].filter(([, v]) => v.size > 1);
dupes.forEach(([n, v]) => console.error(`::error::${n} birden çok sürümde: ${[...v].map(([ver, p]) => `${ver} (${p})`).join(', ')}`));
if (dupes.length) process.exit(1);
console.log(`Yerel paket sürümleri tutarlı (${found.size} paket).`);
