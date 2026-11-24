#!/usr/bin/env node
// Uygulamaya girecek Supabase anahtarı herkese açık (publishable / anon) olmalı. Gizli anahtar asla (güvenlik denetimi
// 22 Kasım 2026): yeni biçim `sb_secret_…` ve eski biçim service_role JWT'si (eyJ…, gövdesinde "role":"service_role").
// Kullanım: node tools/ci/check-public-key.mjs <ORTAM_DEĞİŞKENİ_ADI>   (değer loga yazılmaz)
const name = process.argv[2] || 'SUPABASE_PUBLISHABLE_KEY';
const key = (process.env[name] ?? '').trim();
const fail = (why) => { console.log(`::error::${name} ${why}; Supabase'deki publishable anahtarı yaz (sb_publishable_…).`); process.exit(1); };

if (!key) fail('boş');
if (key.startsWith('sb_secret_')) fail('gizli anahtar (sb_secret_)');
if (key.startsWith('eyJ')) {
  let role;
  try {
    const part = key.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    role = JSON.parse(Buffer.from(part, 'base64').toString('utf8')).role;
  } catch { fail('çözülemeyen bir JWT'); }
  if (role !== 'anon') fail(`JWT rolü "${role ?? 'yok'}" (yalnız anon kabul edilir)`);
}
console.log(`${name}: herkese açık anahtar.`);
