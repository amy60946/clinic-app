#!/usr/bin/env python3
"""Tanıtım sayfası etkileşim alternatifleri (kullanıcı isteği 11 Kasım 2026).

Kaynak tek: site/index.html. Yazılar oradan ayrıştırılır (aynı kalır), yalnız "Platform Nasıl Çalışır?" bölümünün
(C'de ayrıca açılış görselinin) etkileşimi değişir. Çıktı: out/a.html (kaydırdıkça sabit ekran), out/b.html (tıklanan tur),
out/c.html (kendiliğinden oynayan tur), out/now.html (bugünkü sayfa), out/assets/.
Kullanım: python3 tools/landing-alt/build.py   (görseller: python3 tools/landing-alt/shots.py)
"""
import re, shutil, html as H
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
OUT = HERE / 'out'
src = (ROOT / 'site' / 'index.html').read_text(encoding='utf-8')

# ---------- yazıları kaynaktan ayrıştır ----------
m = re.search(r'<section class="band alt" id="nasil".*?</section>', src, re.S)
NASIL = m.group(0)
HEAD = re.search(r'<div class="head center">.*?</div>', NASIL, re.S).group(0)
feats = re.findall(r'<div class="feat[^"]*"(?: id="urun")?>(.*?)(?=\n      <div class="feat|\n    </div>\n  </section>)', NASIL, re.S)
assert len(feats) == 6, len(feats)
GAME = re.search(r'<div class="mock game".*?\n          </div>', feats[4], re.S).group(0)

STEPS = []
for f in feats:
    txt = re.search(r'<div class="txt">(.*?)</div>', f, re.S).group(1)
    sn = re.search(r'<span class="stepn"><b>(\d)</b>(.*?)</span>', txt)
    eb = re.search(r'<span class="eyebrow">(.*?)</span>', txt)
    STEPS.append({
        'n': sn.group(1) if sn else '', 'label': sn.group(2) if sn else eb.group(1),
        'h': re.search(r'<h2>(.*?)</h2>', txt).group(1), 'ps': re.findall(r'<p>(.*?)</p>', txt, re.S),
    })

# ---------- görseller (güncel ekranlar; Takip Planı 11 Kasım'da gizlendi) ----------
VIS = [
    {'kind': 'ui', 'key': 's1', 'bar': 'ClinicApp · Kaynak kütüphanesi', 'alt': 'Kaynak kütüphanesi: süzgeçler, kaynak kartları ve sağda Ebeveyn eğitimi olarak ata düğmeli önizleme.'},
    {'kind': 'phone', 'key': 's2', 'bar': 'Ebeveynin telefonu', 'alt': 'Ebeveynin telefonundaki eğitim sayfası: ilerleme, öğrenme modülleri ve uygulama görevleri.'},
    {'kind': 'ui', 'key': 's3', 'bar': 'ClinicApp · Davranışlar ve Olaylar', 'alt': 'Bir hedef davranış: stratejiler ve öncül, sonuç, uygulanan strateji, çocuğun tepkisi sütunlu olay tablosu.'},
    {'kind': 'ui', 'key': 's4', 'bar': 'ClinicApp · Ebeveyn Eğitimi', 'alt': 'Gözlem verisi grafiği: haftalar içinde ölçüte doğru yükselen çizgi, üstte üç özet kartı.'},
    {'kind': 'game', 'key': 's5', 'bar': 'Çocuğun oyunu', 'alt': ''},
    # pano: sitedeki görsel aynen (uydurma verili çok danışanlı ekran)
    {'kind': 'ui', 'key': 'board', 'bar': 'ClinicApp · Danışanlar', 'alt': 'Danışan panosu: Senin sıran ve Aileden yeni bölümleri.',
     'd': ('assets/ui-board.webp', 1584, 916), 'm': ('assets/m-board.webp', 1170, 1680)},
]
HERO = {'kind': 'ui', 'key': 'hero', 'bar': 'ClinicApp · Ebeveyn Eğitimi', 'alt': 'Bir danışanın Ebeveyn Eğitimi özeti: Öğrenme modülleri, Uygulama görevleri, Hızlı yapılacaklar kartları ve gözlem grafiği.'}

def img(v, which):
    return v.get(which) or (f'assets/{v["key"]}-{which}.webp', *((1600, 1000) if which == 'd' else (786, 1520)))

def vis(v, lazy=True, mobile=True):
    lz = ' loading="lazy"' if lazy else ''
    if v['kind'] == 'game':
        return GAME
    if v['kind'] == 'phone':
        ms, mw, mh = img(v, 'm')
        return f'<div class="dev"><img src="{ms}" width="{mw}" height="{mh}" alt="{v["alt"]}"{lz}></div>'
    (ds, dw, dh), (ms, mw, mh) = img(v, 'd'), img(v, 'm')
    srcm = f'<source media="(max-width: 700px)" srcset="{ms}" width="{mw}" height="{mh}">' if mobile else ''
    return (f'<div class="ui"><div class="bar" aria-hidden="true"><i></i><i></i><i></i><span>{v["bar"]}</span></div>'
            f'<picture>{srcm}<img src="{ds}" width="{dw}" height="{dh}" alt="{v["alt"]}"{lz}></picture></div>')

def step_txt(s, tag='h2'):
    head = f'<span class="stepn"><b>{s["n"]}</b>{s["label"]}</span>' if s['n'] else f'<span class="eyebrow">{s["label"]}</span>'
    return head + f'<{tag} class="st-h">{s["h"]}</{tag}>' + ''.join(f'<p>{p}</p>' for p in s['ps'])

# ---------- ortak düzeltmeler ----------
def base():
    h = src
    # deneme süresi 14 gün (kullanıcı kararı 10 Kasım 2026); sayfada düğmeler 7 gün kalmıştı
    h = h.replace('7 gün ücretsiz deneyin', '14 gün ücretsiz deneyin').replace('İki paket. 7 gün ücretsiz.', 'İki paket. 14 gün ücretsiz.')
    # açılış görseli: güncel ekran; eski görsele göre konmuş üç işaret kalkar
    stage = re.search(r'<div class="stage">.*?\n      </div>\n    </div>\n    <div class="facts"', h, re.S).group(0)
    new_stage = ('<div class="stage">\n        ' + vis(HERO, lazy=False) +
                 '\n        <div class="marks-legend chips" style="display:flex" aria-hidden="true"><span class="chip plain">Örnek veri</span></div>'
                 '\n      </div>\n    </div>\n    <div class="facts"')
    h = h.replace(stage, new_stage)
    return h

COMMON_CSS = """
/* --- alternatif önizlemeleri: ortak --- */
.dev { height: min(600px, 74vh); aspect-ratio: 393 / 760; max-width: 100%; border: 9px solid var(--ink); border-radius: 36px; overflow: hidden; background: var(--card); box-shadow: var(--shadow); }
.dev img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
.st-h { font-size: clamp(26px, 2.8vw, 36px); }
"""

def put(h, section_html, css, js):
    h = h.replace(NASIL, section_html)
    h = h.replace('</style>', COMMON_CSS + css + '\n</style>', 1)
    i = h.rindex('</script>')
    return h[:i] + '</script>\n<script>\n' + js + '\n' + h[i:]

SEC_OPEN = '<section class="band alt" id="nasil" aria-labelledby="h-nasil">\n    <div class="wrap">\n      ' + HEAD + '\n'
SEC_CLOSE = '\n    </div>\n  </section>'

# ================= A: kaydırdıkça sabit ekran =================
def variant_a():
    steps = ''.join(
        f'<li class="pin-step{" is-on" if i == 0 else ""}" data-i="{i}"><div class="txt">{step_txt(s)}</div>'
        f'<div class="pin-inline">{vis(VIS[i])}</div></li>' for i, s in enumerate(STEPS))
    frames = ''.join(f'<div class="pin-frame k-{v["kind"]}{" is-on" if i == 0 else ""}" data-i="{i}">{vis(v)}</div>' for i, v in enumerate(VIS))
    segs = ''.join(f'<i class="{"is-on" if i == 0 else ""}"></i>' for i in range(len(STEPS)))
    sec = (SEC_OPEN + f'<div class="pin" id="urun"><ol class="pin-steps">{steps}</ol>'
           f'<div class="pin-stage" aria-hidden="true"><div class="pin-segs">{segs}</div><div class="pin-frames">{frames}</div></div></div>' + SEC_CLOSE)
    css = """
/* --- A: sabit ekran, kayan anlatım. Betik yokken ya da hareket azaltmada adımlar alt alta, görseller yerinde. --- */
.pin-steps { display: flex; flex-direction: column; gap: 96px; }
.pin-step .txt { display: flex; flex-direction: column; gap: 16px; min-width: 0; }
.pin-step .txt p { font-size: 17px; color: var(--muted); max-width: 46ch; }
.pin-inline { margin-top: 28px; display: grid; place-items: center; }
.pin-stage { display: none; }
.pin.is-live { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: 64px; align-items: start; }
.pin.is-live .pin-steps { gap: 0; }
.pin.is-live .pin-step { min-height: 82vh; display: flex; flex-direction: column; justify-content: center; opacity: .3; transition: opacity .3s; }
.pin.is-live .pin-step.is-on { opacity: 1; }
.pin.is-live .pin-inline { display: none; }
.pin.is-live .pin-stage { display: flex; flex-direction: column; justify-content: center; gap: 18px; position: sticky; top: 84px; height: calc(100vh - 100px); min-width: 0; }
.pin-segs { display: flex; gap: 6px; }
.pin-segs i { flex: 1; height: 4px; border-radius: 4px; background: var(--line); transition: background .3s; }
.pin-segs i.is-on { background: var(--ink); }
.pin-frames { display: grid; align-items: center; justify-items: center; min-width: 0; }
.pin-frame { grid-area: 1 / 1; width: 100%; min-width: 0; display: grid; place-items: center; opacity: 0; transform: translateY(14px) scale(.985); transition: opacity .35s, transform .35s; pointer-events: none; }
.pin-frame.is-on { opacity: 1; transform: none; }
.pin-frame .dev { height: min(600px, calc(100vh - 190px)); }
@media (max-width: 900px) {
  /* telefonda: görsel üstte sabit kalır, yazı altında kayar */
  .pin.is-live { display: flex; flex-direction: column; }
  .pin.is-live .pin-stage { order: -1; top: calc(68px + env(safe-area-inset-top, 0px)); height: auto; z-index: 5; gap: 10px; margin-inline: -20px; padding: 12px 20px 14px; background: var(--card); border-bottom: 1px solid var(--line); }
  .pin.is-live .pin-frames { height: 34vh; height: 34svh; min-height: 220px; }
  .pin.is-live .pin-frame { height: 100%; }
  .pin.is-live .pin-frame .ui, .pin.is-live .pin-frame .dev { height: 100%; width: 100%; max-width: 420px; aspect-ratio: auto; border-radius: 14px; border-width: 1px; border-color: var(--line); box-shadow: none; display: flex; flex-direction: column; }
  .pin.is-live .pin-frame .ui picture { flex: 1; min-height: 0; display: block; }
  .pin.is-live .pin-frame img { width: 100%; height: 100%; object-fit: cover; object-position: top; }
  .pin.is-live .pin-frame .mock.game { transform: scale(.82); }
  .pin.is-live .pin-step { min-height: 58vh; min-height: 58svh; justify-content: flex-start; padding-top: 36px; }
  .pin.is-live .pin-step:last-child { min-height: 46vh; }
}
"""
    js = """
(function () {
  // A: adım ekranın ortasına gelince sağdaki (telefonda üstteki) sabit görsel o adıma geçer. Kaydırma tarayıcınındır; hız ya da yön değiştirilmez.
  var pin = document.querySelector('.pin'); if (!pin || !('IntersectionObserver' in window)) return;
  var steps = [].slice.call(pin.querySelectorAll('.pin-step')), frames = [].slice.call(pin.querySelectorAll('.pin-frame')), segs = [].slice.call(pin.querySelectorAll('.pin-segs i'));
  pin.classList.add('is-live');
  var set = function (n) {
    steps.forEach(function (el, i) { el.classList.toggle('is-on', i === n); });
    frames.forEach(function (el, i) { el.classList.toggle('is-on', i === n); });
    segs.forEach(function (el, i) { el.classList.toggle('is-on', i <= n); });
  };
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) set(+e.target.getAttribute('data-i')); });
  }, { rootMargin: '-52% 0px -47% 0px' });
  steps.forEach(function (el) { io.observe(el); });
})();
"""
    return put(base(), sec, css, js)

# ================= B: tıklanan tur =================
def variant_b():
    items = ''.join(
        f'<li class="tour-item{" is-on" if i == 0 else ""}">'
        f'<button type="button" class="tour-btn" id="tb{i}" aria-expanded="{"true" if i == 0 else "false"}" aria-controls="tp{i}">'
        f'<b>{s["n"] or "•"}</b><span>{s["label"]}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button>'
        f'<div class="tour-body" id="tp{i}" role="region" aria-labelledby="tb{i}"><div class="tour-in">'
        f'<h3 class="st-h">{s["h"]}</h3>' + ''.join(f'<p>{p}</p>' for p in s['ps']) +
        f'<div class="tour-inline">{vis(VIS[i])}</div></div></div></li>' for i, s in enumerate(STEPS))
    frames = ''.join(f'<div class="tour-frame k-{v["kind"]}{" is-on" if i == 0 else ""}">{vis(v, mobile=False)}</div>' for i, v in enumerate(VIS))
    sec = (SEC_OPEN + f'<div class="tour" id="urun"><ol class="tour-list">{items}</ol>'
           f'<div class="tour-stage" aria-hidden="true">{frames}</div></div>'
           '<div class="tour-nav"><button type="button" class="btn btn-ghost" id="tour-prev">← Önceki</button>'
           '<span id="tour-count" aria-live="polite">1 / 6</span>'
           '<button type="button" class="btn btn-primary" id="tour-next">Sonraki adım →</button></div>' + SEC_CLOSE)
    css = """
/* --- B: tıklanan tur. Adıma dokun, yazı ve ekran yerinde değişir; sayfa uzamaz. Betik yokken bütün adımlar açık. --- */
.tour-list { display: flex; flex-direction: column; gap: 10px; min-width: 0; }
.tour-item { border: 1px solid var(--line); border-radius: var(--r-md); background: var(--paper); overflow: hidden; }
.tour-item.is-on { background: var(--card); border-color: var(--ink); box-shadow: 0 12px 30px -22px rgba(15,27,61,.5); }
.tour-btn { width: 100%; display: flex; align-items: center; gap: 12px; padding: 14px 16px; background: none; border: 0; font: inherit; font-size: 15.5px; font-weight: 800; color: var(--ink); text-align: left; cursor: pointer; }
.tour-btn b { flex: none; width: 30px; height: 30px; border-radius: 50%; background: var(--off-bg); color: var(--off-fg); display: grid; place-items: center; font-size: 14px; }
.tour-item.is-on .tour-btn b { background: var(--ink); color: #fff; }
.tour-btn span { flex: 1; min-width: 0; }
.tour-btn svg { flex: none; width: 18px; height: 18px; stroke: var(--muted); fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; transition: transform .2s; }
.tour-item.is-on .tour-btn svg { transform: rotate(180deg); }
.tour-in { display: flex; flex-direction: column; gap: 12px; padding: 2px 16px 18px 58px; min-height: 0; }
.tour-in .st-h { font-size: clamp(21px, 2.1vw, 27px); line-height: 1.15; }
.tour-in p { font-size: 16px; color: var(--muted); }
.tour-inline { margin-top: 8px; display: grid; place-items: center; }
.tour-stage, .tour-nav { display: none; }
.tour.is-live .tour-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .28s; }
.tour.is-live .tour-body > .tour-in { overflow: hidden; padding-block: 0; }
.tour.is-live .tour-item.is-on .tour-body { grid-template-rows: 1fr; }
.tour.is-live .tour-item.is-on .tour-in { padding-block: 2px 18px; }
.tour.is-live .tour-item:not(.is-on) .tour-in { visibility: hidden; }
.tour.is-live ~ .tour-nav { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 28px; font-weight: 800; color: var(--ink); font-variant-numeric: tabular-nums; }
.tour-nav .btn { min-height: 44px; padding: 0 18px; font-size: 15px; }
.tour-nav .btn[disabled] { opacity: .4; cursor: default; }
@media (min-width: 901px) {
  .tour.is-live { display: grid; grid-template-columns: minmax(0, .86fr) minmax(0, 1.14fr); gap: 48px; align-items: center; }
  .tour.is-live .tour-inline { display: none; }
  .tour.is-live .tour-stage { display: grid; align-items: center; justify-items: center; min-width: 0; }
  .tour-frame { grid-area: 1 / 1; width: 100%; min-width: 0; display: grid; place-items: center; opacity: 0; transform: translateY(10px); transition: opacity .3s, transform .3s; pointer-events: none; }
  .tour-frame.is-on { opacity: 1; transform: none; }
  .tour-frame .dev { height: min(560px, 70vh); }
}
@media (max-width: 900px) { .tour-in { padding-left: 16px; } .tour-inline .dev { height: min(520px, 68vh); } }
"""
    js = """
(function () {
  // B: akordeon. Aynı anda tek adım açık; düğme, ok tuşları ve "Sonraki adım" ile gezilir. Kendiliğinden ilerlemez.
  var tour = document.querySelector('.tour'); if (!tour) return;
  var items = [].slice.call(tour.querySelectorAll('.tour-item')), frames = [].slice.call(tour.querySelectorAll('.tour-frame'));
  var btns = items.map(function (el) { return el.querySelector('.tour-btn'); });
  var prev = document.getElementById('tour-prev'), next = document.getElementById('tour-next'), count = document.getElementById('tour-count');
  var cur = 0;
  tour.classList.add('is-live');
  var set = function (n, focus) {
    cur = Math.max(0, Math.min(items.length - 1, n));
    items.forEach(function (el, i) { el.classList.toggle('is-on', i === cur); btns[i].setAttribute('aria-expanded', String(i === cur)); });
    frames.forEach(function (el, i) { el.classList.toggle('is-on', i === cur); });
    count.textContent = (cur + 1) + ' / ' + items.length;
    prev.disabled = cur === 0; next.disabled = cur === items.length - 1;
    if (focus) btns[cur].focus();
    if (window.matchMedia('(max-width: 900px)').matches && focus !== null) {
      setTimeout(function () { var r = items[cur].getBoundingClientRect(); if (r.top < 76 || r.top > window.innerHeight * .5) window.scrollBy({ top: r.top - 84, behavior: 'smooth' }); }, 300);
    }
  };
  btns.forEach(function (b, i) {
    b.addEventListener('click', function () { set(i); });
    b.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); set(cur + 1, true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); set(cur - 1, true); }
    });
  });
  prev.addEventListener('click', function () { set(cur - 1); });
  next.addEventListener('click', function () { set(cur + 1); });
  set(0, null);
})();
"""
    return put(base(), sec, css, js)

# ================= C: kendiliğinden oynayan tur =================
def variant_c():
    h = base()
    # açılış: tek görsel yerine adımları sırayla gösteren tur
    reel_frames = ''.join(
        f'<div class="reel-frame k-{v["kind"]}{" is-on" if i == 0 else ""}">' +
        (GAME if v['kind'] == 'game' else
         (f'<div class="dev"><img src="assets/{v["key"]}-m.webp" width="786" height="1520" alt="{v["alt"]}"></div>' if v['kind'] == 'phone' else
          f'<picture><source media="(max-width: 700px)" srcset="assets/{v["key"]}-m.webp" width="786" height="1520"><img src="assets/{v["key"]}-d.webp" width="1600" height="1000" alt="{v["alt"]}"></picture>')) +
        '</div>' for i, v in enumerate(VIS[:5]))
    segs = ''.join(f'<li><button type="button" class="reel-seg{" is-on" if i == 0 else ""}" aria-label="{i + 1}. adım: {H.escape(H.unescape(re.sub("<[^>]+>", "", s["label"])))}"><i></i></button></li>' for i, s in enumerate(STEPS[:5]))
    caps = ''.join(f'<p class="reel-cap{" is-on" if i == 0 else ""}"><b>{s["n"]}</b><span>{s["label"]}</span></p>' for i, s in enumerate(STEPS[:5]))
    reel = ('<div class="stage reel" id="reel" role="group" aria-roledescription="tur" aria-label="Platform nasıl çalışır: beş adım">\n'
            f'        <div class="ui"><div class="bar" aria-hidden="true"><i></i><i></i><i></i><span id="reel-bar">{VIS[0]["bar"]}</span></div><div class="reel-frames">{reel_frames}</div></div>\n'
            f'        <div class="reel-ctl"><button type="button" class="reel-play" id="reel-play" aria-label="Turu duraklat"><svg viewBox="0 0 24 24" aria-hidden="true"><path class="pa" d="M8 5v14M16 5v14"/><path class="pl" d="M8 5l11 7-11 7z"/></svg></button>'
            f'<div class="reel-caps" aria-live="off">{caps}</div><ol class="reel-segs">{segs}</ol></div>\n'
            '        <div class="marks-legend chips" style="display:flex" aria-hidden="true"><span class="chip plain">Örnek veri</span></div>\n      </div>')
    stage = re.search(r'<div class="stage">.*?\n      </div>(?=\n    </div>\n    <div class="facts")', h, re.S).group(0)
    h = h.replace(stage, reel)
    rows = ''.join(
        f'<div class="feat{" flip" if i % 2 == 0 else ""} rv"{" id=" + chr(34) + "urun" + chr(34) if i == 0 else ""}><div class="txt">{step_txt(s)}</div>'
        f'<div class="vis{"" if VIS[i]["kind"] == "ui" else " vis-c"}">{vis(VIS[i])}</div></div>' for i, s in enumerate(STEPS))
    sec = SEC_OPEN + rows + SEC_CLOSE
    bars = '[' + ','.join('"' + v['bar'] + '"' for v in VIS[:5]) + ']'
    css = """
/* --- C: kendiliğinden oynayan tur (açılış) + kaydırınca yumuşak beliren satırlar. Duraklat düğmesi var; hareket azaltmada oynamaz. --- */
@media (min-width: 1041px) {
  .hero > .wrap { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.2fr); gap: 52px; align-items: center; padding-block: 56px 8px; }
  .hero > .wrap .copy { align-items: flex-start; text-align: left; padding-block: 0; }
  .hero > .wrap h1 { font-size: clamp(34px, 3.5vw, 50px); max-width: none; }
  .hero > .wrap .actions { justify-content: flex-start; }
  .hero > .wrap .stage { margin: 0; max-width: none; min-width: 0; }
  .hero > .wrap .marks-legend { justify-content: flex-start; }
}
.reel .ui { position: relative; }
.reel-frames { display: grid; aspect-ratio: 16 / 10; background: var(--head); overflow: hidden; }
.reel-frame { grid-area: 1 / 1; min-width: 0; min-height: 0; display: grid; place-items: center; opacity: 0; transition: opacity .5s; }
.reel-frame.is-on { opacity: 1; }
.reel-frame picture, .reel-frame picture img { width: 100%; height: 100%; display: block; object-fit: cover; object-position: top; }
.reel-frame .dev { height: 90%; border-width: 7px; border-radius: 28px; }
.reel-frame.is-on picture img { animation: reel-zoom 5.2s ease-out both; }
@keyframes reel-zoom { from { transform: scale(1.035); } to { transform: scale(1); } }
.reel-ctl { display: grid; grid-template-columns: auto minmax(0, 1fr); column-gap: 14px; row-gap: 10px; align-items: center; margin-top: 16px; }
.reel-play { width: 44px; height: 44px; border-radius: 50%; border: 1px solid var(--line); background: var(--card); display: grid; place-items: center; cursor: pointer; }
.reel-play svg { width: 18px; height: 18px; stroke: var(--ink); fill: none; stroke-width: 2.4; stroke-linecap: round; stroke-linejoin: round; }
.reel-play .pl { display: none; fill: var(--ink); }
.reel.is-paused .reel-play .pl { display: block; } .reel.is-paused .reel-play .pa { display: none; }
.reel-caps { display: grid; min-width: 0; }
.reel-cap { grid-area: 1 / 1; display: flex; align-items: center; gap: 10px; font-size: 15px; font-weight: 800; color: var(--ink); text-align: left; opacity: 0; transition: opacity .3s; min-width: 0; }
.reel-cap.is-on { opacity: 1; }
.reel-cap b { flex: none; width: 28px; height: 28px; border-radius: 50%; background: var(--ink); color: #fff; display: grid; place-items: center; font-size: 13.5px; }
.reel-cap span { min-width: 0; }
.reel-segs { grid-column: 1 / -1; display: flex; gap: 6px; }
.reel-segs li { flex: 1; }
.reel-seg { display: block; width: 100%; padding: 10px 0; background: none; border: 0; cursor: pointer; }
.reel-seg i { display: block; height: 4px; border-radius: 4px; background: var(--line); overflow: hidden; position: relative; }
.reel-seg i::after { content: ""; position: absolute; inset: 0; background: var(--ink); transform: scaleX(0); transform-origin: left; }
.reel-seg.is-done i::after { transform: scaleX(1); }
.reel-seg.is-on i::after { animation: reel-fill var(--reel-ms, 5200ms) linear forwards; }
.reel.is-paused .reel-seg.is-on i::after { animation-play-state: paused; }
@keyframes reel-fill { to { transform: scaleX(1); } }
@media (max-width: 700px) { .reel-frames { aspect-ratio: 4 / 5; } .reel-frame .dev { height: 94%; } .reel-cap { font-size: 14px; } }
@media (prefers-reduced-motion: reduce) { .reel-seg.is-on i::after { transform: scaleX(1); } }
/* kaydırınca belirme: görünür durumdan başlar (betik çalışmasa da okunur) */
.rv.rv-wait { opacity: .5; transform: translateY(18px); }
.rv { transition: opacity .5s ease-out, transform .5s ease-out; }
.mock.game .bar3 span { transition: width 1.1s ease-out .2s; }
.rv.rv-wait .mock.game .bar3 span { width: 0 !important; }
"""
    js = """
(function () {
  // C: açılıştaki tur beş adımı sırayla gösterir. Duraklat/oynat düğmesi, adım çizgilerine dokunma; fare üstündeyken,
  // odak içindeyken, sekme arka plandayken ve ekran dışındayken durur. Hareket azaltma açıksa hiç oynamaz.
  var reel = document.getElementById('reel'); if (!reel) return;
  var MS = 5200, BARS = __BARS__;
  var frames = [].slice.call(reel.querySelectorAll('.reel-frame')), caps = [].slice.call(reel.querySelectorAll('.reel-cap')), segs = [].slice.call(reel.querySelectorAll('.reel-seg'));
  var bar = document.getElementById('reel-bar'), play = document.getElementById('reel-play');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var cur = 0, user = reduce, hold = false, seen = true, t = null, left = MS, at = 0;
  reel.style.setProperty('--reel-ms', MS + 'ms');
  var show = function (n) {
    cur = (n + frames.length) % frames.length;
    frames.forEach(function (el, i) { el.classList.toggle('is-on', i === cur); });
    caps.forEach(function (el, i) { el.classList.toggle('is-on', i === cur); });
    segs.forEach(function (el, i) { el.classList.remove('is-on'); el.classList.toggle('is-done', i < cur); });
    void reel.offsetWidth; segs[cur].classList.add('is-on');
    bar.textContent = BARS[cur]; left = MS;
  };
  var stop = function () { if (t) { clearTimeout(t); t = null; left = Math.max(400, left - (Date.now() - at)); } };
  var run = function () {
    stop();
    var paused = user || hold || !seen || document.hidden;
    reel.classList.toggle('is-paused', paused);
    play.setAttribute('aria-label', user ? 'Turu oynat' : 'Turu duraklat');
    if (paused) return;
    at = Date.now(); t = setTimeout(function () { t = null; show(cur + 1); run(); }, left);
  };
  play.addEventListener('click', function () { user = !user; run(); });
  segs.forEach(function (b, i) { b.addEventListener('click', function () { user = true; show(i); run(); }); });
  reel.addEventListener('mouseenter', function () { hold = true; run(); });
  reel.addEventListener('mouseleave', function () { hold = false; run(); });
  reel.addEventListener('focusin', function () { hold = true; run(); });
  reel.addEventListener('focusout', function () { hold = false; run(); });
  document.addEventListener('visibilitychange', run);
  if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; run(); }, { threshold: .2 }).observe(reel);
  show(0); run();

  // satırlar ekrana girerken yumuşakça yerine oturur
  if (reduce || !('IntersectionObserver' in window)) return;
  var rows = [].slice.call(document.querySelectorAll('.rv'));
  var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.remove('rv-wait'); io.unobserve(e.target); } }); }, { rootMargin: '0px 0px -12% 0px' });
  rows.forEach(function (el) { if (el.getBoundingClientRect().top > window.innerHeight * .9) { el.classList.add('rv-wait'); io.observe(el); } });
})();
""".replace('__BARS__', bars)
    return put(h, sec, css, js)

def now():
    return src

if __name__ == '__main__':
    OUT.mkdir(exist_ok=True)
    (OUT / 'a.html').write_text(variant_a(), encoding='utf-8')
    (OUT / 'b.html').write_text(variant_b(), encoding='utf-8')
    (OUT / 'c.html').write_text(variant_c(), encoding='utf-8')
    (OUT / 'now.html').write_text(now(), encoding='utf-8')
    dst = OUT / 'assets'
    if dst.exists(): shutil.rmtree(dst)
    shutil.copytree(ROOT / 'site' / 'assets', dst)
    for f in (HERE / 'assets').glob('*.webp'): shutil.copy(f, dst / f.name)
    icon = ROOT / 'assets' / 'icon-concepts' / 'kucak' / 'temel.png'
    if icon.exists(): shutil.copy(icon, dst / 'icon.png')
    print('Hazır:', OUT, [p.name for p in sorted(OUT.glob('*.html'))])
