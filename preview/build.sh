#!/usr/bin/env bash
# ClinicApp web önizlemesi: preview/out/index.html (uzman paneli + yanında ParentApp telefonu) + clinic.html
# Deneme veritabanı (preview/demo-supabase.ts) kullanılır; gerçek Supabase'e bağlanmaz.
# ParentApp'i yanına koymak için: PARENT_APP=../parent-app (önce orada `bash preview/build.sh` çalışmış olmalı).
# Kullanım: npm install && bash preview/build.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WORK="${CLINICAPP_PREVIEW_WORK:-${TMPDIR:-/tmp}/clinicapp-preview}"
PARENT="${PARENT_APP:-$ROOT/../parent-app}"

echo "› Kaynaklar kopyalanıyor"
rm -rf "$WORK" && mkdir -p "$WORK"
(cd "$ROOT" && tar cf - --exclude=./.git --exclude=./node_modules --exclude=./preview/out .) | (cd "$WORK" && tar xf -)
ln -s "$ROOT/node_modules" "$WORK/node_modules"
cp "$ROOT/preview/demo-supabase.ts" "$WORK/src/lib/supabase.ts"

echo "› Tip kontrolü"
(cd "$WORK" && npx tsc --noEmit)

echo "› Web paketi"
(cd "$WORK" && CI=1 npx expo export --platform web --output-dir dist >/dev/null)

echo "› Paketleniyor"
node "$ROOT/preview/pack.js" "$WORK/dist" "$ROOT/preview/out/clinic.html" clinic ClinicApp
cp "$ROOT/preview/frame.html" "$ROOT/preview/out/index.html"
if [ -f "$PARENT/preview/out/app.html" ]; then
  cp "$PARENT/preview/out/app.html" "$ROOT/preview/out/app.html"
  echo "  ParentApp eklendi"
else
  echo "  ParentApp bulunamadı ($PARENT/preview/out/app.html): yalnız uzman paneli"
fi
echo "✓ preview/out/index.html hazır"
