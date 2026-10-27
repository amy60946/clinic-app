import data from '../data/routines.json';
import { templates, Template } from '../templates';
import type { SuggestionInput, RepeatKind } from './clinic';

// Hazır günlük rutinler (ortak veri/hazir_rutinler.json, sozlesme/akislar.md 5.4; ParentApp'in hazır rutinleriyle aynı).
// Uzman bir rutini tek seferde önerir; veritabanında "rutin" kaydı yok, her görev ayrı öneri olur (not alanında rutin adı).
export type RoutineRepeat = 'weekdays' | 'daily' | 'weekly';
export type Routine = {
  id: string; title: string; subtitle: string; icon: string; tint: string; repeat: RoutineRepeat;
  items: { key: string; time: string; days?: number[] }[];
};
export type RoutineTask = Template & { time: string; days?: number[] };

export const ROUTINES = (data as { routines: Routine[] }).routines;
export const WEEKDAYS = [1, 2, 3, 4, 5];

// Katalogda olmayan anahtar (katalog değişirse) sessizce atlanır
export function routineTasks(r: Routine): RoutineTask[] {
  return r.items.flatMap((i) => {
    const t = templates.find((x) => x.id === i.key);
    return t ? [{ ...t, time: i.time, days: i.days }] : [];
  });
}

export const REPEAT_TEXT: Record<RoutineRepeat, string> = {
  weekdays: 'Hafta içi her gün', daily: 'Her gün', weekly: 'Her görev haftanın kendi gününde',
};

function schedule(r: Routine, t: RoutineTask): { recurring: boolean; repeat_kind: RepeatKind; repeat_days: number[] } {
  if (r.repeat === 'daily') return { recurring: true, repeat_kind: 'daily', repeat_days: [] };
  if (r.repeat === 'weekdays') return { recurring: true, repeat_kind: 'weekly', repeat_days: WEEKDAYS };
  return { recurring: true, repeat_kind: 'weekly', repeat_days: t.days?.length ? t.days : WEEKDAYS };
}

// Seçilen görevlerden öneri satırları: ödül ve zorluk katalogdan, hatırlatma rutinin saati, onay ebeveynde
export function routineSuggestions(r: Routine, tasks: RoutineTask[], startDate: string, note: string): SuggestionInput[] {
  const n = [`${r.title} rutini`, note.trim()].filter(Boolean).join(' · ');
  return tasks.map((t) => ({
    title: t.title, emoji: t.emoji, skill: t.skill, description: '', category: t.category, template_key: t.id,
    difficulty: t.difficulty, coins: t.coins, start_date: startDate, ...schedule(r, t), end_date: null,
    reminder: t.time, requires_review: true, note: n,
  }));
}

const norm = (s: string) => s.trim().toLocaleLowerCase('tr-TR');
// Çocukta aynı adlı görev ya da bekleyen öneri varsa baştan seçili gelmez
export const isTaken = (title: string, taken: string[]) => taken.some((x) => norm(x) === norm(title));
