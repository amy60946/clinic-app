// Tablo dışa aktarma (CSV): zor anlar ve ev rutini geçmişi. Türkçe Excel noktalı virgül ayırıcı ve UTF-8 BOM bekler.
// Dosyada çocuğun adı yok (dosya adında yalnız baş harf); saf fonksiyonlar, testleri tests/csv.test.mjs.
import type { AbcEvent, Task, Completion } from './metrics.ts';
import { instances, isoDate, dayPart, DECLINE_LABELS } from './metrics.ts';
import { skillName } from '../skills.ts';

type Cell = string | number | null | undefined;

const cell = (v: Cell) => {
  const s = v === null || v === undefined ? '' : String(v);
  // Excel formül olarak çalıştırmasın diye =, +, -, @ ile başlayan metin tırnakla korunur (CSV enjeksiyonu)
  const safe = /^[=+\-@\t\r]/.test(s) ? `'${s}` : s;
  return /[";\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(rows: Cell[][]): string {
  return '﻿' + rows.map((r) => r.map(cell).join(';')).join('\r\n') + '\r\n';
}

const pad = (n: number) => String(n).padStart(2, '0');
const clock = (iso: string) => {
  const d = new Date(iso);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};
const PART: Record<string, string> = { sabah: 'Sabah', 'öğle': 'Öğle', 'akşam': 'Akşam', gece: 'Gece' };

export const ABC_HEADER = ['Tarih', 'Saat', 'Gün bölümü', 'Öncesi', 'Davranış', 'Sonucu', 'Şiddet (1–5)', 'Sesli kayıt'];

// Dönemdeki zor anlar, eskiden yeniye
export function abcRows(events: AbcEvent[], from: string, to: string): string[][] {
  return events
    .filter((e) => { const d = isoDate(new Date(e.occurred_at)); return d >= from && d <= to; })
    .sort((a, b) => a.occurred_at.localeCompare(b.occurred_at))
    .map((e) => [
      isoDate(new Date(e.occurred_at)),
      e.day_part ? '' : clock(e.occurred_at),
      PART[dayPart(e)],
      e.antecedent || '',
      e.behavior || '',
      e.consequence || '',
      String(e.intensity),
      e.audio_path ? 'var' : '',
    ]);
}

export const ROUTINE_HEADER = ['Tarih', 'Görev', 'Beceri', 'Durum', 'Yapamam nedeni', 'Ebeveyn notu', 'Motive etmek (ebeveyn, 1 kolay – 5 zor)'];

const STATUS: Record<Completion['status'] | 'none', string> = {
  approved: 'Yaptı, ebeveyn onayladı',
  pending: '"Yaptım" dedi, incelenmedi',
  declined: '"Yapamam" dedi',
  rejected: 'Ebeveyn onaylamadı',
  retry: 'Ebeveyn "Tekrar dene" dedi',
  none: 'Planlıydı, kayıt yok',
};

// Dönemin planlı her görev günü (kayıtsız günler dahil), tarihe ve göreve göre
export function routineRows(tasks: Task[], comps: Completion[], from: string, to: string): string[][] {
  return instances(tasks, comps, from, to)
    .sort((a, b) => a.date.localeCompare(b.date) || a.task.title.localeCompare(b.task.title, 'tr'))
    .map(({ task, date, c }) => [
      date,
      task.title,
      skillName(task.skill),
      STATUS[c?.status ?? 'none'],
      c?.status === 'declined' ? DECLINE_LABELS[c.decline_reason ?? 'unknown'] : '',
      c?.parent_note ?? '',
      c?.motivation ? String(c.motivation) : '',
    ]);
}

// Dosya adı: baş harf + dönem (ad dosya adına yazılmaz)
export function csvName(kind: 'zor-anlar' | 'ev-rutini', childName: string, from: string, to: string) {
  const ini = (childName.trim()[0] || 'x').toLocaleLowerCase('tr-TR');
  return `${kind}-${ini}-${from}_${to}.csv`;
}
