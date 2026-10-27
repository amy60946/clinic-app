// Uzman raporu: "Ev rutin kartı raporu (4–8 hafta)" + yürütücü işlev gözlem özeti + GAS + zor an özeti.
// Araştırma belgesi bölüm 6 "Uzman için çıktılar". Tanı koymaz, gözlem toplar; sınırlar her raporda yazılı.
import {
  Task, Completion, AbcEvent, weekly, perTask, observations, bySkill, abcSummary, windowStarts, weekStarts, addDays, parseDate, lastFullDay,
  motivationStats, motivationText,
  DECLINE_LABELS, LIMITS_TEXT, MASTERY_RATE, MASTERY_WEEKS,
} from './metrics';
import type { Goal } from './clinic';
import { skillName } from '../skills';

export type ReportInput = {
  clinic: string;
  clinician: string;
  childLabel: string; // ad ya da takma ad (uzman seçer)
  age: string;
  tasks: Task[];
  completions: Completion[];
  abc: AbcEvent[];
  goals: Goal[];
  today: string;
  weeks: number;
};

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const p = (v: number | null) => (v === null ? '–' : `%${v}`);
const d = (iso: string) => parseDate(iso).toLocaleDateString('tr-TR');

function bar(rate: number | null): string {
  return `<span class="bar"><span style="width:${rate ?? 0}%"></span></span>`;
}

export function buildReportHtml(r: ReportInput): string {
  const starts = windowStarts(r.today, r.weeks);
  const from = starts[0];
  const o = observations(r.tasks, r.completions, from, lastFullDay(r.today));
  const w = weekly(r.tasks, r.completions, r.today, r.weeks);
  const tasks = perTask(r.tasks, r.completions, r.today, r.weeks);
  const skills = bySkill(r.tasks, r.completions, from, lastFullDay(r.today));
  const abc = abcSummary(r.abc, r.today, r.weeks);
  const goals = r.goals.filter((g) => !g.archived);
  const motivation = motivationStats(r.completions, from, lastFullDay(r.today));
  const reasons = (Object.keys(o.declineReasons) as (keyof typeof o.declineReasons)[])
    .filter((k) => o.declineReasons[k] > 0)
    .map((k) => `${DECLINE_LABELS[k]}: ${o.declineReasons[k]}`).join(' · ') || 'yok';

  const weekRows = w.map((x) => `<tr><td>${d(x.start)} – ${d(addDays(x.start, 6))}</td><td class="n">${x.approved}/${x.planned}</td>
    <td>${bar(x.rate)} ${p(x.rate)}</td><td class="n">${x.fullDays}/${x.plannedDays}</td><td class="n">${x.declined}</td><td class="n">${x.rejected}</td></tr>`).join('');
  const taskRows = tasks.map((s) => `<tr><td>${esc(s.task.emoji)} ${esc(s.task.title)}${s.mastered ? ' <b class="ok">ustalık</b>' : ''}</td>
    <td>${esc(skillName(s.task.skill) || '–')}</td><td class="n">${s.approved}/${s.planned}</td><td>${bar(s.rate)} ${p(s.rate)}</td>
    <td class="n">${s.weeklyRates.map((x) => (x === null ? '–' : x)).join(' · ')}</td></tr>`).join('');
  const skillRows = skills.map((s) => `<tr><td>${esc(s.skill)}</td><td class="n">${s.approved}/${s.planned}</td><td>${bar(s.rate)} ${p(s.rate)}</td></tr>`).join('');
  // GAS bu haftayı da içerir (uzman içinde bulunulan haftayı puanlayabilir)
  const gasWeeks = weekStarts(r.today, r.weeks);
  const goalRows = goals.map((g) => {
    const m = Object.fromEntries(g.ratings.map((x) => [x.week, x.rating]));
    return `<tr><td>${esc(g.title)}${g.description ? `<div class="m">${esc(g.description)}</div>` : ''}</td>${gasWeeks
      .map((s) => `<td class="n">${m[s] === undefined ? '·' : m[s] > 0 ? `+${m[s]}` : m[s]}</td>`).join('')}</tr>`;
  }).join('');
  const abcRows = abc.perWeek.map((x) => `<td class="n">${x.count || '·'}${x.avgIntensity ? `<div class="m">ş ${x.avgIntensity}</div>` : ''}</td>`).join('');

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>Ev rutini gözlem raporu – ${esc(r.childLabel)}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#0F1B3D;margin:32px;font-size:12px;line-height:1.45}
  h1{font-size:20px;margin:0 0 4px} h2{font-size:14px;margin:22px 0 8px;border-bottom:1px solid #E8EAEF;padding-bottom:4px}
  .meta{color:#8A91A3;margin-bottom:12px} .m{color:#8A91A3;font-size:10px}
  table{border-collapse:collapse;width:100%} th,td{text-align:left;padding:5px 6px;border-bottom:1px solid #E8EAEF;vertical-align:top}
  th{font-size:10px;text-transform:uppercase;letter-spacing:.4px;color:#8A91A3;font-weight:600} td.n{text-align:center;white-space:nowrap}
  .bar{display:inline-block;width:70px;height:6px;background:#E8EAEF;border-radius:3px;vertical-align:middle;margin-right:4px;overflow:hidden}
  .bar span{display:block;height:6px;background:#0F1B3D}
  .stats{display:flex;gap:10px;flex-wrap:wrap} .stat{flex:1;min-width:120px;border:1px solid #E8EAEF;border-radius:10px;padding:8px 10px}
  .stat b{font-size:18px;display:block} .ok{color:#2F7D4A;font-size:10px}
  .limits{margin-top:22px;padding:10px 12px;background:#F5F6F8;border-radius:8px;color:#5a6274;font-size:11px}
  @media print{body{margin:16mm} h2{break-after:avoid} tr{break-inside:avoid}}
</style></head><body>
<h1>Ev rutini gözlem raporu</h1>
<div class="meta">${esc(r.childLabel)}${r.age ? ` · ${esc(r.age)}` : ''} · ${d(from)} – ${d(lastFullDay(r.today))} (${r.weeks} hafta) · ${esc(r.clinic)} · ${esc(r.clinician)} · hazırlandı ${d(r.today)}</div>

<h2>Özet</h2>
<div class="stats">
  <div class="stat"><b>${p(o.rate)}</b>Tamamlama<div class="m">${o.approved}/${o.planned} planlanan görev onaylandı</div></div>
  <div class="stat"><b>${p(o.fullDayRate)}</b>Tam gün<div class="m">${o.fullDays}/${o.plannedDays} gün</div></div>
  <div class="stat"><b>${p(o.beforeReminderRate)}</b>Hatırlatmadan önce başlama<div class="m">${o.beforeReminder}/${o.withReminder} hatırlatmalı görev</div></div>
  <div class="stat"><b>${p(o.declineRate)}</b>"Yapamam"<div class="m">${o.declined} kez · ${esc(reasons)}</div></div>
</div>

<h2>Haftalık rutin kartı</h2>
<table><tr><th>Hafta</th><th>Onay/plan</th><th>Oran</th><th>Tam gün</th><th>Yapamam</th><th>Ret</th></tr>${weekRows}</table>

<h2>Yürütücü işlev gözlem özeti</h2>
<table>
<tr><td>Başlatma (kendiliğinden başlama)</td><td>${p(o.beforeReminderRate)} — hatırlatma saati olan görevlerde "Yaptım" anı hatırlatmadan önce</td></tr>
<tr><td>Tutarlılık</td><td>${p(o.fullDayRate)} — planlanan her görevin yapıldığı gün oranı</td></tr>
<tr><td>Görevden kaçınma / uygunluk</td><td>"Yapamam" ${p(o.declineRate)} (${esc(reasons)}); ebeveyn reddi ${p(o.rejectRate)}</td></tr>
<tr><td>Ebeveyn döngüsü</td><td>"Yaptım" → ebeveyn kararı ortanca ${o.reviewDelayHours === null ? '–' : `${o.reviewDelayHours} saat`}</td></tr>
${motivation.answered ? `<tr><td>Motive etmek (ebeveyn gözlemi)</td><td>${esc(motivationText(motivation))} — ${motivation.answered} incelemede ebeveynin yanıtı; puan değildir</td></tr>` : ''}
</table>

<h2>Görev başına</h2>
<table><tr><th>Görev</th><th>Beceri</th><th>Onay/plan</th><th>Oran</th><th>Haftalık %</th></tr>${taskRows || '<tr><td colspan="5">Planlanmış görev yok</td></tr>'}</table>
<div class="m">Ustalık: tamamlanmış son ${MASTERY_WEEKS} haftanın her birinde ≥ %${MASTERY_RATE}.</div>

<h2>Beceri alanına göre</h2>
<table><tr><th>Alan</th><th>Onay/plan</th><th>Oran</th></tr>${skillRows || '<tr><td colspan="3">–</td></tr>'}</table>

<h2>Hedefe ulaşma ölçeği (GAS, −2 … +2)</h2>
${goals.length ? `<table><tr><th>Hedef</th>${gasWeeks.map((s) => `<th class="n">${d(s).slice(0, 5)}</th>`).join('')}</tr>${goalRows}</table>` : '<div class="m">Etkin hedef yok.</div>'}

<h2>Zor anlar (ebeveyn ABC kaydı)</h2>
<table><tr><th>Hafta</th>${abc.perWeek.map((x) => `<th class="n">${d(x.start).slice(0, 5)}</th>`).join('')}</tr><tr><td>Kayıt (ş = ort. şiddet 1–5)</td>${abcRows}</tr></table>
<div class="m">Günün bölümü: sabah ${abc.byDayPart.sabah} · öğle ${abc.byDayPart['öğle']} · akşam ${abc.byDayPart['akşam']} · gece ${abc.byDayPart.gece}</div>

<div class="limits"><b>Sınırlar.</b> ${esc(LIMITS_TEXT)}</div>
</body></html>`;
}
