import data from '../data/routines.json';
import { templates, Template, AgeGroup } from '../templates';
import type { Category } from '../skills';
import { Routine, RoutineTask, RoutineRepeat, OwnRoutine, fitsAge } from './routineCore';
export * from './routineCore';

// Günlük rutinler v2 (ortak veri/hazir_rutinler.json sürüm 2, sozlesme/akislar.md 5.4 "Günlük rutin v2"; kullanıcı kararı 28 Ekim 2026):
// - Katalog yaş grubuna göre: her rutin bir yaş aralığı için ('ages'), aynı konunun ('theme') K / A–B / C sürümleri olabilir.
//   Çocuğun yaş grubuna uyan sürüm gösterilir; rutindeki her görev o yaşa uygundur (ortak tools/check_routines.py).
// - Uzmanın kendi rutinleri (clinic_routines) aynı biçime çevrilir.
// - Uzman saatleri ve günleri düzenler; seçili görevler tek paket (routine_group) olarak ayrı öneri satırları olur.
//   Ebeveyn paketi tek kartta görür; kabul edilen her görev ayrı görev kalır (onay ve oyun görev görev).
type CatalogRoutine = {
  id: string; theme: string; ages: AgeGroup[]; title: string; subtitle: string; icon: string; tint: string; repeat: RoutineRepeat;
  items: { key: string; time: string; days?: number[] }[];
};

const fromTemplate = (t: Template, time: string, days?: number[]): RoutineTask => ({
  id: t.id, title: t.title, emoji: t.emoji, skill: t.skill, category: t.category, template_key: t.id,
  difficulty: t.difficulty, coins: t.coins, time, days,
});

// Katalogda olmayan anahtar (katalog değişirse) sessizce atlanır
export const ROUTINES: Routine[] = (data as { routines: CatalogRoutine[] }).routines.map((r) => ({
  id: r.id, key: r.id, source: 'catalog', title: r.title, subtitle: r.subtitle, icon: r.icon, tint: r.tint, repeat: r.repeat,
  ages: r.ages, theme: r.theme,
  tasks: r.items.flatMap((i) => {
    const t = templates.find((x) => x.id === i.key);
    return t ? [fromTemplate(t, i.time, i.days)] : [];
  }),
}));

// Çocuğa uyan rutinler: yaş biliniyorsa yalnız o grubun sürümleri; bilinmiyorsa hepsi (yaş etiketiyle)
export const routinesFor = (band: AgeGroup | null, list: Routine[] = ROUTINES) => list.filter((r) => fitsAge(r, band));

const OWN_TINT = '#EEF1F8';
export function ownToRoutine(o: OwnRoutine): Routine {
  return {
    id: o.id, key: `own:${o.id}`, source: 'own', title: o.title, subtitle: 'Senin rutinin', icon: o.icon, tint: OWN_TINT,
    repeat: o.repeat, ages: o.ages,
    tasks: o.items.map((x, i) => {
      const t = x.key ? templates.find((y) => y.id === x.key) : undefined;
      return {
        id: `${o.id}-${i}`, title: x.title, emoji: x.emoji || t?.emoji || '⭐', skill: x.skill ?? t?.skill ?? '',
        category: ((x.category ?? t?.category) as Category) ?? null, template_key: x.key ?? null,
        difficulty: x.difficulty ?? t?.difficulty ?? 'easy', coins: x.coins ?? t?.coins ?? ({ easy: 5, medium: 10, hard: 20 }[x.difficulty ?? 'easy']),
        time: x.time ?? '', days: x.days,
      };
    }),
  };
}
