# ClinicApp App Store simge taslakları, sıfırdan (1024×1024 SVG). Ana renk ClinicApp'in laciverti #0F1B3D;
# her yön tek bir vurgu rengi taşır. Köşeleri iOS yuvarlar; önemli kısım orta %80'de.
NAVY, WHITE, LIGHT = '#0F1B3D', '#FFFFFF', '#F3F5F9'
GOLD, TEAL, SKY, CORAL = '#F2B53A', '#4FC1B0', '#8CC4FF', '#F2876B'

def svg(bg, body):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">'
            f'<rect width="1024" height="1024" fill="{bg}"/>{body}</svg>')

C = {}
# A Kucak: büyük yay (yetişkin) küçük daireyi (çocuk) taşır — destek, güven
C['kucak'] = svg(NAVY, f'''
<path d="M252,470 A260,260 0 0 0 772,470" fill="none" stroke="{WHITE}" stroke-width="92" stroke-linecap="round"/>
<circle cx="512" cy="500" r="124" fill="{GOLD}"/>''')
# B Monogram: kalın geometrik C (klinik) içinde nokta (çocuk)
C['monogram'] = svg(NAVY, f'''
<path d="M703,345 A260,260 0 1 0 703,679" fill="none" stroke="{WHITE}" stroke-width="108" stroke-linecap="round"/>
<circle cx="560" cy="512" r="78" fill="{TEAL}"/>''')
# C Haftalık iz: yedi gün, nokta nokta yükselen yol; son gün dolu
pts = [(206,720),(306,664),(406,690),(506,590),(606,548),(706,424),(806,304)]
path = 'M' + ' L'.join(f'{x},{y}' for x, y in pts)
dots = ''.join(f'<circle cx="{x}" cy="{y}" r="{40 if i < 6 else 76}" fill="{WHITE if i < 6 else CORAL}"/>' for i, (x, y) in enumerate(pts))
C['iz'] = svg(NAVY, f'<path d="{path}" fill="none" stroke="{WHITE}" stroke-opacity="0.4" stroke-width="34" stroke-linejoin="round" stroke-linecap="round"/>{dots}')
# D Hedef halkaları: hedefe ulaşma ölçeği (GAS); iç halka dolu
C['halka'] = svg(NAVY, f'''
<circle cx="512" cy="512" r="300" fill="none" stroke="{WHITE}" stroke-opacity="0.22" stroke-width="44"/>
<circle cx="512" cy="512" r="206" fill="none" stroke="{WHITE}" stroke-opacity="0.5" stroke-width="44"/>
<path d="M512,400 A112,112 0 1 1 400,512" fill="none" stroke="{SKY}" stroke-width="44" stroke-linecap="round"/>
<circle cx="512" cy="512" r="40" fill="{WHITE}"/>''')
# E Kemer: iki sütun (ev ve klinik) arasında kapı; içinde çocuk
C['kemer'] = svg(LIGHT, f'''
<path d="M282,792 L282,512 A230,230 0 0 1 742,512 L742,792" fill="none" stroke="{NAVY}" stroke-width="96" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="512" cy="566" r="78" fill="{GOLD}"/>
<path d="M392,792 A120,120 0 0 1 632,792 Z" fill="{GOLD}"/>''')
# F Kayıt kartları: üst üste notlar, en üstte onay
C['kart'] = svg(NAVY, f'''
<rect x="300" y="236" width="424" height="520" rx="72" fill="{WHITE}" opacity="0.25" transform="rotate(-8 512 496)"/>
<rect x="300" y="268" width="424" height="520" rx="72" fill="{WHITE}"/>
<rect x="378" y="364" width="268" height="34" rx="17" fill="#D3D9E6"/>
<rect x="378" y="432" width="190" height="34" rx="17" fill="#D3D9E6"/>
<path d="M410,610 L486,684 L624,540" fill="none" stroke="{TEAL}" stroke-width="58" stroke-linecap="round" stroke-linejoin="round"/>''')

NAMES = {'kucak': 'Kucak', 'monogram': 'Monogram', 'iz': 'Haftalık iz', 'halka': 'Hedef halkaları', 'kemer': 'Kapı', 'kart': 'Kayıt'}
if __name__ == '__main__':
    import json
    for k, v in C.items():
        open(f'{k}.svg', 'w').write(v)
    json.dump({k: {'name': NAMES[k], 'svg': v} for k, v in C.items()}, open('concepts.json', 'w'), ensure_ascii=False)
