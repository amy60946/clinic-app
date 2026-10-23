// Kategori = beceri (ortak/sozlesme/ekonomi.md 5B, 23 Ekim 2026): her görev kategorisi oyundaki tek bir beceriye bağlıdır.
// tasks.skill ve öneri skill alanına beceri anahtarı yazılır; eski serbest etiketler okunurken anahtara eşlenir
// (sunucudaki public.skill_key ile aynı liste — biri değişirse öteki de).

export type Category = 'home' | 'mind' | 'learn' | 'health' | 'focus' | 'relation';
export type SkillKey = 'teamwork' | 'stamina' | 'knowledge' | 'strength' | 'focus' | 'kindness';

export const categories: { id: Category; label: string; emoji: string; skill: SkillKey }[] = [
  { id: 'home', label: 'Ev İşleri', emoji: '🏠', skill: 'teamwork' },
  { id: 'mind', label: 'Ruh Sağlığı', emoji: '🌈', skill: 'stamina' },
  { id: 'learn', label: 'Öğrenme ve Eğitim', emoji: '📚', skill: 'knowledge' },
  { id: 'health', label: 'Sağlık ve Spor', emoji: '💪', skill: 'strength' },
  { id: 'focus', label: 'Odak ve Öz Denetim', emoji: '🎯', skill: 'focus' },
  { id: 'relation', label: 'İlişki Kurma', emoji: '🤝', skill: 'kindness' },
];

export const SKILL_LABEL: Record<SkillKey, string> = {
  teamwork: 'Takım Çalışması',
  stamina: 'Dayanıklılık',
  knowledge: 'Bilgi',
  strength: 'Güç',
  focus: 'Odak',
  kindness: 'Nezaket',
};

export const skillOf = (c: Category): SkillKey => categories.find((x) => x.id === c)!.skill;

// Eski 'self' (Kişisel Bakım) kategorisi 'health' sayılır
export function normalizeCategory(c: string | null | undefined): Category | null {
  if (!c) return null;
  if (c === 'self') return 'health';
  return categories.some((x) => x.id === c) ? (c as Category) : null;
}

const ALIASES: Record<SkillKey, string[]> = {
  teamwork: ['teamwork', 'home', 'responsibility', 'independence', 'takım çalışması', 'sorumluluk', 'bağımsızlık'],
  stamina: ['stamina', 'mind', 'calm', 'dayanıklılık', 'sakinlik', 'sakinleşme', 'duygu farkındalığı'],
  knowledge: ['knowledge', 'learn', 'bilgi', 'okuma', 'dil', 'temel beceriler'],
  strength: ['strength', 'health', 'self', 'self_care', 'güç', 'öz bakım', 'hareket', 'sağlıklı alışkanlık'],
  focus: ['focus', 'odak', 'odaklanma', 'öz denetim', 'sabır', 'planlama'],
  kindness: ['kindness', 'relation', 'nezaket', 'empati', 'minnettarlık', 'paylaşma', 'iletişim', 'arkadaşlık'],
};
const LOOKUP = new Map<string, SkillKey>(
  (Object.keys(ALIASES) as SkillKey[]).flatMap((k) => ALIASES[k].map((a) => [a, k] as [string, SkillKey])),
);

// Ham beceri metni → anahtar; eşleşmeyen (ör. "Özel", boş) null
export function skillKey(raw: string | null | undefined): SkillKey | null {
  const t = (raw ?? '').trim().toLocaleLowerCase('tr-TR');
  if (!t) return null;
  return LOOKUP.get(t) ?? LOOKUP.get((raw ?? '').trim().toLowerCase()) ?? null;
}

// Ekranda gösterilecek ad: bilinen beceri Türkçe adıyla, bilinmeyen olduğu gibi
export function skillName(raw: string | null | undefined): string {
  const k = skillKey(raw);
  return k ? SKILL_LABEL[k] : (raw ?? '').trim();
}
