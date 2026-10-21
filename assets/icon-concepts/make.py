# ClinicApp App Store simge taslakları (1024×1024 SVG). ParentApp simgesiyle aynı palet:
# lacivert #0F1B3D, yaprak yeşili #80C88E, altın #E9B22B, beyaz. Köşeleri iOS kendisi yuvarlar; içerik orta %80'de.
NAVY, GREEN, GOLD, WHITE, LIGHT, GREY = '#0F1B3D', '#80C88E', '#E9B22B', '#FFFFFF', '#F3F5F9', '#C5CAD6'

def leaves(cx, cy, s, color=GREEN):
    # ParentApp'teki iki yaprakla aynı biçim: (cx, cy) yaprakların birleştiği nokta, s ölçek
    l = f'M{cx},{cy} C{cx-0.05*s},{cy-0.55*s} {cx-0.35*s},{cy-0.75*s} {cx-1.0*s},{cy-0.68*s} C{cx-0.85*s},{cy-0.05*s} {cx-0.5*s},{cy+0.05*s} {cx},{cy} Z'
    r = f'M{cx},{cy} C{cx+0.05*s},{cy-0.55*s} {cx+0.35*s},{cy-0.75*s} {cx+1.0*s},{cy-0.68*s} C{cx+0.85*s},{cy-0.05*s} {cx+0.5*s},{cy+0.05*s} {cx},{cy} Z'
    return f'<path d="{l}" fill="{color}"/><path d="{r}" fill="{color}"/>'

def svg(bg, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024"><rect width="1024" height="1024" fill="{bg}"/>{body}</svg>'

C = {}
# 1 Gözlem: büyüteç içinde filiz (uzman gözlem toplar)
C['gozlem'] = svg(NAVY, f'''
<circle cx="452" cy="452" r="232" fill="none" stroke="{WHITE}" stroke-width="56"/>
<line x1="622" y1="622" x2="790" y2="790" stroke="{WHITE}" stroke-width="72" stroke-linecap="round"/>
{leaves(452, 540, 150)}
<rect x="440" y="540" width="24" height="90" rx="12" fill="{WHITE}"/>
<circle cx="452" cy="330" r="40" fill="{GOLD}"/>''')
# 2 Filizli pano: bugünkü panonun filizli hali
C['pano'] = svg(NAVY, f'''
<rect x="246" y="204" width="532" height="616" rx="72" fill="{WHITE}"/>
<rect x="420" y="168" width="184" height="72" rx="36" fill="{GOLD}"/>
<rect x="326" y="314" width="372" height="36" rx="18" fill="{GREY}"/>
{leaves(512, 600, 160)}
<rect x="496" y="596" width="32" height="140" rx="16" fill="{NAVY}"/>
<rect x="400" y="716" width="224" height="34" rx="17" fill="{NAVY}"/>''')
# 3 Yükseliş: yükselen sütunlar, en yükseği filizleniyor
C['yukselis'] = svg(NAVY, f'''
<rect x="236" y="560" width="128" height="230" rx="40" fill="{WHITE}" opacity="0.55"/>
<rect x="448" y="460" width="128" height="330" rx="40" fill="{WHITE}" opacity="0.8"/>
<rect x="660" y="360" width="128" height="430" rx="40" fill="{WHITE}"/>
{leaves(724, 340, 120)}
<circle cx="300" cy="300" r="56" fill="{GOLD}"/>''')
# 4 Açık zemin: ParentApp'in tersi (açık zemin, lacivert simge) — ana ekranda iki uygulama karışmaz
C['acik'] = svg(LIGHT, f'''
<circle cx="512" cy="512" r="300" fill="{NAVY}"/>
{leaves(512, 560, 165)}
<rect x="496" y="556" width="32" height="150" rx="16" fill="{WHITE}"/>
<rect x="410" y="690" width="204" height="32" rx="16" fill="{WHITE}"/>
<circle cx="512" cy="330" r="46" fill="{GOLD}"/>''')
# 5 Rutin ızgarası: haftanın günleri, dolan kareler; son kare filiz
cells = ''
filled = [[1,1,0,1],[1,1,1,0],[1,1,1,1]]
for r in range(3):
    for c in range(4):
        x, y = 196 + c*168, 276 + r*168
        if r == 2 and c == 3:
            cells += f'<rect x="{x}" y="{y}" width="128" height="128" rx="36" fill="{GREEN}"/>' + leaves(x+64, y+92, 50, WHITE)
        else:
            cells += f'<rect x="{x}" y="{y}" width="128" height="128" rx="36" fill="{NAVY if filled[r][c] else "#D9DEE8"}"/>'
C['rutin'] = svg(WHITE, cells)
# 6 Köprü: ev ile klinik (iki daire) kesişiminde filiz — ebeveyn rızasıyla ortak alan
C['kopru'] = svg(NAVY, f'''
<circle cx="400" cy="540" r="230" fill="none" stroke="{WHITE}" stroke-width="44"/>
<circle cx="624" cy="540" r="230" fill="none" stroke="{GOLD}" stroke-width="44"/>
{leaves(512, 600, 112)}
<rect x="500" y="596" width="24" height="96" rx="12" fill="{WHITE}"/>''')

NAMES = {'gozlem': 'Gözlem', 'pano': 'Filizli pano', 'yukselis': 'Yükseliş', 'acik': 'Açık zemin', 'rutin': 'Rutin ızgarası', 'kopru': 'Ev + klinik'}
if __name__ == '__main__':
    import json
    for k, v in C.items():
        open(f'{k}.svg', 'w').write(v)
    json.dump({k: {'name': NAMES[k], 'svg': v} for k, v in C.items()}, open('concepts.json', 'w'), ensure_ascii=False)
    print(list(C))
