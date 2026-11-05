#!/usr/bin/env bash
# Şema karşılaştırması için iki yerel veritabanı kurar: qa_canli (ortak migrations = canlı) ve qa_onerili (+ proposed).
# Kullanım: bash tools/qa/db.sh <ortak deposunun yolu>   (psql ve çalışan bir PostgreSQL gerekir)
set -euo pipefail
ORTAK="${1:?ortak deposunun yolu}"; T="$ORTAK/supabase/test"
for db in qa_canli qa_onerili; do
  psql -q -d postgres -c "drop database if exists $db" -c "create database $db"
  psql -q -t -o /dev/null -v ON_ERROR_STOP=1 -d $db -f "$T/supabase_stub.sql"
  for f in "$ORTAK"/supabase/migrations/*.sql; do psql -q -t -o /dev/null -v ON_ERROR_STOP=1 -d $db -f "$f"; done
  if [ $db = qa_onerili ]; then for f in "$ORTAK"/supabase/proposed/*.sql; do [ -e "$f" ] && psql -q -t -o /dev/null -v ON_ERROR_STOP=1 -d $db -f "$f"; done; fi
  echo "hazır: $db"
done
