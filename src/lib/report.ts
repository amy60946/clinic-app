// Uzman raporu: "Ev rutin kartı raporu (4–8 hafta)" + yürütücü işlev gözlem özeti + GAS + davranış kaydı özeti.
// Araştırma belgesi bölüm 6 "Uzman için çıktılar". Tanı koymaz, gözlem toplar; sınırlar her raporda yazılı.
// Aynı hesap (reportData) iki çıktı verir: yazdırılan HTML (buildReportHtml) ve aileye gönderilen içerik biçimi v1
// (reportContent; ortak akislar.md 27.2, veritabani.md 40.2). Saf fonksiyonlar, testleri tests/reportContent.test.mjs.
import {
  weekly, perTask, observations, bySkill, abcSummary, windowStarts, weekStarts, addDays, parseDate, lastFullDay,
  motivationStats, motivationText,
  DECLINE_LABELS, EXPORT_FOOTER, MASTERY_RATE, MASTERY_WEEKS, dec,
} from './metrics.ts';
import type { Task, Completion, AbcEvent } from './metrics.ts';
import type { Goal } from './clinic';
import { skillName } from '../skills.ts';
import { progressNote } from './progressNote.ts';


export type ReportInput = {
  clinic: string;
  clinician: string;
  childLabel: string; // ebeveynin Moyo'da girdiği ad (kullanıcı kararı 23 Kasım 2026)
  age: string;
  tasks: Task[];
  completions: Completion[];
  abc: AbcEvent[];
  goals: Pick<Goal, 'title' | 'description' | 'archived' | 'ratings'>[];
  today: string;
  weeks: number;
};

export const REPORT_TITLE = 'Ev rutini gözlem raporu';

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const p = (v: number | null) => (v === null ? '–' : `%${v}`);
const d = (iso: string) => parseDate(iso).toLocaleDateString('tr-TR');
// Aileye giden içerikte tarih Intl'e bağlı değil: "26.10"
const dm = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;
const weekLabel = (start: string) => `${dm(start)} – ${dm(addDays(start, 6))}`;

function bar(rate: number | null): string {
  return `<span class="bar"><span style="width:${rate ?? 0}%"></span></span>`;
}

// Raporun bütün sayıları ve metinleri bir kez hesaplanır; HTML ve v1 içerik bundan yazılır
export function reportData(r: ReportInput) {
  const from = windowStarts(r.today, r.weeks)[0];
  const to = lastFullDay(r.today);
  const o = observations(r.tasks, r.completions, from, to);
  const motivation = motivationStats(r.completions, from, to);
  const reasons = (Object.keys(o.declineReasons) as (keyof typeof o.declineReasons)[])
    .filter((k) => o.declineReasons[k] > 0)
    .map((k) => `${DECLINE_LABELS[k]}: ${o.declineReasons[k]}`).join(' · ') || 'yok';
  // Özet kartları: etiket, büyük değer, küçük açıklama
  const summary: [string, string, string][] = [
    ['Tamamlama', p(o.rate), `${o.approved}/${o.planned} planlanan adım onaylandı`],
    ['Tam gün', p(o.fullDayRate), `${o.fullDays}/${o.plannedDays} gün`],
    ['Hatırlatmadan önce başlama', p(o.beforeReminderRate), `${o.beforeReminder}/${o.withReminder} hatırlatmalı adım`],
    ['"Yapamam"', p(o.declineRate), `${o.declined} kez · ${reasons}`],
  ];
  const executive: [string, string][] = [
    ['Başlatma (kendiliğinden başlama)', `${p(o.beforeReminderRate)} — hatırlatma saati olan sorumluluklarda "Yaptım" anı hatırlatmadan önce`],
    ['Tutarlılık', `${p(o.fullDayRate)} — planlanan her sorumluluğun yapıldığı gün oranı`],
    ['Sorumluluktan kaçınma / uygunluk', `"Yapamam" ${p(o.declineRate)} (${reasons}); ebeveyn reddi ${p(o.rejectRate)}`],
    ['Ebeveyn döngüsü', `"Yaptım" → ebeveyn kararı ortanca ${o.reviewDelayHours === null ? '–' : `${dec(o.reviewDelayHours)} saat`}`],
    ...(motivation.answered
      ? [['Motive etmek (ebeveyn gözlemi)', `${motivationText(motivation)} — ${motivation.answered} incelemede ebeveynin yanıtı; puan değildir`] as [string, string]]
      : []),
  ];
  const goals = r.goals.filter((g) => !g.archived);
  // GAS değerlendirme anlarında girilir (kullanıcı kararı 2 Kasım 2026, "A1"): sütunlar dönemdeki değerlendirme tarihleri (en çok 8),
  // dönemden önceki son değerlendirme de başlangıç olarak ilk sütunda. Bu hafta dahil.
  const periodFrom = weekStarts(r.today, r.weeks)[0];
  const rated = [...new Set(goals.flatMap((g) => g.ratings.map((x) => x.week)))].sort();
  const before = rated.filter((x) => x < periodFrom).pop();
  const gasWeeks = [...(before ? [before] : []), ...rated.filter((x) => x >= periodFrom && x <= r.today)].slice(-8);
  return {
    from, to, o, reasons, summary, executive, motivation, goals, gasWeeks,
    weeks: weekly(r.tasks, r.completions, r.today, r.weeks),
    tasks: perTask(r.tasks, r.completions, r.today, r.weeks),
    skills: bySkill(r.tasks, r.completions, from, to),
    abc: abcSummary(r.abc, r.today, r.weeks),
  };
}

const taskName = (t: Task) => `${t.emoji ?? ''} ${t.title}`.trim();
const masteryText = `Ustalık: tamamlanmış son ${MASTERY_WEEKS} haftanın her birinde ≥ %${MASTERY_RATE}.`;
const dayPartText = (a: ReturnType<typeof abcSummary>) =>
  `Günün bölümü: sabah ${a.byDayPart.sabah} · öğle ${a.byDayPart['öğle']} · akşam ${a.byDayPart['akşam']} · gece ${a.byDayPart.gece}`;

export function buildReportHtml(r: ReportInput): string {
  const x = reportData(r);
  const { from, gasWeeks, goals, abc } = x;

  const weekRows = x.weeks.map((w) => `<tr><td>${d(w.start)} – ${d(addDays(w.start, 6))}</td><td class="n">${w.approved}/${w.planned}</td>
    <td>${bar(w.rate)} ${p(w.rate)}</td><td class="n">${w.fullDays}/${w.plannedDays}</td><td class="n">${w.declined}</td><td class="n">${w.rejected}</td></tr>`).join('');
  const taskRows = x.tasks.map((s) => `<tr><td>${esc(s.task.emoji)} ${esc(s.task.title)}${s.mastered ? ' <b class="ok">ustalık</b>' : ''}</td>
    <td>${esc(skillName(s.task.skill) || '–')}</td><td class="n">${s.approved}/${s.planned}</td><td>${bar(s.rate)} ${p(s.rate)}</td>
    <td class="n">${s.weeklyRates.map((v) => (v === null ? '–' : v)).join(' · ')}</td></tr>`).join('');
  const skillRows = x.skills.map((s) => `<tr><td>${esc(s.skill)}</td><td class="n">${s.approved}/${s.planned}</td><td>${bar(s.rate)} ${p(s.rate)}</td></tr>`).join('');
  const goalRows = goals.map((g) => {
    const m = Object.fromEntries(g.ratings.map((v) => [v.week, v.rating]));
    return `<tr><td>${esc(g.title)}${g.description ? `<div class="m">${esc(g.description)}</div>` : ''}</td>${gasWeeks
      .map((s) => `<td class="n">${m[s] === undefined ? '·' : m[s] > 0 ? `+${m[s]}` : m[s]}</td>`).join('')}</tr>`;
  }).join('');
  const abcRows = abc.perWeek.map((w) => `<td class="n">${w.count || '·'}${w.avgIntensity ? `<div class="m">ş ${dec(w.avgIntensity)}</div>` : ''}</td>`).join('');

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${REPORT_TITLE} – ${esc(r.childLabel)}</title>
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
  @media screen and (max-width:520px){body{margin:14px} th,td{padding:4px 3px} th{font-size:9px;letter-spacing:0} .bar{width:36px} table{display:block;overflow-x:auto}}
</style></head><body>
<h1>${REPORT_TITLE}</h1>
<div class="meta">${esc(r.childLabel)}${r.age ? ` · ${esc(r.age)}` : ''} · ${d(from)} – ${d(x.to)} (${r.weeks} hafta) · ${esc(r.clinic)} · ${esc(r.clinician)} · hazırlandı ${d(r.today)}</div>

<h2>Özet</h2>
<div class="stats">
${x.summary.map(([label, big, small]) => `  <div class="stat"><b>${big}</b>${esc(label)}<div class="m">${esc(small)}</div></div>`).join('\n')}
</div>

<h2>Haftalık rutin kartı</h2>
<table><tr><th>Hafta</th><th>Onay/plan</th><th>Oran</th><th>Tam gün</th><th>Yapamam</th><th>Ret</th></tr>${weekRows}</table>

<h2>Yürütücü işlev gözlem özeti</h2>
<table>
${x.executive.map(([label, value]) => `<tr><td>${esc(label)}</td><td>${esc(value)}</td></tr>`).join('\n')}
</table>

<h2>Adım başına</h2>
<table><tr><th>Adım</th><th>Beceri</th><th>Onay/plan</th><th>Oran</th><th>Haftalık %</th></tr>${taskRows || '<tr><td colspan="5">Planlanmış adım yok</td></tr>'}</table>
<div class="m">${masteryText}</div>

<h2>Beceri alanına göre</h2>
<table><tr><th>Alan</th><th>Onay/plan</th><th>Oran</th></tr>${skillRows || '<tr><td colspan="3">–</td></tr>'}</table>

${!goals.length ? '' : `<h2>Hedefe ulaşma ölçeği (GAS, −2 … +2)</h2>
${!gasWeeks.length ? '<div class="m">Bu dönemde değerlendirme girilmedi.</div>'
  : `<table><tr><th>Davranış hedefi</th>${gasWeeks.map((s) => `<th class="n">${d(s).slice(0, 5)}</th>`).join('')}</tr>${goalRows}</table>`}`}

<h2>Davranış kayıtları (ebeveyn ABC kaydı)</h2>
<table><tr><th>Hafta</th>${abc.perWeek.map((w) => `<th class="n">${d(w.start).slice(0, 5)}</th>`).join('')}</tr><tr><td>Kayıt (ş = ort. şiddet 1–5)</td>${abcRows}</tr></table>
<div class="m">${dayPartText(abc)}</div>

<div class="limits">${esc(EXPORT_FOOTER)}</div>
</body></html>`;
}

/* ---------- Aileye gönderilen içerik, biçim v1 (ortak veritabani.md 40.2) ---------- */

export type ReportSection =
  | { type: 'text'; title?: string; body: string }
  | { type: 'kv'; title?: string; rows: [string, string][] }
  | { type: 'table'; title?: string; columns: string[]; rows: string[][] }
  | { type: 'list'; title?: string; items: string[] };
export type ReportContent = {
  v: 1;
  child?: { name: string };
  period?: { start: string; end: string };
  footer?: string;
  sections: ReportSection[];
};

// Sunucunun sınırları (report_content_check). Uzunluk kod noktası sayısıdır (char_length), boyut jsonb metninin baytı.
export const CONTENT_LIMITS = {
  sections: 40, title: 200, body: 8000, kvRows: 60, columns: 12, rows: 200, cell: 300, items: 60, item: 500,
  child: 120, footer: 500, bytes: 262144,
};

// Aileye giden rapor: yazdırılan raporla aynı hesap. GAS ve davranış hedefi puanları aileye gitmez (hedef puanları
// yalnız uzmanda; ClinicApp CLAUDE.md "Rıza ve gizlilik"); ilerleme notu aynı veriden, GAS'sız ve "Uzman yorumu" satırı olmadan.
export function reportContent(r: ReportInput): ReportContent {
  const x = reportData(r);
  const sections: ReportSection[] = [
    { type: 'kv', title: 'Özet', rows: x.summary.map(([label, big, small]) => [label, `${big} · ${small}`]) },
    {
      type: 'table', title: 'Haftalık rutin kartı', columns: ['Hafta', 'Onay/plan', 'Oran', 'Tam gün', 'Yapamam', 'Ret'],
      rows: x.weeks.map((w) => [weekLabel(w.start), `${w.approved}/${w.planned}`, p(w.rate), `${w.fullDays}/${w.plannedDays}`, String(w.declined), String(w.rejected)]),
    },
    { type: 'kv', title: 'Yürütücü işlev gözlem özeti', rows: x.executive },
    x.tasks.length
      ? {
        type: 'table', title: 'Adım başına', columns: ['Adım', 'Beceri', 'Onay/plan', 'Oran', 'Haftalık %'],
        rows: x.tasks.map((s) => [`${taskName(s.task)}${s.mastered ? ' · ustalık' : ''}`, skillName(s.task.skill) || '–',
          `${s.approved}/${s.planned}`, p(s.rate), s.weeklyRates.map((v) => (v === null ? '–' : String(v))).join(' · ')]),
      }
      : { type: 'text', title: 'Adım başına', body: 'Planlanmış adım yok.' },
    ...(x.tasks.some((s) => s.mastered) ? [{ type: 'text', body: masteryText } as ReportSection] : []),
    x.skills.length
      ? { type: 'table', title: 'Beceri alanına göre', columns: ['Alan', 'Onay/plan', 'Oran'], rows: x.skills.map((s) => [s.skill, `${s.approved}/${s.planned}`, p(s.rate)]) }
      : { type: 'text', title: 'Beceri alanına göre', body: 'Planlanmış adım yok.' },
    {
      type: 'table', title: 'Davranış kayıtları (ebeveyn ABC kaydı)', columns: ['Hafta', 'Kayıt', 'Ort. şiddet (1–5)'],
      rows: x.abc.perWeek.map((w) => [weekLabel(w.start), String(w.count), w.avgIntensity ? dec(w.avgIntensity) : '–']),
    },
    { type: 'text', body: dayPartText(x.abc) },
    { type: 'text', title: 'İlerleme notu', body: progressNote({ ...r, goals: [] }, { family: true }) },
  ];
  return fitContent({
    v: 1,
    child: { name: r.childLabel },
    period: { start: x.from, end: x.to },
    footer: EXPORT_FOOTER,
    sections,
  });
}

// En çok n kod noktası; kırpılırsa "…" ile biter (vekil çift ortadan bölünmez)
export function clip(s: string, n: number): string {
  const cp = Array.from(s);
  return cp.length <= n ? s : `${cp.slice(0, n - 1).join('')}…`;
}

// jsonb'nin metin biçimi (", " ve ": " ayırıcılarıyla) bayt olarak; sunucu octet_length(p::text) ile ölçer
function jsonbText(v: unknown): string {
  if (Array.isArray(v)) return `[${v.map(jsonbText).join(', ')}]`;
  if (v && typeof v === 'object') return `{${Object.entries(v).filter(([, x]) => x !== undefined).map(([k, x]) => `${JSON.stringify(k)}: ${jsonbText(x)}`).join(', ')}}`;
  return JSON.stringify(v);
}
function utf8(s: string): number {
  let n = 0;
  for (const ch of s) {
    const c = ch.codePointAt(0)!;
    n += c < 0x80 ? 1 : c < 0x800 ? 2 : c < 0x10000 ? 3 : 4;
  }
  return n;
}
export const contentBytes = (c: unknown) => utf8(jsonbText(c));

const MARK = ' (kısaltıldı)';
const marked = (title: string | undefined) => clip(`${title ?? ''}${MARK}`.trim(), CONTENT_LIMITS.title);
const listOf = (s: ReportSection): unknown[] | null => (s.type === 'kv' || s.type === 'table' ? s.rows : s.type === 'list' ? s.items : null);

// Sunucunun sınırlarını aşmayan kopya: bölüm, sütun, satır ve metin sayıları kırpılır; toplam 256 KB'ı aşarsa en büyük
// bölümlerin son satırları, sonra en uzun metinler, en son sondaki bölümler düşer. Kısaltılan bölümün başlığı "(kısaltıldı)".
export function fitContent(c: ReportContent): ReportContent {
  const L = CONTENT_LIMITS;
  const cells = (xs: unknown[], n: number, m: number) => xs.slice(0, n).map((v) => clip(String(v ?? ''), m));
  const sections: ReportSection[] = c.sections.slice(0, L.sections).map((s) => {
    const title = s.title === undefined ? undefined : clip(s.title, L.title);
    const t = title === undefined ? {} : { title };
    if (s.type === 'text') return { type: 'text', ...t, body: clip(s.body, L.body) };
    if (s.type === 'list') {
      const items = cells(s.items, L.items, L.item);
      return { type: 'list', ...(s.items.length > L.items ? { title: marked(title) } : t), items };
    }
    if (s.type === 'kv') {
      const rows = s.rows.slice(0, L.kvRows).map((r) => [clip(String(r[0] ?? ''), L.cell), clip(String(r[1] ?? ''), L.cell)] as [string, string]);
      return { type: 'kv', ...(s.rows.length > L.kvRows ? { title: marked(title) } : t), rows };
    }
    const rows = s.rows.slice(0, L.rows).map((r) => cells(r, L.columns, L.cell));
    return { type: 'table', ...(s.rows.length > L.rows ? { title: marked(title) } : t), columns: cells(s.columns, L.columns, L.cell), rows };
  });
  const out: ReportContent = {
    v: 1,
    ...(c.child ? { child: { name: clip(c.child.name, L.child) } } : {}),
    ...(c.period ? { period: c.period } : {}),
    ...(c.footer !== undefined ? { footer: clip(c.footer, L.footer) } : {}),
    sections: sections.length ? sections : [{ type: 'text', body: '' }],
  };

  let size = contentBytes(out);
  if (size <= L.bytes) return out;
  // 1) satırlar: her satırın baytı bir kez ölçülür, en büyük bölümden sondan düşülür (başlık eki için pay bırakılır)
  const budget = L.bytes - 2048;
  const lists = out.sections.map((s) => {
    const xs = listOf(s);
    const cost = xs ? xs.map((r) => contentBytes(r) + 2) : [];
    return { s, xs, cost, total: cost.reduce((a, b) => a + b, 0), cut: 0 };
  });
  while (size > budget) {
    let best: (typeof lists)[number] | null = null;
    for (const l of lists) if (l.xs && l.xs.length - l.cut > 1 && (!best || l.total > best.total)) best = l;
    if (!best) break;
    const k = best.xs!.length - best.cut - 1;
    best.cut += 1;
    best.total -= best.cost[k];
    size -= best.cost[k];
  }
  for (const l of lists) {
    if (!l.cut || !l.xs) continue;
    const kept = l.xs.slice(0, l.xs.length - l.cut);
    if (l.s.type === 'list') l.s.items = kept as string[];
    else (l.s as { rows: unknown[] }).rows = kept;
    l.s.title = marked(l.s.title);
  }
  // 2) metinler: en uzun gövde yarıya iner
  size = contentBytes(out);
  while (size > L.bytes) {
    const texts = out.sections.filter((s): s is Extract<ReportSection, { type: 'text' }> => s.type === 'text' && s.body.length > 200);
    if (!texts.length) break;
    const t = texts.reduce((a, b) => (b.body.length > a.body.length ? b : a));
    t.body = clip(t.body, Math.floor(Array.from(t.body).length / 2));
    if (!t.title?.endsWith(MARK)) t.title = marked(t.title);
    size = contentBytes(out);
  }
  // 3) son çare: sondaki bölümler
  while (size > L.bytes && out.sections.length > 1) {
    out.sections.pop();
    size = contentBytes(out);
  }
  return out;
}

// Sunucudaki report_content_check'in istemci karşılığı (testler için): sorun yoksa null, varsa yeri
export function contentProblem(c: unknown): string | null {
  const L = CONTENT_LIMITS;
  const str = (v: unknown, n: number) => typeof v === 'string' && Array.from(v).length <= n;
  const strs = (v: unknown, n: number, m: number) => Array.isArray(v) && v.length <= n && v.every((x) => str(x, m));
  const keys = (v: object, allowed: string[]) => Object.keys(v).every((k) => allowed.includes(k));
  if (!c || typeof c !== 'object' || Array.isArray(c)) return 'içerik bir nesne olmalı';
  if (contentBytes(c) > L.bytes) return 'content_too_large';
  const o = c as Record<string, unknown>;
  if (!keys(o, ['v', 'sections', 'child', 'period', 'footer'])) return 'bilinmeyen anahtar';
  if (o.v !== 1) return 'v';
  if ('footer' in o && !str(o.footer, L.footer)) return 'footer';
  if ('child' in o) {
    const ch = o.child as Record<string, unknown>;
    if (!ch || typeof ch !== 'object' || !keys(ch, ['name']) || !str(ch.name, L.child)) return 'child';
  }
  if ('period' in o) {
    const pr = o.period as Record<string, unknown>;
    const day = (v: unknown) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
    if (!pr || typeof pr !== 'object' || !keys(pr, ['start', 'end']) || !day(pr.start) || !day(pr.end) || String(pr.start) > String(pr.end)) return 'period';
  }
  const ss = o.sections;
  if (!Array.isArray(ss) || ss.length < 1 || ss.length > L.sections) return 'sections';
  for (let i = 0; i < ss.length; i++) {
    const s = ss[i] as Record<string, unknown>;
    const at = `sections[${i + 1}]`;
    if (!s || typeof s !== 'object') return at;
    const extra: Record<string, string[]> = { text: ['body'], kv: ['rows'], table: ['columns', 'rows'], list: ['items'] };
    const t = s.type as string;
    if (!extra[t]) return `${at}.type`;
    if (!keys(s, ['type', 'title', ...extra[t]])) return `${at}: bilinmeyen anahtar`;
    if ('title' in s && !str(s.title, L.title)) return `${at}.title`;
    if (t === 'text' && !str(s.body, L.body)) return `${at}.body`;
    if (t === 'kv' && !(Array.isArray(s.rows) && s.rows.length <= L.kvRows && s.rows.every((r) => strs(r, 2, L.cell) && (r as unknown[]).length === 2))) return `${at}.rows`;
    if (t === 'table') {
      if (!strs(s.columns, L.columns, L.cell)) return `${at}.columns`;
      if (!(Array.isArray(s.rows) && s.rows.length <= L.rows && s.rows.every((r) => strs(r, L.columns, L.cell)))) return `${at}.rows`;
    }
    if (t === 'list' && !strs(s.items, L.items, L.item)) return `${at}.items`;
  }
  return null;
}
