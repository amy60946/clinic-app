// Aileye gönderilen rapor içeriği (biçim v1, ortak veritabani.md 40.2) testleri. Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  reportContent, reportData, buildReportHtml, fitContent, contentProblem, contentBytes, clip, CONTENT_LIMITS, REPORT_TITLE,
} from '../src/lib/report.ts';
import { progressNote } from '../src/lib/progressNote.ts';
import { EXPORT_FOOTER } from '../src/lib/metrics.ts';
import { sampleBundle } from '../src/lib/sample.ts';

const today = '2026-10-28';
const input = (over = {}) => {
  const b = sampleBundle(today);
  return {
    clinic: 'Deneme Kliniği', clinician: 'Ada Yılmaz, Psikolog', childLabel: 'Deniz', age: '9 yaş',
    tasks: b.tasks, completions: b.completions, abc: b.abc, goals: b.plan.goals, today, weeks: 4, ...over,
  };
};
const LONE = /[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/;

test('içerik v1: bölümler yazdırılan raporla aynı sırada ve sunucu denetiminden geçer', () => {
  const c = reportContent(input());
  assert.equal(contentProblem(c), null);
  assert.equal(c.v, 1);
  assert.deepEqual(c.child, { name: 'Deniz' });
  assert.deepEqual(c.period, { start: '2026-10-05', end: '2026-10-27' });
  assert.equal(c.footer, EXPORT_FOOTER);
  const titled = c.sections.filter((s) => s.title).map((s) => `${s.type}:${s.title}`);
  assert.deepEqual(titled, [
    'kv:Özet', 'table:Haftalık rutin kartı', 'kv:Yürütücü işlev gözlem özeti', 'table:Adım başına', 'table:Beceri alanına göre',
    'table:Davranış kayıtları (ebeveyn ABC kaydı)', 'text:İlerleme notu',
  ]);
  const week = c.sections.find((s) => s.title === 'Haftalık rutin kartı');
  assert.equal(week.rows.length, 4);
  assert.match(week.rows[0][0], /^\d\d\.\d\d – \d\d\.\d\d$/);
  assert.ok(contentBytes(c) < CONTENT_LIMITS.bytes);
});

test('içerik v1: sayılar yazdırılan raporla aynı veriden', () => {
  const r = input();
  const x = reportData(r);
  const c = reportContent(r);
  const html = buildReportHtml(r);
  const summary = c.sections.find((s) => s.title === 'Özet');
  assert.equal(summary.rows.length, x.summary.length);
  x.summary.forEach(([label, big, small], i) => {
    assert.deepEqual(summary.rows[i], [label, `${big} · ${small}`]);
    assert.ok(html.includes(`<b>${big}</b>`));
  });
  const week = c.sections.find((s) => s.title === 'Haftalık rutin kartı');
  x.weeks.forEach((w, i) => {
    assert.equal(week.rows[i][1], `${w.approved}/${w.planned}`);
    assert.ok(html.includes(`<td class="n">${w.approved}/${w.planned}</td>`));
  });
  const tasks = c.sections.find((s) => s.title === 'Adım başına');
  assert.equal(tasks.rows.length, x.tasks.length);
  const abc = c.sections.find((s) => s.title?.startsWith('Davranış kayıtları'));
  assert.equal(abc.rows.reduce((a, row) => a + Number(row[1]), 0), x.abc.total);
});

test('içerik v1: GAS ve uzman yorumu aileye gitmez; ilerleme notu aynı veriden', () => {
  const r = input();
  assert.ok(r.goals.some((g) => g.ratings.length), 'örnek ailede GAS değerlendirmesi var');
  assert.match(buildReportHtml(r), /GAS/);
  const c = reportContent(r);
  const text = JSON.stringify(c);
  assert.doesNotMatch(text, /GAS|Davranış hedefleri|Uzman yorumu/);
  const note = c.sections.find((s) => s.title === 'İlerleme notu');
  assert.equal(note.body, progressNote({ ...r, goals: [] }, { family: true }));
  assert.doesNotMatch(note.body, /^İlerleme notu:/);
  assert.ok(progressNote(r).startsWith(`İlerleme notu: ${r.childLabel}\n${note.body.split('\n')[0]}`));
});

test('içerik v1: kayıt yoksa boş tablo yerine kısa metin', () => {
  const c = reportContent(input({ tasks: [], completions: [], abc: [], goals: [] }));
  assert.equal(contentProblem(c), null);
  assert.deepEqual(c.sections.find((s) => s.title === 'Adım başına'), { type: 'text', title: 'Adım başına', body: 'Planlanmış adım yok.' });
  assert.equal(c.sections.find((s) => s.title === 'Beceri alanına göre').type, 'text');
});

test('içerik v1: çok adım ve uzun adlar sınırları aşmaz', () => {
  const b = sampleBundle(today);
  const base = b.tasks[0];
  const tasks = Array.from({ length: 260 }, (_, i) => ({ ...base, id: `t${i}`, title: `${'ğ'.repeat(320)}😀${i}`, emoji: '😀' }));
  const completions = tasks.map((t) => ({ task_id: t.id, date: '2026-10-20', status: 'approved', child_done_at: null, reviewed_at: null, decline_reason: null, parent_note: null }));
  const c = reportContent(input({ tasks, completions, childLabel: 'Ç'.repeat(200) }));
  assert.equal(contentProblem(c), null);
  const t = c.sections.find((s) => s.type === 'table' && s.title?.startsWith('Adım başına'));
  assert.equal(t.rows.length, CONTENT_LIMITS.rows);
  assert.match(t.title, /\(kısaltıldı\)$/);
  assert.ok(t.rows.every((row) => row.every((cell) => Array.from(cell).length <= CONTENT_LIMITS.cell && !LONE.test(cell))));
  assert.equal(Array.from(c.child.name).length, CONTENT_LIMITS.child);
});

test('fitContent: sayı ve uzunluk sınırları kırpılır', () => {
  const long = (n, ch = 'a') => ch.repeat(n);
  const c = fitContent({
    v: 1, child: { name: long(130) }, footer: long(600),
    sections: [
      { type: 'table', title: long(220), columns: Array.from({ length: 14 }, () => long(310)), rows: Array.from({ length: 210 }, () => Array.from({ length: 13 }, () => 'x')) },
      { type: 'kv', rows: Array.from({ length: 70 }, () => [long(310), long(310)]) },
      { type: 'list', items: Array.from({ length: 70 }, () => long(510)) },
      { type: 'text', body: long(9000) },
      ...Array.from({ length: 45 }, () => ({ type: 'text', body: 'b' })),
    ],
  });
  assert.equal(contentProblem(c), null);
  assert.equal(c.sections.length, CONTENT_LIMITS.sections);
  assert.equal(c.sections[0].columns.length, CONTENT_LIMITS.columns);
  assert.equal(c.sections[0].rows.length, CONTENT_LIMITS.rows);
  assert.equal(c.sections[0].rows[0].length, CONTENT_LIMITS.columns);
  assert.equal(Array.from(c.sections[0].title).length, CONTENT_LIMITS.title);
  assert.equal(c.sections[1].rows.length, CONTENT_LIMITS.kvRows);
  assert.equal(c.sections[2].items.length, CONTENT_LIMITS.items);
  assert.equal(Array.from(c.sections[3].body).length, CONTENT_LIMITS.body);
  assert.equal(c.footer.length, CONTENT_LIMITS.footer);
});

test('fitContent: 256 KB aşılırsa satırlar düşer, sonuç sunucu sınırında', () => {
  const big = (n) => ({
    type: 'table', title: `Tablo ${n}`, columns: Array.from({ length: 12 }, (_, i) => `S${i}`),
    rows: Array.from({ length: 200 }, () => Array.from({ length: 12 }, () => 'ş'.repeat(300))),
  });
  const c = fitContent({ v: 1, sections: [{ type: 'kv', title: 'Özet', rows: [['a', 'b']] }, big(1), big(2), big(3)] });
  assert.equal(contentProblem(c), null);
  assert.ok(contentBytes(c) <= CONTENT_LIMITS.bytes);
  assert.equal(c.sections.length, 4);
  assert.deepEqual(c.sections[0], { type: 'kv', title: 'Özet', rows: [['a', 'b']] });
  assert.ok(c.sections.slice(1).every((s) => s.rows.length >= 1 && s.title.endsWith('(kısaltıldı)')));
  // jsonb metni ", " ve ": " ayırıcılı: ölçü JSON.stringify'dan büyük olmalı
  assert.ok(contentBytes(c) > Buffer.byteLength(JSON.stringify(c)));
});

test('clip: kod noktasıyla kırpar, vekil çifti bölmez', () => {
  assert.equal(clip('abc', 3), 'abc');
  assert.equal(clip('abcd', 3), 'ab…');
  const s = clip(`${'a'.repeat(298)}😀😀😀`, 300);
  assert.equal(Array.from(s).length, 300);
  assert.doesNotMatch(s, LONE);
  assert.equal(REPORT_TITLE, 'Ev rutini gözlem raporu');
});

test('contentProblem: sunucunun reddettiği biçimleri yakalar', () => {
  const ok = { v: 1, sections: [{ type: 'text', body: 'x' }] };
  assert.equal(contentProblem(ok), null);
  assert.notEqual(contentProblem({ ...ok, extra: 1 }), null);
  assert.notEqual(contentProblem({ v: 2, sections: ok.sections }), null);
  assert.notEqual(contentProblem({ v: 1, sections: [] }), null);
  assert.notEqual(contentProblem({ v: 1, sections: [{ type: 'kv', rows: [['a']] }] }), null);
  assert.notEqual(contentProblem({ v: 1, sections: [{ type: 'table', columns: ['a'], rows: [[1]] }] }), null);
  assert.notEqual(contentProblem({ v: 1, period: { start: '2026-11-02', end: '2026-11-01' }, sections: ok.sections }), null);
});
