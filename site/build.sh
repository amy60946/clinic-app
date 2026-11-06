#!/usr/bin/env bash
# Moyo Mercek tanıtım sitesi (mercek.moyoapp.com.tr, Worker "moyo-mercek", wrangler.mercek.jsonc). Çıktı: dist-mercek/.
# Uygulama ayrı adreste ve ayrı derlemede (uzman.moyoapp.com.tr, tools/web/build-uzman.sh); sitedeki bağlantılar mutlak.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist-mercek"
rm -rf "$OUT" && mkdir -p "$OUT"
cp "$ROOT/site/index.html" "$OUT/index.html"
cp -r "$ROOT/site/assets" "$OUT/assets"
cp "$ROOT/assets/icon-concepts/kucak/temel.png" "$OUT/assets/icon.png" 2>/dev/null || true
echo "Hazır: $OUT"
