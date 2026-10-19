// Expo web çıktısını tek bir clinic.html'e gömer (Ionicons yazı tipi data: olarak).
// window.__PREVIEW_APP__ = 'clinic': deneme veritabanında oturum ParentApp'ten ayrı tutulur.
const fs = require('fs');
const path = require('path');
const [dist, out] = process.argv.slice(2);

const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const src = index.match(/<script src="([^"]+)"/)[1];
let bundle = fs.readFileSync(path.join(dist, src), 'utf8');

bundle = bundle.replace(/"(\/assets\/[^"]+\.ttf)"/g, (all, p) => {
  if (!p.includes('/Ionicons.')) return all; // kullanılmayan simge setleri
  const file = path.join(dist, p);
  if (!fs.existsSync(file)) return all;
  return JSON.stringify(`data:font/ttf;base64,${fs.readFileSync(file).toString('base64')}`);
});
bundle = bundle.replace(/<\/script/gi, '<\\/script');

const style = (index.match(/<style[^>]*>[\s\S]*?<\/style>/) || [''])[0];
const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>ClinicApp</title>
${style}
<style>html,body{background:#F5F6F8}</style>
</head>
<body>
<div id="root"></div>
<script>window.__PREVIEW_APP__ = 'clinic';</script>
<script>${bundle}</script>
</body>
</html>
`;
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, 'clinic.html'), html);
console.log(`clinic.html ${(html.length / 1e6).toFixed(1)} MB`);
