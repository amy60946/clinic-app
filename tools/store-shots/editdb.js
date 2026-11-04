// Runs inside the page (page.evaluate). Edits the preview demo DB (localStorage 'pofi-onizleme-v4') for App Store shots.
// Deterministic: same output for the same "today".
module.exports = function editDb() {
  const KEY = 'pofi-onizleme-v4';
  const db = JSON.parse(localStorage.getItem(KEY));
  const pad = (n) => String(n).padStart(2, '0');
  const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const day = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return iso(d); };
  const ago = (min) => new Date(Date.now() - min * 60e3).toISOString();
  const at = (d, hhmm, jitterMin) => {
    const [h, m] = hhmm.split(':').map(Number);
    const x = new Date(); x.setDate(x.getDate() + d); x.setHours(h, m + jitterMin, 0, 0);
    return x.toISOString();
  };
  const dow = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.getDay(); }; // 0 = Sunday
  let seq = 0;
  const id = (p) => `${p}-${(++seq).toString(36)}-shot`;
  const K = 'demo-clinic', D = 'demo-clinician', M2 = 'demo-clinician-2', F = 'demo-family', L = 'demo-link';

  /* 1. Obviously fictional names; paid plan (no trial banner) */
  const clinic = db.clinics.find((c) => c.id === K);
  Object.assign(clinic, { name: 'Örnek Danışmanlık Merkezi', plan: 'clinic', seat_limit: 10, billing_period: 'monthly',
    billing_source: 'apple', auto_renew: true, period_end: new Date(Date.now() + 24 * 864e5).toISOString() });
  Object.assign(db.clinicians.find((m) => m.id === D), { name: 'Elif Örnek', title: 'Uzm. Klinik Psikolog' });
  Object.assign(db.clinicians.find((m) => m.id === M2), { name: 'Mert Örnek', title: 'Ergoterapist' });
  db.clinicians.filter((m) => m.id === 'demo-expired').forEach((m) => { m.name = 'Can Örnek'; });
  db.clinics.filter((c) => c.id === 'demo-clinic-expired').forEach((c) => { c.name = 'Örnek Klinik'; });

  /* 2. Three more client families (first names only) */
  const fam = (fid, parents, child, link) => {
    db.families.push({ id: fid, name: 'Ailem', created_at: ago(link.days * 1440 + 600) });
    parents.forEach((p, i) => db.profiles.push({ id: `${fid}-p${i}`, family_id: fid, nickname: p.nick, name: p.name, avatar: p.avatar, created_at: ago(link.days * 1440 + 600 - i) }));
    db.children.push({ id: child.id, family_id: fid, name: child.name, avatar: child.avatar, gender: child.gender, birthday: child.birthday, age_band: child.band, user_id: null, coins_spent: 0, created_at: ago(link.days * 1440 + 500) });
    db.clinic_links.push({ id: link.id, clinic_id: K, clinician_id: link.by, family_id: fid, child_id: child.id, label: link.label, status: 'active',
      consent_by: `${fid}-p0`, consent_at: ago(link.days * 1440), revoked_at: null, created_at: ago(link.days * 1440) });
  };
  fam('shot-fam-ege', [{ nick: 'Anne', name: 'Zeynep', avatar: 'kadın' }],
    { id: 'c-ege', name: 'Ege', avatar: 'aslan', gender: 'erkek', birthday: '2017-06-20', band: 'B' },
    { id: 'shot-link-ege', label: 'Ödev düzeni', days: 26, by: D });
  fam('shot-fam-defne', [{ nick: 'Anne', name: 'Selin', avatar: 'kadın' }, { nick: 'Baba', name: 'Murat', avatar: 'erkek' }],
    { id: 'c-defne', name: 'Defne', avatar: 'tavşan', gender: 'kız', birthday: '2019-02-11', band: 'A' },
    { id: 'shot-link-defne', label: 'Uyku rutini', days: 14, by: M2 });
  fam('shot-fam-kerem', [{ nick: 'Baba', name: 'Burak', avatar: 'erkek' }],
    { id: 'c-kerem', name: 'Kerem', avatar: 'ayı', gender: 'erkek', birthday: '2021-03-08', band: 'K' },
    { id: 'shot-link-kerem', label: 'Geçişler', days: 6, by: D });
  // the links came from family invites (team invite stats look real)
  [['shot-link-ege', D, 27, 'Zeynep'], ['shot-link-defne', M2, 15, 'Selin'], ['shot-link-kerem', D, 7, 'Burak']].forEach(([lid, by, d, pn], i) => {
    db.clinic_invites.push({ code: `ORN${i}K${i}X`, clinic_id: K, clinician_id: by, kind: 'family', label: '', created_at: ago(d * 1440), expires_at: ago(d * 1440 - 4320),
      used_at: ago((d - 1) * 1440), used_by: `x-${lid}`, token: null, parent_name: pn, parent_email: null, channel: null, opened_at: ago(d * 1440 - 120),
      claimed_at: ago((d - 1) * 1440 + 60), claimed_family: null, expired_notified_at: null, revoked_at: null, child_name: null, child_age_group: null,
      email_status: 'sent', email_count: 1, email_sent_at: ago(d * 1440) });
  });

  /* 3. Nazlı: more tasks (weekly table 8 rows), a clinic routine linked to goal, a single task linked to the other goal */
  const task = (tid, title, emoji, skill, start, reminder, repeat, review, difficulty, coins) => {
    db.tasks.push({ id: tid, family_id: F, title, emoji, skill, description: '', start_date: day(start), recurring: true, end_date: null, reminder,
      requires_review: review, created_at: ago(-start * 1440), repeat_kind: repeat === 'weekdays' ? 'weekly' : 'daily',
      repeat_days: repeat === 'weekdays' ? [1, 2, 3, 4, 5] : [], sort_order: db.tasks.length });
    db.task_assignments.push({ task_id: tid, child_id: 'c-nazli', family_id: F, difficulty, coins });
  };
  task('k-giyin', 'Okul için giyin', '👕', 'focus', -22, '07:20', 'weekdays', true, 'easy', 5);
  task('k-kahvalti', 'Kahvaltını yap', '🥣', 'strength', -22, '07:30', 'weekdays', true, 'medium', 10);
  task('k-canta', 'Çantanı hazırla', '🎒', 'focus', -22, '07:45', 'weekdays', true, 'easy', 5);
  task('k-ekran', 'Ekranı kapat', '📵', 'focus', -19, '20:00', 'daily', true, 'hard', 20);
  task('k-oyuncak', 'Oyuncaklarını topla', '🧸', 'teamwork', -60, '19:30', 'daily', true, 'easy', 5);

  const comp = (tid, n, status, hhmm, jitter, reason = null, motivation = null) => db.completions.push({
    id: id('c'), family_id: F, task_id: tid, child_id: 'c-nazli', date: day(-n), status, created_at: at(-n, hhmm, jitter),
    child_done_at: at(-n, hhmm, jitter), decline_reason: reason,
    reviewed_at: (status === 'approved' && n > 0) ? at(-n, hhmm, jitter + 70 + ((n * 41 + hhmm.length * 7) % 115)) : null,
    motivation,
  });
  const routineTasks = [['k-giyin', '07:20'], ['k-kahvalti', '07:30'], ['k-canta', '07:45']];
  routineTasks.forEach(([tid, hhmm], k) => {
    for (let n = 21; n >= 1; n--) {
      const wd = dow(-n); if (wd === 0 || wd === 6) continue;
      const r = (n * 53 + k * 29) % 100;
      const p = n > 14 ? 62 : n > 7 ? 74 : 88;
      if (r < p) comp(tid, n, 'approved', hhmm, (r % 35) - 22, null, n > 10 ? 3 + (r % 2) : 1 + (r % 2));
      else if (r < p + 10) comp(tid, n, 'declined', hhmm, 0, k === 1 ? 'no_time' : 'hard');
    }
  });
  // today (Monday morning): two morning tasks done, one waiting for the parent
  comp('k-giyin', 0, 'approved', '07:20', -6, null, 1);
  comp('k-kahvalti', 0, 'pending', '07:30', 4);
  for (let n = 18; n >= 1; n--) {
    const r = (n * 61 + 13) % 100;
    const p = n > 10 ? 55 : 78;
    if (r < p) comp('k-ekran', n, 'approved', '20:00', (r % 30) - 10, null, n > 9 ? 4 + (r % 2) : 2 + (r % 2));
    else if (r < p + 15) comp('k-ekran', n, 'declined', '20:00', 0, 'did_not_want');
  }
  for (let n = 59; n >= 1; n--) {
    const r = (n * 47 + 7) % 100, w = n % 7;
    if (n > 35 ? [0, 2, 5].includes(w) : n > 14 ? ![1, 4].includes(w) : w !== 3) comp('k-oyuncak', n, 'approved', '19:30', (r % 40) - 15, null, 1 + (r % 3));
  }

  // one evening the parent did not approve "Oyuncaklarını topla" (shows the "Ebeveynin onaylamadığı" line in the note)
  comp('k-oyuncak', 15, 'rejected', '19:30', 5);

  const sugBase = { link_id: L, clinic_id: K, family_id: F, child_id: 'c-nazli', recurring: true, status: 'accepted', created_by: D, end_date: null,
    requires_review: true, updated_at: null, kind: 'new', target_task_id: null, change_remove: false, description: '' };
  const grp = 'shot-routine-sabah';
  [['k-giyin', 'Okul için giyin', '👕', 'focus', 'gs_focus_044', '07:20', 'focus', 0],
    ['k-kahvalti', 'Kahvaltını yap', '🥣', 'strength', 'gs_health_031', '07:30', 'health', 1],
    ['k-canta', 'Çantanı hazırla', '🎒', 'focus', 'gs_focus_043', '07:45', 'focus', 2]].forEach(([tid, title, emoji, skill, tk, rem, cat, pos]) => {
    db.clinic_task_suggestions.push({ ...sugBase, id: id('s'), title, emoji, skill, difficulty: tid === 'k-kahvalti' ? 'medium' : 'easy', coins: tid === 'k-kahvalti' ? 10 : 5,
      note: 'Güne hazır sabah rutini', category: cat, template_key: tk, start_date: day(-22), repeat_kind: 'weekly', repeat_days: [1, 2, 3, 4, 5], reminder: rem,
      created_at: ago(23 * 1440), decided_at: ago(22 * 1440), task_id: tid, routine_group: grp, routine_title: 'Güne hazır sabah', routine_icon: 'sunny-outline',
      routine_position: pos, routine_key: 'morning', goal_id: 'g-sabah' });
  });
  db.clinic_task_suggestions.push({ ...sugBase, id: id('s'), title: 'Ekranı kapat', emoji: '📵', skill: 'focus', difficulty: 'hard', coins: 20,
    note: 'Ekran kapatma geçişi için.', category: 'focus', template_key: 'gs_focus_058', start_date: day(-19), repeat_kind: 'daily', repeat_days: [], reminder: '20:00',
    created_at: ago(20 * 1440), decided_at: ago(19 * 1440), task_id: 'k-ekran', routine_group: null, routine_title: null, routine_icon: null, routine_position: null,
    routine_key: null, goal_id: 'g-gecis' });
  // the pending "Kıyafetini akşamdan hazırla" suggestion belongs to the morning goal
  db.clinic_task_suggestions.filter((s) => s.title === 'Kıyafetini akşamdan hazırla').forEach((s) => { s.goal_id = 'g-sabah'; s.skill = 'focus'; s.category = 'focus'; s.created_at = ago(24 * 1440); });

  /* 3b. Transition program active (with parent logs) and already sent to the family */
  const mg = db.care_modules.find((m) => m.id === 'm-gecis');
  if (mg) {
    mg.status = 'active';
    [1, 2, 4, 5, 7, 8, 9].forEach((d, i) => db.care_module_logs.push({ id: id('l'), module_id: 'm-gecis', family_id: F, day: day(-d), practiced: i !== 3,
      difficulty: i < 3 ? 2 : 3, barrier: i === 3 ? 'forgot' : null, note: '', created_by: 'demo-user', created_at: ago(d * 1440) }));
    mg.pub = { title: mg.title, aim: mg.aim ?? '', practice: mg.practice ?? '', checklist: mg.checklist ?? [], status: mg.status, position: mg.position ?? 0, goal_ids: ['g-gecis'] };
  }

  /* 4. Gentler behaviour records (no violence). None in the week that only the progress note window covers (see report). */
  db.abc_events = db.abc_events.filter((e) => e.child_id !== 'c-nazli');
  db.notifications = db.notifications.filter((n) => n.kind !== 'abc_event');
  const PART_TIME = { morning: '07:40', noon: '13:30', evening: '19:30', night: '21:15' };
  const abc = (n, part, a, b, c, intensity) => db.abc_events.push({ id: id('a'), family_id: F, child_id: 'c-nazli', occurred_at: at(-n, PART_TIME[part], 0), day_part: part,
    antecedent: a, behavior: b, consequence: c, intensity, created_by: 'demo-user', created_at: at(-n, PART_TIME[part], 20) });
  // 8 weeks: 3 · 3 · 3 · 0 · 3 · 2 · 1 · 0 records per week, intensity going down
  abc(48, 'evening', 'Tablet süresi bitti', 'Ağladı, tableti bırakmak istemedi', 'Süre sakin bir sesle hatırlatıldı; 10 dakika sonra bıraktı', 3);
  abc(46, 'noon', 'Ödev zamanı geldi', 'Ödevini yarıda bırakıp odasına gitti', 'Kısa mola verildi, sonra birlikte devam edildi', 3);
  abc(44, 'night', 'Yatma saati geldi', 'Yatağa gitmek istemedi, ağladı', 'Birlikte kitap okundu, sakinleşti', 2);
  abc(41, 'morning', 'Sabah giyinme zamanı', 'Kıyafet seçemedi, söylendi', 'İki seçenek sunuldu, birini seçti', 2);
  abc(39, 'evening', 'Tablet süresi bitti', 'İtiraz etti, 5 dakika daha istedi', 'Zamanlayıcı kuruldu; süre bitince kapattı', 3);
  abc(37, 'noon', 'Ödev zamanı geldi', 'Masaya oturmayı erteledi', 'Ödev küçük parçalara bölündü', 2);
  abc(34, 'night', 'Yatma saati geldi', 'Odasına gitmeden önce uzun süre oyalandı', 'Uyku öncesi adımlar resimli çizelgeden birlikte izlendi', 2);
  abc(32, 'evening', 'Parktan eve dönme vakti', 'Eve dönmek istemedi, söylendi', '5 dakika önceden haber verildi; sonra birlikte yürüyerek dönüldü', 2);
  abc(29, 'evening', 'Tablet süresi bitti', 'Söylenerek kapattı', 'Kapattığı için teşekkür edildi', 2);
  abc(21, 'noon', 'Ödev zamanı geldi', 'Bir sayfadan sonra bırakmak istedi', 'Kısa moladan sonra tamamladı', 2);
  abc(18, 'night', 'Yatma saati geldi', 'Biraz ağladı, sarılınca sakinleşti', 'Uyku öncesi rutine geçildi', 2);
  abc(16, 'evening', 'Tablet süresi bitti', 'Söylendi ama kendisi kapattı', 'Davranışı adıyla övüldü', 1);
  abc(13, 'morning', 'Kahvaltı zamanı', 'Masaya gelmeyi erteledi', 'Resimli sabah çizelgesi gösterildi; masaya geldi', 1);
  abc(10, 'evening', 'Tablet süresi bitti', 'Kısa bir itirazdan sonra kapattı', 'Birlikte oyun oynandı', 1);
  abc(4, 'night', 'Yatma saati geldi', 'Bir masal daha istedi, ağlamaklı oldu', 'Kısa bir masal okundu, uyudu', 1);

  /* 5. The other clients look in use on the board: Defne (plan sent, new behaviour records), Ege (evaluation due),
     Kerem (6 days old, no plan yet). A sent goal carries its snapshot (`pub`), so it is not "unsent". */
  const monday = (w) => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - 7 * w); return iso(d); };
  const goal = (gid, lid, title, domain, target, weeks, days, by) => {
    const g = { id: gid, link_id: lid, clinic_id: K, title, description: '', domain, measure: 'level', baseline: '', target, weeks, home_support: '',
      shared: true, status: 'active', position: 0, archived: false, created_by: by, created_at: ago(days * 1440) };
    g.pub = { title, description: '', domain, measure: 'level', baseline: '', target, weeks, home_support: '', status: 'active', position: 0 };
    db.clinic_goals.push(g);
    const l = db.clinic_links.find((x) => x.id === lid);
    if (l) l.plan_published_at = ago(days * 1440 - 60);
  };
  goal('g-defne', 'shot-link-defne', 'Yatma saatinde 20 dakikada uykuya geçer', 'sleep', "7 gecenin 5'i", 8, 12, M2);
  db.goal_ratings.push({ goal_id: 'g-defne', clinic_id: K, week: monday(1), rating: 0, note: '', rated_by: M2, created_at: ago(6 * 1440) });
  goal('g-ege', 'shot-link-ege', 'Ödeve hatırlatmadan başlar', 'school', "5 günün 4'ü", 8, 30, D);
  const abcOf = (fid, cid, n, part, a, b, c, intensity) => db.abc_events.push({ id: id('a'), family_id: fid, child_id: cid, occurred_at: at(-n, PART_TIME[part], 0),
    day_part: part, antecedent: a, behavior: b, consequence: c, intensity, created_by: `${fid}-p0`, created_at: at(-n, PART_TIME[part], 20) });
  abcOf('shot-fam-defne', 'c-defne', 3, 'night', 'Işıklar kapandı', 'Odadan çıkıp salona geldi', 'Sakin bir sesle yatağına geri götürüldü', 2);
  abcOf('shot-fam-defne', 'c-defne', 1, 'night', 'Yatma saati geldi', 'Bir bardak su daha istedi', 'Su yatmadan önce verildi, yatağa döndü', 1);
  abcOf('shot-fam-ege', 'c-ege', 9, 'noon', 'Ödev zamanı geldi', 'Masaya oturmayı erteledi', 'Zamanlayıcı kuruldu, 10 dakika sonra başladı', 2);

  localStorage.setItem(KEY, JSON.stringify(db));
  return { tasks: db.tasks.length, abc: db.abc_events.length };
};
