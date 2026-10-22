#!/usr/bin/env bash
# ClinicApp web sitesi: tanıtım sayfası (/) + uzman paneli (/app/). Çıktı: dist-site/ (herhangi bir statik barındırmaya yüklenir).
# Gerekli: .env içinde EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_KEY (publishable anahtar).
# Barındırmada /app/* istekleri /app/index.html'e düşmeli (tek sayfa uygulaması).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/dist-site"
rm -rf "$OUT" && mkdir -p "$OUT"
echo "› Uzman paneli (/app)"
(cd "$ROOT" && CI=1 CLINICAPP_BASE_URL=/app npx expo export --clear --platform web --output-dir "$OUT/app" >/dev/null)
echo "› Tanıtım sayfası"
cp "$ROOT/site/index.html" "$OUT/index.html"
cp -r "$ROOT/site/assets" "$OUT/assets"
cp "$ROOT/assets/icon-concepts/kucak/temel.png" "$OUT/assets/icon.png" 2>/dev/null || true
echo "Hazır: $OUT"
