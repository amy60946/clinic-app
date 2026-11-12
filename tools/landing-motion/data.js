// Sayfanın içinde çalışır (page.evaluate). ../store-shots/editdb.js'in uydurma verisinin üstüne, yalnız çekim için:
// bir kez gösterilen ipuçları kapalı, pano üç bölümü de gösterir (Defne ve Ege'ye etkin eğitim), bildirimler okunmuş.
// Hepsi tarayıcının deposunda (pofi-onizleme-v4); kaynak koda ve gerçek veriye dokunmaz.
const KEY = 'pofi-onizleme-v4';

function flags(ID) {
  const set = (k, v) => localStorage.setItem(k, v);
  set(`clinic.onboarding.v1.${ID}`, '1');
  set(`clinic.start.hidden.v1.${ID}`, '1');
  set(`clinic.sample.hidden.v1.${ID}`, '1');
  set(`clinic.sample.seen.v1.${ID}`, new Date().toISOString());
  set('clinicapp.cookie-notice.v1', '1');
  ['training', 'behaviors', 'summary', 'routine', 'goals', 'sessions', 'notes', 'report', 'details', 'suggestions', 'board']
    .forEach((s) => set(`clinic.hint.v1.${ID}.${s}`, '1'));
  ['tasks', 'todos'].forEach((k) => set(`clinic.explain.v1.${k}`, '1'));
  localStorage.removeItem('demo.client_config');          // care_plan kapalı kalır (Takip Planı görünmez)
  localStorage.removeItem(`clinic.attention.seen.v1.${ID}`);
  localStorage.removeItem('clinic.menu.v1');
}

function extra(opt) {
  const KEY = 'pofi-onizleme-v4';
  const db = JSON.parse(localStorage.getItem(KEY));
  const ago = (min) => new Date(Date.now() - min * 60e3).toISOString();
  const at = (n, h, m) => { const d = new Date(); d.setDate(d.getDate() - n); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const K = 'demo-clinic', D = 'demo-clinician', M2 = 'demo-clinician-2';

  // Takip Planı kapalı (lansman düzeni): davranış hedefi ve GAS kaydı yok; raporda ve ilerleme notunda GAS bölümü çıkmaz
  db.clinic_goals = [];
  db.goal_ratings = [];
  (db.clinic_task_suggestions || []).forEach((x) => { x.goal_id = null; });

  // Pano dolu görünsün: iki aile daha (yalnız ad; editdb.js'teki düzenle aynı)
  if (opt && opt.more && !db.children.some((c) => c.id === 'c-duru')) {
    const fam = (fid, parents, child, link) => {
      db.families.push({ id: fid, name: 'Ailem', created_at: ago(link.days * 1440 + 600) });
      parents.forEach((p, i) => db.profiles.push({ id: `${fid}-p${i}`, family_id: fid, nickname: p.nick, name: p.name, avatar: p.avatar, created_at: ago(link.days * 1440 + 600 - i) }));
      db.children.push({ id: child.id, family_id: fid, name: child.name, avatar: child.avatar, gender: child.gender, birthday: child.birthday, age_band: child.band, user_id: null, coins_spent: 0, created_at: ago(link.days * 1440 + 500) });
      db.clinic_links.push({ id: link.id, clinic_id: K, clinician_id: link.by, family_id: fid, child_id: child.id, label: link.label, status: 'active',
        consent_by: `${fid}-p0`, consent_at: ago(link.days * 1440), revoked_at: null, created_at: ago(link.days * 1440) });
    };
    fam('lm-fam-duru', [{ nick: 'Anne', name: 'Esra', avatar: 'kadın' }],
      { id: 'c-duru', name: 'Duru', avatar: 'tavşan', gender: 'kız', birthday: '2018-04-14', band: 'A' },
      { id: 'lm-link-duru', label: 'Sofra düzeni', days: 33, by: D });
    fam('lm-fam-poyraz', [{ nick: 'Baba', name: 'Emre', avatar: 'erkek' }, { nick: 'Anne', name: 'Gizem', avatar: 'kadın' }],
      { id: 'c-poyraz', name: 'Poyraz', avatar: 'aslan', gender: 'erkek', birthday: '2016-09-02', band: 'B' },
      { id: 'lm-link-poyraz', label: 'Ekran süresi', days: 48, by: M2 });
    const abc = (id, fid, cid, n, h, m, part, a, b, c, intensity) => db.abc_events.push({ id, family_id: fid, child_id: cid, occurred_at: at(n, h, m), day_part: part,
      antecedent: a, behavior: b, consequence: c, intensity, created_by: `${fid}-p0`, created_at: at(n, h, m + 20) });
    abc('lm-a1', 'lm-fam-duru', 'c-duru', 5, 19, 10, 'evening', 'Yemek zamanı geldi', 'Sofraya gelmeyi erteledi', 'Zamanlayıcı kuruldu, 5 dakika sonra geldi', 2);
    abc('lm-a2', 'lm-fam-duru', 'c-duru', 2, 19, 0, 'evening', 'Yemek zamanı geldi', 'Oyunu bırakmak istemedi, söylendi', 'İki seçenek sunuldu, sofraya geldi', 1);
    abc('lm-a3', 'lm-fam-poyraz', 'c-poyraz', 12, 20, 30, 'evening', 'Ekran süresi bitti', 'Kısa bir itirazdan sonra kapattı', 'Kapattığı için teşekkür edildi', 1);
  }

  const training = (id, link, parent, by, title, days, mods) => {
    if (db.parent_trainings.some((t) => t.id === id) || !db.clinic_links.some((l) => l.id === link)) return;
    db.parent_trainings.push({ id, clinic_id: K, link_id: link, parent_name: parent, created_by: by, title, status: 'active', criterion: null,
      created_at: ago(days * 1440), started_at: ago(days * 1440 - 60), updated_at: ago(2 * 1440), seen_at: ago(60) });
    mods.forEach(([key, doneDays], i) => db.parent_training_modules.push({ id: `${id}-m${i}`, training_id: id, item_key: key, position: i, archived: false,
      completed_at: doneDays === null ? null : ago(doneDays * 1440), correct: null, total: null, answers: null, created_at: ago(days * 1440),
      reviewed_at: doneDays === null ? null : ago(doneDays * 1440 - 300) }));
  };
  training('lm-tr-defne', 'shot-link-defne', 'Selin', M2, 'Ebeveyn yatma rutinini her akşam aynı sırayla uygular', 10,
    [['yatma_pekistirme_r', 8], ['gunluk_cizelge_r', null]]);
  training('lm-tr-ege', 'shot-link-ege', 'Zeynep', D, 'Ebeveyn ödev öncesinde iki geçiş uyarısı verir', 20,
    [['gecis_uyari_r', 16], ['gecis_uyari_q', null]]);
  training('lm-tr-duru', 'lm-link-duru', 'Esra', D, 'Ebeveyn sofraya geçişte iki seçenek sunar', 25,
    [['pekistirme_r', 20], ['sozel_ovgu_r', 12]]);
  training('lm-tr-poyraz', 'lm-link-poyraz', 'Emre', M2, 'Ebeveyn ekran süresini görünür zamanlayıcıyla bitirir', 40,
    [['gecis_uyari_r', 30], ['ivme_r', null]]);
  localStorage.setItem(KEY, JSON.stringify(db));
  return { trainings: db.parent_trainings.length, clients: db.clinic_links.length };
}

// Açılışta türetilen bildirimler: en yeni davranış kaydı dışında hepsi okunmuş (zil sakin görünür)
function readNotifications() {
  const KEY = 'pofi-onizleme-v4';
  const db = JSON.parse(localStorage.getItem(KEY));
  const latest = db.abc_events.filter((e) => e.child_id === 'c-nazli').sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  db.notifications.forEach((n) => { if (n.app === 'clinic' && !n.read_at && !(latest && n.data && n.data.abc_id === latest.id)) n.read_at = n.created_at; });
  localStorage.setItem(KEY, JSON.stringify(db));
}

module.exports = { KEY, flags, extra, readNotifications };
