# İkon alternatifleri (kullanıcı isteği 14 Kasım 2026: "60% beyaz, 30% siyah, 10% yeşil" + "moyo'yu bir de düz yazdığın").
# Moyo kitinin çizimi (parent-app brand/kit.py icon()) salt okunur kullanılır; yalnız renkler değişir. Önizleme içindir, uygulamaya atanmaz.
# Kullanım: MOYO_BRAND=<parent-app>/brand python3 tools/logo/ikon_alt.py <çıktı klasörü>
import os, sys
BRAND = os.environ['MOYO_BRAND']; OUT = sys.argv[1]; sys.path.insert(0, BRAND)
import kit
SIYAH, BEYAZ, YESIL, LAC = '#111111', '#FFFFFF', '#0FD354', '#16113A'
# (ad, zemin, harf, top/vurgu)
RENK = {
    'beyaz':  (BEYAZ, SIYAH, YESIL),     # beyaz zemin, siyah harf, yeşil top
    'siyah':  (SIYAH, BEYAZ, YESIL),     # siyah zemin, beyaz harf, yeşil top
    'yesil':  (YESIL, SIYAH, BEYAZ),     # yeşil zemin, siyah harf, beyaz top
}
os.makedirs(OUT, exist_ok=True)
n = 0
for prod in ('moyo', 'mercek', 'oyun'):
    for fam in ('1', '3'):
        for rk, (bg, fg, acc) in RENK.items():
            kit.PRODUCTS[prod].update(bg=bg, fg=fg, accent=acc)
            open(os.path.join(OUT, '%s-%s-%s.svg' % (prod, fam, rk)), 'w').write(kit.icon(prod, fam, 'd'))
            n += 1
# bugünkü (13 Kasım kararı) karşılaştırma için
kit.PRODUCTS['moyo'].update(bg=LAC, fg=YESIL, accent=BEYAZ); open(os.path.join(OUT, 'moyo-3-bugun.svg'), 'w').write(kit.icon('moyo', '3', 'd'))
kit.PRODUCTS['mercek'].update(bg=BEYAZ, fg=LAC, accent=YESIL); open(os.path.join(OUT, 'mercek-3-bugun.svg'), 'w').write(kit.icon('mercek', '3', 'd'))
print('ok', n + 2)
