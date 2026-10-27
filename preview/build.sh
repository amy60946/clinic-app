#!/usr/bin/env bash
# ClinicApp web önizlemesini üretir: preview/out/clinic.html (tek dosya).
# Deneme veritabanı (preview/demo-supabase.ts) kullanılır; gerçek Supabase'e bağlanmaz.
# ParentApp önizlemesi (app.html) ile aynı sayfada, aynı tarayıcı deposunu paylaşarak çalışır.
# Kullanım: bash preview/build.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${CLINICAPP_PREVIEW_WORK:-${TMPDIR:-/tmp}/clinicapp-preview}"

echo "› Kaynaklar kopyalanıyor ($WORK)"
rm -rf "$WORK" && mkdir -p "$WORK"
cp -r "$ROOT/App.tsx" "$ROOT/index.ts" "$ROOT/app.json" "$ROOT/package.json" "$ROOT/tsconfig.json" "$ROOT/src" "$WORK/"
ln -s "$ROOT/node_modules" "$WORK/node_modules"
cp "$ROOT/preview/demo-supabase.ts" "$WORK/src/lib/supabase.ts"

echo "› Tip kontrolü"
(cd "$WORK" && npx tsc --noEmit)

echo "› Web paketi"
# Yasal metin bağlantıları gerçek `legal` işlevini açar (herkese açık taslak metinler; deneme verisi değil)
(cd "$WORK" && CI=1 EXPO_PUBLIC_LEGAL_URL=https://uhelhxqgpcjemadhsifx.supabase.co/functions/v1/legal \
  npx expo export --clear --platform web --output-dir dist >/dev/null)

echo "› Paketleniyor"
node "$ROOT/preview/pack.js" "$WORK/dist" "$ROOT/preview/out"
