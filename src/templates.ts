// Görev şablonları: ortak katalog (ortak/veri/gorev_sablonlari.json, sozlesme/gorev_sablonlari.md) — ParentApp ile aynı liste.
// Güncellemek için: node tools/sync-templates.mjs <ortak>/veri/gorev_sablonlari.json  (template_key = katalog key)
import { Difficulty } from './theme';
import { Category, SkillKey } from './skills';
import catalog from './data/taskTemplates.json';

export { categories } from './skills';
export type { Category } from './skills';

// Önerilen yaş grupları (K ≤5, A 6–8, B 9–12, C 13+)
export type AgeGroup = 'K' | 'A' | 'B' | 'C';
export const ageGroups: { id: AgeGroup; label: string }[] = [
  { id: 'K', label: '5 ve altı' },
  { id: 'A', label: '6–8' },
  { id: 'B', label: '9–12' },
  { id: 'C', label: '13 ve üstü' },
];

export type Template = {
  id: string;
  title: string;
  emoji: string;
  category: Category; // ana kategori: becerisini belirler
  categories: Category[]; // süzgeç etiketleri
  ages: AgeGroup[];
  difficulty: Difficulty;
  coins: number;
  skill: SkillKey;
};

export const templates: Template[] = (catalog.templates as any[]).map((t) => ({
  id: t.key, title: t.title, emoji: t.emoji, category: t.category, categories: t.categories,
  ages: t.ages, difficulty: t.difficulty, coins: t.coins, skill: t.skill,
}));
