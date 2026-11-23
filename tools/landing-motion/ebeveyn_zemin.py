# ebeveyn.js geniş sürümü için 1440×900 zemin (açık lavanta, telefonun yumuşak gölgesi ve ince çerçevesi) ve köşe maskesi.
# Kullanım: python3 ebeveyn_zemin.py <çıktı klasörü> <genişlik> <yükseklik> <x> <y>
import sys, os
from PIL import Image, ImageDraw, ImageFilter
out, W, H, X, Y = sys.argv[1], *map(int, sys.argv[2:6])
R = 36                                                       # ekran köşesi
zemin = Image.new('RGB', (1440, 900), (241, 240, 248))       # açık lavanta: telefon beyaz bölüm zemininden ayrılsın
golge = Image.new('L', (1440, 900), 0)
ImageDraw.Draw(golge).rounded_rectangle((X, Y + 14, X + W, Y + H + 14), R, fill=70)
golge = golge.filter(ImageFilter.GaussianBlur(22))
zemin.paste((22, 17, 58), (0, 0), golge)                     # lacivert #16113A gölge
ImageDraw.Draw(zemin).rounded_rectangle((X - 1, Y - 1, X + W, Y + H), R + 1, outline=(227, 225, 238), width=2)
zemin.save(os.path.join(out, 'aile-zemin.png'))
maske = Image.new('L', (W, H), 0)
ImageDraw.Draw(maske).rounded_rectangle((0, 0, W - 1, H - 1), R, fill=255)
maske.save(os.path.join(out, 'aile-maske.png'))
