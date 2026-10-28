// İlerleme notu: seçilen dönemin kayıtlarından kuralla derlenen, kopyalanabilir Türkçe metin (yapay zekâ yok, veri
// cihazdan çıkmaz). Joon'un "progress note" aracının karşılığı; metin özgün. Gözlem özetidir, tanı ya da puan değildir.
// Saf fonksiyon, testleri tests/progressNote.test.mjs.
import type { Task, Completion, AbcEvent, DayPart } from './metrics.ts';
import {
  observations, perTask, motivationStats, motivationText, windowStarts, lastFullDay, addDays, isoDate, dayPart, parseDate,
  DECLINE_LABELS, MASTERY_WEEKS, MASTERY_RATE,
} from './metrics.ts';

export type NoteGoal = { title: string; archived: boolean; ratings: { week: string; rating: number }[] };

export type NoteInput = {
  childLabel: string;
  tasks: Task[];
  completions: Completion[];
  abc: AbcEvent[];
  goals: NoteGoal[];
  today: string;
  weeks: number;
};

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const day = (iso: string, year = false) => {
  const d = parseDate(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year ? ` ${d.getFullYear()}` : ''}`;
};
const pc = (v: number | null) => (v === null ? '–' : `%${v}`);
const gas = (v: number) => (v > 0 ? `+${v}` : String(v).replace('-', '−'));
const PART: Record<DayPart, string> = { sabah: 'sabah', 'öğle': 'öğle', 'akşam': 'akşam', gece: 'gece' };

export const NOTE_FOOTER = 'Bu metin ebeveynin ev rutini ve zor an kayıtlarından kuralla derlenmiş bir gözlem özetidir; tanı, zekâ ya da dikkat puanı değildir ve tek başına klinik karar için kullanılmaz.';

export function progressNote(r: NoteInput): string {
  const from = windowStarts(r.today, r.weeks)[0];
  const to = lastFullDay(r.today);
  const prevFrom = addDays(from, -7 * r.weeks);
  const prevTo = addDays(from, -1);
  const lines: string[] = [];

  lines.push(`İlerleme notu: ${r.childLabel}`);
  lines.push(`Dönem: ${day(from)} – ${day(to, true)} (${r.weeks} hafta). Kaynak: ebeveynin ParentApp kayıtları.`);

  // Ev rutini
  lines.push('', 'Ev rutini');
  const o = observations(r.tasks, r.completions, from, to);
  if (!o.planned) lines.push('• Bu dönemde planlı görev yok.');
  else {
    const prev = observations(r.tasks, r.completions, prevFrom, prevTo);
    lines.push(`• Ebeveyn onaylı tamamlama: ${o.approved}/${o.planned} planlı görev (${pc(o.rate)})`
      + (prev.planned ? `; önceki ${r.weeks} haftada ${pc(prev.rate)}.` : '.'));
    lines.push(`• Bütün görevlerin tamamlandığı gün: ${o.fullDays}/${o.plannedDays} (${pc(o.fullDayRate)}).`);
    if (o.withReminder) lines.push(`• Hatırlatmadan önce başlama: ${o.beforeReminder}/${o.withReminder} (${pc(o.beforeReminderRate)}).`);
    if (o.declined) {
      const top = (Object.keys(o.declineReasons) as (keyof typeof o.declineReasons)[])
        .filter((k) => o.declineReasons[k] > 0).sort((a, b) => o.declineReasons[b] - o.declineReasons[a])[0];
      lines.push(`• "Yapamam": ${o.declined} kez; en sık neden "${DECLINE_LABELS[top]}".`);
    }
    if (o.rejected) lines.push(`• Ebeveynin onaylamadığı: ${o.rejected} kez.`);
    const stats = perTask(r.tasks, r.completions, r.today, r.weeks).filter((s) => s.planned >= 3);
    if (stats.length >= 2) {
      const best = stats[stats.length - 1];
      const low = stats[0];
      if ((best.rate ?? 0) > (low.rate ?? 0)) {
        lines.push(`• En tutarlı görev: ${best.task.title} (${pc(best.rate)}). En çok desteğe ihtiyaç duyan: ${low.task.title} (${pc(low.rate)}).`);
      }
    }
    const mastered = stats.filter((s) => s.mastered).map((s) => s.task.title);
    if (mastered.length) lines.push(`• Ustalık ölçütünü karşılayan (son ${MASTERY_WEEKS} hafta her hafta ≥ %${MASTERY_RATE}): ${mastered.join(', ')}.`);
    const m = motivationStats(r.completions, from, to);
    if (m.answered >= 3) lines.push(`• Motive etmek (ebeveyn gözlemi): ${motivationText(m)}.`);
  }

  // Zor anlar
  lines.push('', 'Zor anlar');
  const inRange = (a: string, b: string) => r.abc.filter((e) => { const d = isoDate(new Date(e.occurred_at)); return d >= a && d <= b; });
  const cur = inRange(from, to);
  const before = inRange(prevFrom, prevTo);
  if (!cur.length) lines.push(`• Bu dönemde zor an kaydı yok${before.length ? ` (önceki ${r.weeks} haftada ${before.length})` : ''}.`);
  else {
    const avg = Math.round((cur.reduce((a, e) => a + e.intensity, 0) / cur.length) * 10) / 10;
    lines.push(`• ${cur.length} kayıt${before.length || r.abc.length > cur.length ? `; önceki ${r.weeks} haftada ${before.length}` : ''}. Ortalama şiddet ${String(avg).replace('.', ',')}/5 (ebeveyn değerlendirmesi).`);
    const parts = new Map<DayPart, number>();
    cur.forEach((e) => parts.set(dayPart(e), (parts.get(dayPart(e)) ?? 0) + 1));
    const [p, n] = [...parts.entries()].sort((a, b) => b[1] - a[1])[0];
    lines.push(`• En sık görüldüğü gün bölümü: ${PART[p]} (${n}).`);
  }

  // Hedefler (GAS): dönemdeki ilk ve son değerlendirme
  const goals = r.goals.filter((g) => !g.archived);
  if (goals.length) {
    lines.push('', 'Hedefler (GAS, −2 … +2)');
    goals.forEach((g) => {
      const rs = g.ratings.filter((x) => x.week >= from && x.week <= r.today).sort((a, b) => a.week.localeCompare(b.week));
      if (!rs.length) lines.push(`• ${g.title}: bu dönemde değerlendirme yok.`);
      else if (rs.length === 1) lines.push(`• ${g.title}: ${gas(rs[0].rating)} (${day(rs[0].week)} haftası).`);
      else lines.push(`• ${g.title}: ${gas(rs[0].rating)} (${day(rs[0].week)} haftası) → ${gas(rs[rs.length - 1].rating)} (${day(rs[rs.length - 1].week)} haftası).`);
    });
  }

  lines.push('', 'Uzman yorumu:', '', '', NOTE_FOOTER);
  return lines.join('\n');
}
