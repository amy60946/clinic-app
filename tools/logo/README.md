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

## Uygulama ikonları (kullanıcı kararı 13 Kasım 2026)

İki satırlı, sağa hizalı "mo / yo". **Moyo:** koyu zemin `#16113A`, harf marka yeşili `#0FD354`, top beyaz.
**Moyo Mercek:** açık zemin `#FFFFFF`, harf lacivert `#16113A`, top `#0FD354`.

```bash
MOYO_BRAND=<parent-app>/brand python3 tools/logo/ikon.py site/assets/logo   # ikon-moyo.svg, ikon-mercek.svg
```

Moyo Mercek'in `assets/icon.png` (1024, saydamlıksız), `favicon.png` ve `splash-icon.png` dosyaları `ikon-mercek.svg`'den.
Moyo'nun ve oyunun ikonları kendi pencerelerinde atanır.
