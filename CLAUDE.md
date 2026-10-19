# ClinicApp — Claude için çalışma notları

- Kullanıcı yazılımcı değil; Türkçe, sade, adım adım anlat. Şifre/anahtarı sohbete yapıştırmasını ASLA isteme (GitHub Secrets / EAS).
- Üç ürün aynı Supabase'i kullanır: Pofi Adası (`amy60946/pofi-adasi`), ParentApp (`amy60946/parent-app`), ClinicApp (bu depo).
  Sunucu SQL'i ParentApp deposunda (`supabase/proposed/20261019000000_clinic.sql`); canlıya kullanıcı onayıyla uygulanır.
- Arayüz ParentApp ile aynı dil: `src/theme.ts` ve `src/components/ui.tsx` ParentApp'ten; renk/ölçü değişikliği iki depoda birlikte yapılır.
- Ölçümler `src/lib/metrics.ts` içinde saf TS ve birim testli (`npm test`). Görev tekrar kuralı ParentApp `taskOccursOn` ile aynı kalmalı.
- Klinik çıktılar tanı koymaz; CAS2/MOXO gibi test puanı üretilmez; lisanslı ölçekler (Vanderbilt, Conners, BRIEF-2) lisanssız eklenmez.
- Önizleme: `preview/demo-supabase.ts`, ParentApp `preview/demo-supabase.ts` ile aynı tutulur (ortak sayfa, ortak veri).
- Adlandırma: ClinicApp, bundle `com.clinicapp.ios` (geçici; kullanıcı onayı bekliyor). "Fidan" adı hiçbir yerde kullanılmaz.
