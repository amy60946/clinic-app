# Moyo logosu (seçilen sürüm, çizgiye çevrilmiş)

Kullanıcı seçimi (12 Kasım 2026): logo atölyesinde kaydedilen "Moyo c top adjusted"
(https://claude.ai/artifact/NNHLAXqojHPiPTgHN4pZ88).

- Harfler: Poppins 800; harf aralıkları x yüksekliğinin %7,9 / %8,1 / %8,8'i; kuyruk C Top.
- Uzman platformunda yanında ince "Mercek": Poppins 300, harf aralığı −0,03 em, moyo'ya uzaklığı 0,5 x.
- Ebeveyn ürününde yalnız "moyo".

```bash
MOYO_BRAND=<parent-app>/brand python3 tools/logo/gen.py site/assets/logo
```

Moyo kitinin yazı tipi okuyucusu ve kuyruk hesabı (parent-app `brand/geom.py`) salt okunur kullanılır. Kitin sahibi Moyo
penceresidir; son dosyalar oradan gelince bunların yerine geçer. `inline-*.svg` sayfalara satır içi gömülür: harfler
`currentColor`, top `--logo-dot`. Bu dosyalar depoya eklenmez.
