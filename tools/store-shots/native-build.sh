#!/usr/bin/env bash
# Builds an "iOS wording" variant of the ClinicApp preview from a SCRATCH copy of the repo sources (repo untouched).
# Same steps as preview/build.sh; before bundling, the few Platform.OS === 'web' branches that are visible in the
# screenshots are switched to their own iOS branch (texts/icons taken from the code), and on iPad isPad is true
# so the header layout button renders exactly as on a native iPad.
# Usage: bash native-build.sh ipad|iphone   -> native/<dev>/clinic.html
set -euo pipefail
DEV="$1"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
HERE="$(cd "$(dirname "$0")" && pwd)"
WORK="$HERE/native-work-$DEV"
rm -rf "$WORK" && mkdir -p "$WORK"
cp -r "$ROOT/App.tsx" "$ROOT/index.ts" "$ROOT/app.json" "$ROOT/package.json" "$ROOT/tsconfig.json" "$ROOT/src" "$WORK/"
ln -s "$ROOT/node_modules" "$WORK/node_modules"
cp "$ROOT/preview/demo-supabase.ts" "$WORK/src/lib/supabase.ts"
cp "$ROOT/preview/demo-sessions.ts" "$WORK/src/lib/demo-sessions.ts"

python3 - "$WORK" "$DEV" <<'EOF'
import sys
work, dev = sys.argv[1], sys.argv[2]
def sub(path, old, new):
    p = f'{work}/{path}'
    s = open(p, encoding='utf-8').read()
    assert s.count(old) == 1, (path, old)
    open(p, 'w', encoding='utf-8').write(s.replace(old, new))
# ExportButton: iOS branch (share icon + "Paylaş (CSV)")
sub('src/components/ExportButton.tsx', "Platform.OS === 'web' ? 'download-outline' : 'share-outline'", "'share-outline'")
sub('src/components/ExportButton.tsx', "Platform.OS === 'web' ? 'İndir (CSV)' : 'Paylaş (CSV)'", "'Paylaş (CSV)'")
# ReportTab: iOS button label
sub('src/screens/client/ReportTab.tsx', "Platform.OS === 'web' ? 'Raporu aç' : 'Raporu yazdır / paylaş'", "'Raporu yazdır / paylaş'")
# PlanHats: native (no drag-and-drop hints / drag handles)
sub('src/screens/plan/PlanHats.tsx', "const isWeb = Platform.OS === 'web';", "const isWeb = false;")
# iPad: layout toggle and iPad layout rules (layout.tsx)
if dev == 'ipad':
    sub('src/lib/layout.tsx', "export const isPad = Platform.OS === 'ios' && (Platform as unknown as { isPad?: boolean }).isPad === true;",
        "export const isPad = true;")
print('patched', dev)
EOF

(cd "$WORK" && npx tsc --noEmit)
(cd "$WORK" && CI=1 EXPO_PUBLIC_LEGAL_URL=https://uhelhxqgpcjemadhsifx.supabase.co/functions/v1/legal \
  npx expo export --clear --platform web --output-dir dist >/dev/null)
node "$ROOT/preview/pack.js" "$WORK/dist" "$HERE/native/$DEV"
