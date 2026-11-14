// Tanıtım sayfası için kısa ekran kayıtları. Kullanım: node record.js <sahne> | all   (ayrıntı: README.md)
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const kit = require('./kit');

const ORDER = ['akis', 'hero', 'kutuphane', 'aile', 'davranis', 'rapor', 'pano', 'hero-m', 'davranis-m', 'rapor-m'];
const load = (id) => require(path.join(__dirname, 'scenes', `${id}.js`));

function probe(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height,r_frame_rate,nb_frames:format=duration', '-of', 'json', file], { encoding: 'utf8' });
  const j = JSON.parse(r.stdout || '{}');
  const st = (j.streams || [])[0] || {};
  return { width: st.width, height: st.height, fps: st.r_frame_rate, duration: Number((j.format || {}).duration || 0) };
}

async function record(id) {
  const scene = load(id);
  const s = await kit.open(scene.device || 'desktop', scene.data || {});
  const h = new kit.Human(s, scene.seed || 7);
  let rec;
  try {
    await scene.prepare(h, s);
    await kit.sleep(700);
    rec = new kit.Recorder(s.cdp, path.join(kit.TMP, id, 'cap'), s.device.out);
    await rec.start();
    await kit.sleep(300);
    h.T0 = kit.now();
    await scene.run(h, s);
    const end = kit.now();
    await rec.stop();
    if (s.page.errors.length) console.log(`  sayfa hataları: ${JSON.stringify(s.page.errors.slice(0, 3))}`);
    const seqDir = path.join(kit.TMP, id, 'seq');
    const q = kit.sequence(rec, h, end, seqDir);
    const e = kit.encode(id, seqDir, q.poster, s.device.out, scene.maxBytes || 1.8e6);
    const pr = probe(path.join(kit.OUT, `${id}.mp4`));
    const entry = { id, title_tr: scene.title_tr, duration_s: Math.round(pr.duration * 100) / 100, width: pr.width, height: pr.height,
      mp4_bytes: e.mp4_bytes, webm_bytes: e.webm_bytes, poster: e.poster, beats: h.beats };
    const mf = path.join(kit.OUT, 'manifest.json');
    const all = fs.existsSync(mf) ? JSON.parse(fs.readFileSync(mf, 'utf8')) : [];
    const next = [...all.filter((x) => x.id !== id), entry].sort((a, b) => ORDER.indexOf(a.id) - ORDER.indexOf(b.id));
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
  for (let i = 1; ; i++) {
    const r = await record(id);
    if (r.missed === 0 || i >= Number(process.env.MOTION_TRIES || 4)) return r;
    console.log(`  ${id}: ${r.missed} hareket adımı kaçtı, yeniden çekiliyor (${i + 1}. deneme)`);
  }
}

(async () => {
  const arg = process.argv[2];
  if (!arg) { console.log('kullanım: node record.js <sahne> | all | mobile\nsahneler: ' + ORDER.join(', ')); process.exit(1); }
  const ids = arg === 'all' ? ORDER.filter((id) => !id.endsWith('-m') && fs.existsSync(path.join(__dirname, 'scenes', `${id}.js`)))
    : arg === 'mobile' ? ORDER.filter((id) => id.endsWith('-m') && fs.existsSync(path.join(__dirname, 'scenes', `${id}.js`))) : process.argv.slice(2);
  for (const id of ids) await recordClean(id);
})().catch((e) => { console.error(e); process.exit(1); });
