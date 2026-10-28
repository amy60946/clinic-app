// İlerleme notu testleri. Çalıştırma: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { progressNote, NOTE_FOOTER } from '../src/lib/progressNote.ts';
import { sampleBundle } from '../src/lib/sample.ts';

test('ilerleme notu: örnek aileden bölümler, önceki dönem, GAS, sınır metni', () => {
  const today = '2026-10-28';
  const b = sampleBundle(today);
  const note = progressNote({ childLabel: 'D.', tasks: b.tasks, completions: b.completions, abc: b.abc, goals: b.plan.goals, today, weeks: 4 });
  assert.match(note, /^İlerleme notu: D\./);
  assert.match(note, /Dönem: 5 Ekim – 27 Ekim 2026 \(4 hafta\)/);
  assert.match(note, /Ebeveyn onaylı tamamlama: \d+\/\d+ planlı görev \(%\d+\); önceki 4 haftada %\d+\./);
  assert.match(note, /Zor anlar\n• \d+ kayıt; önceki 4 haftada \d+\./);
  assert.match(note, /Hedefler \(GAS, −2 … \+2\)\n• /);
  assert.match(note, /→/);
  assert.ok(note.endsWith(NOTE_FOOTER));
  assert.doesNotMatch(note, /Deniz/); // çocuğun adı yalnız seçilen biçimde
  assert.equal(progressNote({ childLabel: 'D.', tasks: b.tasks, completions: b.completions, abc: b.abc, goals: b.plan.goals, today, weeks: 4 }), note);
});

test('ilerleme notu: kayıt yoksa boş bölümler', () => {
  const note = progressNote({ childLabel: 'A.', tasks: [], completions: [], abc: [], goals: [], today: '2026-10-28', weeks: 4 });
  assert.match(note, /Bu dönemde planlı görev yok\./);
  assert.match(note, /Bu dönemde zor an kaydı yok\./);
  assert.doesNotMatch(note, /Hedefler/);
});
