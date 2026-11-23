// Çatı sayfa ve Moyo Ebeveyn sayfası için gerçek Moyo (ParentApp) ekranları: 390×844 nokta ×2 → 600×1298 webp, uydurma veri.
// Önce: parent-app'te `bash preview/build.sh`. Kullanım: node tools/cati-sayfa/cek/moyo.js [ad …]   (CEK_DEBUG=1 → ekrandaki yazıyı da basar)
// Deneme verisi ve giriş parent-app `store/capture/prep.js` ile (mağaza görselleriyle aynı uydurma aile); adım sözdizimi `store/capture/capture.js` ile aynı:
//   "Yazı" tam eşleşme · "~Yazı" içeren · "@Etiket" aria-label · "xy:x,y" nokta · "scroll:n" · "wait:ms" · başta "?" = varsa dokun
//   "type:Yer tutucu=metin" alana harf harf yazar · "cb:Ad" adı tam eşleşen onay kutusuna dokunur (önceki ekranlardaki gizli kopyalar atlanır)
// moyo.json: clinic = uzman bağlı kalsın · keep = uzmanın bekleyen önerileri kalsın · noSessions = randevular görünmesin
//   invite = bağlanmamış bir uzman daveti eklenir (kod K7M2PA, örnek uzman; "Uzman bağla" onay ekranı için, 19 Kasım 2026)
const path = require('path');
const fs = require('fs');
const os = require('os');
const { execFileSync } = require('child_process');
const { chromium } = require('playwright');
const PARENT = process.env.PARENT_APP || path.resolve(__dirname, '../../../../parent-app');
const { prep } = require(path.join(PARENT, 'store/capture/prep.js'));
process.env.PREVIEW_APP_HTML = process.env.PREVIEW_APP_HTML || path.join(PARENT, 'preview/out/app.html');
const IMG = path.resolve(__dirname, '../img');
const TMP = path.join(os.tmpdir(), 'cati-cek');
fs.mkdirSync(TMP, { recursive: true });
const shots = JSON.parse(fs.readFileSync(path.join(__dirname, 'moyo.json'), 'utf8'));
const only = process.argv.slice(2);
// Telefon sürümü (23 Kasım 2026): CEK_H=700 CEK_EK=-m → img/<ad>-m.webp, 820 genişlik (çatı ve Ebeveyn sayfasında telefonda kart genişliğinde, 3 kat ekranda keskin)
const CEK_H = +(process.env.CEK_H || 844), CEK_EK = process.env.CEK_EK || '', CEK_GEN = process.env.CEK_GEN || '600', CEK_DSF = CEK_EK ? 2.2 : 2;
const KEY = 'pofi-onizleme-v14';   // parent-app preview/demo-supabase.ts KEY (store/capture/prep.js ile aynı)
const FONT = [400, 500, 600, 700, 800, 900].map((w, i) => `@font-face{font-family:BlinkMacSystemFont;src:local('${['Inter', 'Inter Medium', 'Inter SemiBold', 'Inter Bold', 'Inter ExtraBold', 'Inter Black'][i]}');font-weight:${w}}`).join('\n');

(async () => {
  const b = await chromium.launch();
  for (const s of shots) {
    if (only.length && !only.includes(s.name)) continue;
    const ctx = await b.newContext({ viewport: { width: 390, height: CEK_H }, deviceScaleFactor: CEK_DSF, locale: 'tr-TR', timezoneId: 'Europe/Istanbul', colorScheme: 'light' });
    const p = await ctx.newPage();
    p.on('pageerror', (e) => console.log('HATA', s.name, String(e.message).slice(0, 160)));
    await p.addInitScript((css) => { document.addEventListener('DOMContentLoaded', () => { const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st); }); }, FONT);
    if (s.keep) await p.addInitScript((K) => {
      const set = Storage.prototype.setItem;
      Storage.prototype.setItem = function (k, v) {
        if (k === K && !this.getItem('__cek_pending')) { try { const pend = (JSON.parse(v).clinic_task_suggestions || []).filter((x) => x.status === 'pending'); if (pend.length) set.call(this, '__cek_pending', JSON.stringify(pend)); } catch (e) { /* geç */ } }
        return set.call(this, k, v);
      };
    }, KEY);
    await prep(p, { clinic: !!s.clinic });
    if (s.invite) {
      // prep.js davetleri siler: "Uzman bağla" ekranı için bu aileye henüz bağlanmamış bir davet (çocuk önerisi yok) eklenir
      await p.evaluate((K) => {
        const db = JSON.parse(localStorage.getItem(K));
        db.clinic_invites.push({ code: 'K7M2PA', token: 'aa11bb22cc33dd44ee55ff6677889900', kind: 'family', clinic_id: 'demo-clinic', clinician_id: 'demo-clinician', label: '',
          child_name: null, child_age_group: null, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 47 * 3600e3).toISOString(),
          used_at: null, used_by: null, claimed_at: null, claimed_family: null, revoked_at: null });
        localStorage.setItem(K, JSON.stringify(db));
      }, KEY);
      await p.reload(); await p.waitForTimeout(2500);
    }
    if (s.keep || s.noSessions) {
      // Uzmanım ekranı: uzmanın bekleyen rutin ve adım önerileri görünsün (değişiklik önerisi hariç); randevular bu çekimde yok
      await p.evaluate(({ K, keep, noSessions }) => {
        const db = JSON.parse(localStorage.getItem(K));
        if (keep) JSON.parse(localStorage.getItem('__cek_pending') || '[]').filter((x) => x.kind !== 'change')
          .forEach((x) => { if (!db.clinic_task_suggestions.some((y) => y.id === x.id)) db.clinic_task_suggestions.push(x); });
        if (noSessions) db.clinic_sessions = [];
        localStorage.setItem(K, JSON.stringify(db));
      }, { K: KEY, keep: !!s.keep, noSessions: !!s.noSessions });
      await p.reload(); await p.waitForTimeout(2500);
    }
    for (const raw of s.steps || []) {
      const opt = raw.startsWith('?'), st = opt ? raw.slice(1) : raw, timeout = opt ? 1500 : 4000;   // "?…": varsa dokun, yoksa sessizce geç
      try {
        if (st.startsWith('wait:')) await p.waitForTimeout(+st.slice(5));
        else if (st.startsWith('@')) await p.getByLabel(st.slice(1)).first().click({ timeout });
        else if (st.startsWith('~')) await p.getByText(st.slice(1)).first().click({ timeout });
        else if (st.startsWith('scroll:')) { await p.mouse.move(195, 500); await p.mouse.wheel(0, +st.slice(7)); }
        else if (st.startsWith('type:')) { const [ph, v] = st.slice(5).split('='); await p.getByPlaceholder(ph).first().pressSequentially(v, { delay: 60, timeout }); }
        else if (st.startsWith('cb:')) await p.getByRole('checkbox', { name: st.slice(3), exact: true }).last().click({ timeout });
        else if (st.startsWith('xy:')) { const [x, y] = st.slice(3).split(',').map(Number); await p.mouse.click(x, y); }
        else await p.getByText(st, { exact: true }).first().click({ timeout });
      } catch (e) { if (!opt) console.log('KAÇTI', s.name, st); }
      await p.waitForTimeout(1100);
    }
    for (const lb of s.dismiss || []) {
      await p.waitForTimeout(900);
      try { await p.getByText(lb, { exact: true }).first().click({ timeout: 1200 }); } catch { try { await p.getByLabel(lb, { exact: true }).first().click({ timeout: 1200 }); } catch { /* yoksa geç */ } }
    }
    for (const sel of s.hide || []) await p.evaluate((q) => document.querySelectorAll(q).forEach((e) => { e.style.display = 'none'; }), sel);
    // telefon sürümü: yüzen alt menünün üst kenarı bir başlığı ortadan kesmesin diye çekimden önce biraz kaydır (moyo.json "mScroll")
    if (CEK_EK && s.mScroll) { await p.mouse.move(195, 400); await p.mouse.wheel(0, s.mScroll); await p.waitForTimeout(900); }
    await p.waitForTimeout(800);
    if (CEK_EK && process.env.CEK_DEBUG) {
      // alt menünün (alttan 22–82 nokta) üst ve alt kenarını kesen yazılar
      const kes = await p.evaluate((H) => {
        const out = []; const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        for (let n = w.nextNode(); n; n = w.nextNode()) {
          const t = n.textContent.trim(); if (!t) continue;
          const r = document.createRange(); r.selectNodeContents(n); const b = r.getBoundingClientRect();
          for (const y of [H - 82, H - 22, H]) if (b.top < y && b.bottom > y && b.width > 0) out.push(`${Math.round(b.top)}–${Math.round(b.bottom)} @${y} ${t.slice(0, 40)}`);
        }
        return out;
      }, CEK_H);
      console.log('KESİLEN', s.name, kes.join(' | ') || 'yok');
    }
    const text = (await p.evaluate(() => document.body.innerText)).replace(/\n{2,}/g, '\n');
    if (process.env.CEK_DEBUG) console.log(`--- ${s.name}\n${text.slice(0, +process.env.CEK_DEBUG > 1 ? +process.env.CEK_DEBUG : 900)}\n---`);
    if (/macera/i.test(text)) console.log('UYARI', s.name, 'ekranda "macera" geçiyor:', (text.match(/.{0,40}macera.{0,30}/i) || [''])[0].replace(/\n/g, ' '));
    if (!s.skip) {
      const png = path.join(TMP, s.name + CEK_EK + '.png');
      await p.screenshot({ path: png });
      console.log(execFileSync('python3', [path.join(__dirname, 'kucult.py'), png, path.join(IMG, s.name + CEK_EK + '.webp'), CEK_GEN], { encoding: 'utf8' }).trim());
    }
    await ctx.close();
  }
  await b.close();
})().catch((e) => { console.error(e); process.exit(1); });
