// Tanıtım sayfası için kısa ekran kayıtları. Kullanım: node record.js <sahne> | all   (ayrıntı: README.md)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const kit = require('./kit');

const ORDER = ['akis', 'rutin', 'davranis', 'seans', 'rapor', 'pano'];
const load = (id) => require(path.join(__dirname, 'scenes', `${id}.js`));

function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames:format=duration', '-of', 'json', file], { encoding: 'utf8' });
  const j = JSON.parse(r.stdout || '{}');
  const st = (j.streams || [])[0] || {};
  return { width: st.width, height: st.height, fps: st.r_frame_rate, duration: Number((j.format || {}).duration || 0) };
}

// İmleç görüntüsü: sayfadaki SVG okun aynısı, şeffaf zeminde, kayıt ölçeğinde (MOTION_IMLEC=sonra; imlec.py kullanır)
async function imlecGorseli(s, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const pg = await s.ctx.newPage();
  await pg.setContent('<html><body style="margin:0;background:transparent"><div id="k" style="position:absolute;left:0;top:0;width:40px;height:40px;padding:0">'
    + '<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" style="position:absolute;left:8px;top:8px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.38))">'
    + '<path d="M5.5 3.2v16.2l4.2-3.9 2.7 6.2 2.7-1.2-2.7-6.1h5.7z" fill="#111" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg></div></body></html>');
  await pg.locator('#k').screenshot({ path: path.join(dir, 'imlec.png'), omitBackground: true });
  await pg.close();
}

// MOTION_DEVICE=dikey: masaüstü sahneleri telefonda gösterilecek dikey çerçevede çekilir, çıktı adı <sahne>-d (22 Kasım 2026)
async function record(name) {
  const scene = load(name);
  const dev = scene.device || 'desktop';
  const alt = process.env.MOTION_DEVICE && dev === 'desktop' ? process.env.MOTION_DEVICE : null;
  const id = alt ? `${name}-${alt === 'dikey' ? 'd' : alt}` : name;
  const s = await kit.open(alt || dev, { ...(scene.data || {}), dsf: process.env.MOTION_DSF ? Number(process.env.MOTION_DSF) : undefined });
  const h = new kit.Human(s, scene.seed || 7);
  let rec;
  try {
    await scene.prepare(h, s);
    await kit.sleep(700);
    if (kit.POST_CURSOR) {
      // imleç görüntüsü (sayfadaki okla aynı SVG) bir kez çizilir, kayıtta sayfadaki imleç gizlenir
      await imlecGorseli(s, path.join(kit.TMP, id));
      await s.page.addStyleTag({ content: '#__lm-cursor{visibility:hidden!important}.__lm-ring{display:none!important}' });
    }
    rec = new kit.Recorder(s.cdp, path.join(kit.TMP, id, 'cap'), s.device.out);
    await rec.start();
    await kit.sleep(300);
    h.T0 = kit.now();
    h.startTrail();
    await scene.run(h, s);
    const end = kit.now();
    await rec.stop();
    if (s.page.errors.length) console.log(`  sayfa hataları: ${JSON.stringify(s.page.errors.slice(0, 3))}`);
    const seqDir = path.join(kit.TMP, id, 'seq');
    const q = kit.sequence(rec, h, end, seqDir);
    let encDir = seqDir;
    if (kit.POST_CURSOR) {
      encDir = path.join(kit.TMP, id, 'seq-imlec');
      const r = spawnSync('python3', [path.join(__dirname, 'imlec.py'), seqDir, encDir, path.join(kit.TMP, id, 'imlec.json'), path.join(kit.TMP, id, 'imlec.png'),
        String((process.env.MOTION_DSF ? Number(process.env.MOTION_DSF) : s.device.deviceScaleFactor) * s.device.viewport.width / s.device.out[0]),
        String(s.device.out[0] / s.device.viewport.width)], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error('imlec.py: ' + r.stderr.slice(-400));
    }
    const e = kit.encode(id, encDir, q.poster, s.device.out, scene.maxBytes || 1.8e6);
    const pr = probe(path.join(kit.OUT, `${id}.mp4`));
    const entry = { id, title_tr: scene.title_tr, duration_s: Math.round(pr.duration * 100) / 100, width: pr.width, height: pr.height,
      mp4_bytes: e.mp4_bytes, webm_bytes: e.webm_bytes, poster: e.poster, beats: h.beats };
    const mf = path.join(kit.OUT, 'manifest.json');
    const all = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : [];
    const rank = (x) => ORDER.indexOf(x.replace(/-d$/, '')) + (x.endsWith('-d') ? 0.5 : 0);
    const next = [...all.filter((x) => x.id !== id), entry].sort((a, b) => rank(a.id) - rank(b.id));
    fs.writeFileSync(mf, JSON.stringify(next, null, 1) + '\n');
    console.log(`${id}: ${entry.duration_s} sn · ${pr.width}x${pr.height} @ ${pr.fps} · mp4 ${e.mp4_bytes} (crf ${e.crf}) · webm ${e.webm_bytes || 'yok'} (crf ${e.vcrf})`
      + ` · yakalanan ${q.captured} kare (hareket sırasında ~${q.fpsWhileMoving} kare/sn) · kaçan hareket adımı ${q.missed}/${q.moves}`);
    return { id, ...q, ...entry };
  } finally {
    await s.browser.close();
  }
}

// Hareket adımlarından biri kendi karesini kaçırdıysa (imleç takılır) sahne yeniden çekilir
async function recordClean(id) {
  // En az kaçan adımlı deneme saklanır (sonraki deneme daha kötü çıkarsa ona dönülür)
  const ext = ['mp4', 'webm', 'webp'];
  let best = null;
  const keep = (r) => {
    const oid = r.id;
    for (const e of ext) { const f = path.join(kit.OUT, `${oid}.${e}`), b = path.join(kit.TMP, `best-${oid}.${e}`); fs.rmSync(b, { force: true }); if (fs.existsSync(f)) fs.copyFileSync(f, b); }
    best = r;
  };
  for (let i = 1; ; i++) {
    const r = await record(id);
    if (!best || r.missed < best.missed) keep(r);
    if (r.missed <= r.moves * 0.02 || i >= Number(process.env.MOTION_TRIES || 4)) break;
    console.log(`  ${id}: ${r.missed} hareket adımı kaçtı, yeniden çekiliyor (${i + 1}. deneme)`);
  }
  for (const e of ext) { const f = path.join(kit.OUT, `${best.id}.${e}`), b = path.join(kit.TMP, `best-${best.id}.${e}`); fs.rmSync(f, { force: true }); if (fs.existsSync(b)) fs.copyFileSync(b, f); }
  // manifest'te saklanan denemenin satırı kalsın (her deneme kendi satırını yazıyordu; adımların saniyeleri denemeden denemeye değişir)
  const mf = path.join(kit.OUT, 'manifest.json');
  const keys = ['id', 'title_tr', 'duration_s', 'width', 'height', 'mp4_bytes', 'webm_bytes', 'poster', 'beats'];
  const row = Object.fromEntries(keys.map((k) => [k, best[k]]));
  const all = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : [];
  fs.writeFileSync(mf, JSON.stringify(all.map((x) => (x.id === best.id ? row : x)), null, 1) + '\n');
  console.log(`  ${id}: saklanan deneme ${best.missed}/${best.moves} kaçan adım · adımlar ${JSON.stringify(best.beats.map((b) => b.t))}`);
  return best;
}

(async () => {
  const arg = process.argv[2];
  if (!arg) { console.log('kullanım: node record.js <sahne> | all | mobile\nsahneler: ' + ORDER.join(', ')); process.exit(1); }
  const ids = arg === 'all' ? ORDER.filter((id) => !id.endsWith('-m') && fs.existsSync(path.join(__dirname, 'scenes', `${id}.js`)))
    : arg === 'mobile' ? ORDER.filter((id) => id.endsWith('-m') && fs.existsSync(path.join(__dirname, 'scenes', `${id}.js`))) : process.argv.slice(2);
  for (const id of ids) await recordClean(id);
})().catch((e) => { console.error(e); process.exit(1); });
