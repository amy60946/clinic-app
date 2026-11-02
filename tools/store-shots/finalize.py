# raw/<dev>/*.png -> final/*.png (RGB, no alpha, exact Apple sizes)
from PIL import Image
import os
names = {
 'ipad': {'01-plan-kitaplik':'ipad-01-takip-plani-kitaplik','02-zaman-icinde':'ipad-02-ev-rutinleri-zaman-icinde','03-ozet':'ipad-03-ozet',
          '04-plan-gas':'ipad-04-takip-plani-gas','05-ilerleme-notu':'ipad-05-rapor-ilerleme-notu','06-haftalik':'ipad-06-ev-rutinleri-haftalik',
          '07-home':'ipad-07-danisanlar','08-davranis':'ipad-08-davranis-kayitlari'},
 'iphone': {'01-plan':'iphone-01-takip-plani','02-ozet':'iphone-02-ozet','03-haftalik':'iphone-03-ev-rutinleri-haftalik',
          '04-ilerleme-notu':'iphone-04-rapor-ilerleme-notu','05-zaman-icinde':'iphone-05-ev-rutinleri-zaman-icinde',
          '06-davranis':'iphone-06-davranis-kayitlari','07-home':'iphone-07-danisanlar'},
}
size = {'ipad': (2752, 2064), 'iphone': (1320, 2868)}
os.makedirs('final', exist_ok=True)
for dev, m in names.items():
    for src, dst in m.items():
        Image.open(f'raw/{dev}/{src}.png').convert('RGB').save(f'final/{dst}.png', optimize=True)
        chk = Image.open(f'final/{dst}.png')
        assert chk.size == size[dev] and chk.mode == 'RGB', dst
print('ok')
