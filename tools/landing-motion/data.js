// Sayfanın içinde çalışır (page.evaluate). ../store-shots/editdb.js'in uydurma verisinin üstüne, yalnız çekim için:
// bir kez gösterilen ipuçları kapalı, pano dolu (iki aile daha), takvimde dolu bir hafta ve seans ücreti, bildirimler okunmuş.
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

  // Ebeveyn eğitimi kapalı (kullanıcı kararı 23 Kasım 2026, bayrak parent_training): çekim verisine eğitim eklenmez.
  // Seanslar (24 Kasım 2026, eğitimsiz tanıtım): takvimde dolu bir hafta ve seans ücreti (akislar 27.1). Uydurma veri.
  const at2 = (dayOff, hhmm) => { const d = new Date(); d.setDate(d.getDate() + dayOff); const [h, m] = hhmm.split(':').map(Number); d.setHours(h, m, 0, 0); return d.toISOString(); };
  const dow = new Date().getDay() || 7;   // 1 = pazartesi
  const wk = (wd) => wd - dow;            // bu haftanın günü
  const ses = (id, link, day, hhmm, o = {}) => {
    const wd = day;
    if (!db.clinic_links.some((l) => l.id === link) || (db.clinic_sessions || []).some((x) => x.id === id)) return;
    db.clinic_sessions.push({ id, clinic_id: K, clinician_id: o.by || D, link_id: link, title: null, series_id: null, starts_at: at2(wd, hhmm), duration_min: o.min || 45, kind: o.kind || 'individual',
      mode: o.mode || 'in_person', room_id: o.room || 'room-1', status: 'planned', status_at: null, status_by: null, cancel_reason: null, visible_to_family: true, booked_by: 'clinic',
      family_response: o.ok ? 'ok' : null, family_note: null, family_responded_at: o.ok ? ago(600) : null, package_id: null, waitlist_id: null, offer_expires_at: null,
      external_uid: null, fee: o.fee ?? 1200, created_by: D, created_at: ago(9000), updated_at: ago(9000) });
  };
  if (db.clinic_sessions) {
    db.clinic_sessions.forEach((x) => { if (x.link_id === 'demo-link' && x.fee == null) x.fee = 1200; });
    ses('lm-ses-ege', 'shot-link-ege', wk(1), '14:00', { room: 'room-2', ok: true });
    ses('lm-ses-defne', 'shot-link-defne', wk(2), '11:00', { by: M2, min: 50, room: 'room-2' });
    ses('lm-ses-duru', 'lm-link-duru', wk(2), '16:30', { kind: 'parent', mode: 'online', room: null, fee: 1500 });
    ses('lm-ses-kerem', 'shot-link-kerem', wk(4), '10:30', { min: 60, kind: 'intake', fee: 1500, ok: true });
    ses('lm-ses-poyraz', 'lm-link-poyraz', wk(5), '13:00', { by: M2, room: 'room-2' });
  }
  localStorage.setItem(KEY, JSON.stringify(db));
  return { sessions: (db.clinic_sessions || []).length, clients: db.clinic_links.length };
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
