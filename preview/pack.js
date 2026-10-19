// Expo web çıktısını tek bir HTML dosyasına gömer (simge yazı tipi data: olarak).
// Kullanım: node pack.js <dist> <çıktı.html> <uygulama-adı> <başlık>
// Uygulama adı deneme veritabanında oturumu ayırır (ParentApp ile aynı sayfada birlikte çalışır).
const fs = require('fs');
const path = require('path');
const [dist, out, app, title] = process.argv.slice(2);

const index = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
const src = index.match(/<script src="([^"]+)"/)[1];
let bundle = fs.readFileSync(path.join(dist, src), 'utf8');
const mime = { '.png': 'image/png', '.ttf': 'font/ttf' };
bundle = bundle.replace(/"(\/assets\/[^"]+\.(png|ttf))"/g, (all, p) => {
  if (p.endsWith('.ttf') && !p.includes('/Ionicons.')) return all;
  const file = path.join(dist, p);
  if (!fs.existsSync(file)) return all;
  return JSON.stringify(`data:${mime[path.extname(p)]};base64,${fs.readFileSync(file).toString('base64')}`);
});
bundle = bundle.replace(/<\/script/gi, '<\\/script');
const style = (index.match(/<style[^>]*>[\s\S]*?<\/style>/) || [''])[0];
const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>${title}</title>
${style}
<style>html,body{background:#F5F6F8}@media print{html,body{background:#fff}}</style>
</head>
<body>
<div id="root"></div>
<script>window.__PREVIEW_APP__=${JSON.stringify(app)};</script>
<script>${bundle}</script>
</body>
</html>
`;
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(`${path.basename(out)} ${(html.length / 1e6).toFixed(1)} MB`);
