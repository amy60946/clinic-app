# "Kucak" yönünün sağa açık (C) çeşitlemeleri, 1024×1024 SVG.
# Yay = klinik/uzman (C), daire = çocuk. Yay merkezi (512,512); açıklık sağda.
import math, json
NAVY, WHITE, LIGHT = '#0F1B3D', '#FFFFFF', '#F3F5F9'

def arc(r, gap_deg, cx=512, cy=512):
    a = math.radians(gap_deg)
    x1, y1 = cx + r*math.cos(a), cy - r*math.sin(a)
    x2, y2 = cx + r*math.cos(a), cy + r*math.sin(a)
    return f'M{x1:.1f},{y1:.1f} A{r},{r} 0 1 0 {x2:.1f},{y2:.1f}'

def svg(bg, body, defs=''):
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">'
            f'<defs>{defs}</defs><rect width="1024" height="1024" fill="{bg}"/>{body}</svg>')

def lin(id, a, b, x1=0, y1=0, x2=1, y2=1):
    return f'<linearGradient id="{id}" x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}"><stop offset="0" stop-color="{a}"/><stop offset="1" stop-color="{b}"/></linearGradient>'

def c_shape(fill, w=96, r=272, gap=48, cx=None, cy=512):
    # Sağa açık C: dolu halka dilimi + yuvarlak uçlar (çizgi ucu çentiği olmaz). Görsel merkez 512.
    if cx is None:
        cx = 512 + (r + w/2 - (r*math.cos(math.radians(gap)) + w/2)) / 2
    ro, ri, a = r + w/2, r - w/2, math.radians(gap)
    P = lambda rad, ang: (cx + rad*math.cos(ang), cy - rad*math.sin(ang))
    o1, o2, i1, i2 = P(ro, a), P(ro, -a), P(ri, a), P(ri, -a)
    d = (f'M{o1[0]:.1f},{o1[1]:.1f} A{ro},{ro} 0 1 0 {o2[0]:.1f},{o2[1]:.1f} '
         f'A{w/2},{w/2} 0 0 0 {i2[0]:.1f},{i2[1]:.1f} '
         f'A{ri},{ri} 0 1 1 {i1[0]:.1f},{i1[1]:.1f} '
         f'A{w/2},{w/2} 0 0 0 {o1[0]:.1f},{o1[1]:.1f} Z')
    return f'<path d="{d}" fill="{fill}"/>', cx, ri

def kid(fill, cx, ri, r=122, nest=True):
    # çocuk: yayın iç sol kenarına yaslanır (kucak) ya da ortada durur
    x = cx - ri + r + 30 if nest else cx
    return f'<circle cx="{x:.1f}" cy="512" r="{r}" fill="{fill}"/>'

def kucak(arc_fill, kid_fill, **kw):
    kr = kw.pop('kid_r', 122); nest = kw.pop('nest', True)
    path, cx, ri = c_shape(arc_fill, **kw)
    return path + kid(kid_fill, cx, ri, kr, nest)

V = {}
GOLD = '#F2B53A'
V['temel'] = ('Temel', svg(NAVY, kucak(WHITE, GOLD)))
V['gece'] = ('Gece degradesi', svg('url(#bg)', kucak(WHITE, 'url(#kid)'),
    lin('bg', '#22346E', '#0A1230', 0, 0, 1, 1) + lin('kid', '#FFC94D', '#F2876B', 0, 0, 1, 1)))
# Hilal: kalın sırt, uçlara doğru incelir (iki daire farkı; iç daire zemin rengiyle)
def hilal(bg, fg, kidc):
    return svg(bg, f'<circle cx="530" cy="512" r="300" fill="{fg}"/><circle cx="612" cy="512" r="246" fill="{bg}"/>'
                   f'<circle cx="520" cy="512" r="116" fill="{kidc}"/>')
V['hilal'] = ('Hilal çizgi', hilal(NAVY, WHITE, GOLD))
V['acik'] = ('Açık zemin', svg(LIGHT, kucak(NAVY, GOLD)))
V['degrade_cizgi'] = ('Degrade çizgi', svg(NAVY, kucak('url(#ln)', GOLD), lin('ln', '#FFFFFF', '#7FB8FF', 0, 0, 0, 1)))
p1, cx1, _ = c_shape(WHITE, 40, 300, 44)
p2, _, _ = c_shape('rgba(255,255,255,0.55)', 40, 214, 50, cx=cx1)
V['cift'] = ('Çift çizgi', svg(NAVY, p1 + p2 + f'<circle cx="{cx1+10:.1f}" cy="512" r="104" fill="{GOLD}"/>'))
V['turkuaz'] = ('Turkuaz', svg('url(#bg)', kucak(WHITE, '#FFD166'), lin('bg', '#2BB3A3', '#11616B', 0, 0, 1, 1)))
V['altin'] = ('Altın zemin', svg('url(#bg)', kucak(NAVY, WHITE), lin('bg', '#FFD36B', '#F2A93A', 0, 0, 1, 1)))
V['altin_c'] = ('Altın C', svg('url(#bg)', kucak('url(#ln)', WHITE),
    lin('bg', '#1B2A5C', '#0A1230', 0, 0, 1, 1) + lin('ln', '#FFD36B', '#F2A93A', 0, 0, 0, 1)))
V['yumusak'] = ('Kalın ve mercan', svg(NAVY, kucak(WHITE, '#F2876B', w=136, r=256, gap=52, kid_r=104)))

if __name__ == '__main__':
    for k, (n, s) in V.items():
        open(f'{k}.svg', 'w').write(s)
    json.dump({k: {'name': n, 'svg': s} for k, (n, s) in V.items()}, open('variants.json', 'w'), ensure_ascii=False)
