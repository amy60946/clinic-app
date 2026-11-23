#!/usr/bin/env bash
# Moyo Mercek web uygulaması (uzman.moyoapp.com.tr, Worker "moyo-uzman", wrangler.uzman.jsonc). Çıktı: dist-uzman/ (taban yol /).
# Derleme değişkenleri (Cloudflare › Worker › Settings › Build › Variables): EXPO_PUBLIC_SUPABASE_URL ve EXPO_PUBLIC_SUPABASE_KEY
# (yalnız publishable anahtar, sb_publishable_…). İsteğe bağlı: EXPO_PUBLIC_INVITE_BASE_URL, EXPO_PUBLIC_LEGAL_URL.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="$ROOT/dist-uzman"
: "${EXPO_PUBLIC_SUPABASE_URL:?EXPO_PUBLIC_SUPABASE_URL derleme değişkeni yok}"
: "${EXPO_PUBLIC_SUPABASE_KEY:?EXPO_PUBLIC_SUPABASE_KEY derleme değişkeni yok (publishable anahtar)}"
# gizli anahtar asla web paketine girmez
case "$EXPO_PUBLIC_SUPABASE_KEY" in sb_secret_*) echo "HATA: gizli anahtar (sb_secret_) verilmiş; publishable anahtar gerekir." >&2; exit 1 ;; esac
if [[ "$EXPO_PUBLIC_SUPABASE_KEY" == *.*.* ]] && node -e "const p=JSON.parse(Buffer.from(process.argv[1].split('.')[1],'base64url'));process.exit(p.role==='service_role'?0:1)" "$EXPO_PUBLIC_SUPABASE_KEY" 2>/dev/null; then
  echo "HATA: service_role anahtarı verilmiş; publishable anahtar gerekir." >&2; exit 1
fi
rm -rf "$OUT"
(cd "$ROOT" && CI=1 npx expo export --clear --platform web --output-dir "$OUT" >/dev/null)
# Güvenlik başlıkları (güvenlik denetimi 22 Kasım 2026, koordinatör; oturum tarayıcı deposunda olduğu için önce bu Worker):
# Cloudflare Workers statik dosyalarda _headers okur. Uygulama başka sayfaya gömülemez (frame-ancestors, tıklama tuzağı);
# betik yalnız kendi paketinden; bağlantı yalnız Supabase'e (REST, Realtime wss, Edge Function, Storage). React Native Web stilleri
# satır içi yazdığı için style-src 'unsafe-inline'. Rapor önizlemesi betiksiz srcdoc iframe, PDF blob: adresi.
SB="${EXPO_PUBLIC_SUPABASE_URL%/}"; SBW="wss://${SB#https://}"
cat > "$OUT/_headers" <<BASLIK
/*
  Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: $SB; media-src 'self' blob: $SB; font-src 'self' data:; connect-src 'self' $SB $SBW; frame-src 'self' blob: data:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  X-Frame-Options: DENY
  Permissions-Policy: camera=(), microphone=(), geolocation=()
BASLIK
echo "Hazır: $OUT"
