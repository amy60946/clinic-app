#!/usr/bin/env bash
# Moyo Mercek tanıtım sitesi (mercek.moyoapp.com.tr, Worker "moyo-mercek", wrangler.mercek.jsonc). Çıktı: dist-mercek/.
# Uygulama ayrı adreste ve ayrı derlemede (uzman.moyoapp.com.tr, tools/web/build-uzman.sh); sitedeki bağlantılar mutlak.
# Sayfalar: / (index.html), /fiyat (fiyat.html), /guvenlik (guvenlik.html); Worker .html'siz adresle sunar (html_handling varsayılanı).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist-mercek"
rm -rf "$OUT" && mkdir -p "$OUT"
for f in index.html fiyat.html guvenlik.html sitemap.xml robots.txt; do cp "$ROOT/site/$f" "$OUT/$f"; done
cp -r "$ROOT/site/assets" "$OUT/assets"
cp "$ROOT/assets/icon.png" "$OUT/assets/icon.png"   # Moyo Mercek simgesi: beyaz zemin, lacivert işaret (kullanıcı seçimi 18 Kasım 2026)

# Önizlemeye özel parçalar canlıya gitmez: "ONIZ:BAS" … "ONIZ:SON" satır aralıkları (alternatif seçici, önerilmeyen
# alternatifler ve stilleri) silinir, seçici betiği (assets/oniz.js) kopyalanmaz. İşaretler kendi satırlarında durur.
rm -f "$OUT/assets/oniz.js"
for f in "$OUT"/index.html "$OUT"/fiyat.html "$OUT"/guvenlik.html "$OUT"/assets/site.css "$OUT"/assets/site.js; do
  sed -i '/ONIZ:BAS/,/ONIZ:SON/d' "$f"
done
sed -i 's/ data-var="[^"]*"//g' "$OUT"/*.html   # önerilen (varsayılan) alternatiflerin işareti; canlıda gereksiz
if grep -nE 'ONIZ:|oniz\.js|oniz-gruplar|data-var=' "$OUT"/*.html "$OUT"/assets/site.css; then
  echo "Önizleme parçası kaldı (yukarıda)." >&2; exit 1
fi
echo "Hazır: $OUT"
