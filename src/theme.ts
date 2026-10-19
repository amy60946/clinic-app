export const colors = {
  navy: '#0F1B3D',
  navySoft: '#1B2A55',
  bg: '#F5F6F8',
  card: '#FFFFFF',
  line: '#E8EAEF',
  text: '#0F1B3D',
  muted: '#8A91A3',
  faint: '#C5C9D3',
  today: '#E6EAF5',
  gold: '#E9B22B',
  danger: '#B3263E',
  easy: { bg: '#E6F4EA', fg: '#2F7D4A' },
  medium: { bg: '#FFF3D6', fg: '#9A6B00' },
  hard: { bg: '#FDE7EA', fg: '#B3263E' },
};

export const radius = { sm: 10, md: 16, lg: 22, pill: 999 };

export const font = {
  title: { fontSize: 20, fontWeight: '700' as const, color: colors.text },
  heading: { fontSize: 15, fontWeight: '600' as const, color: colors.text },
  body: { fontSize: 14, color: colors.text },
  small: { fontSize: 12, color: colors.muted },
  tiny: { fontSize: 11, color: colors.muted },
};

export type Difficulty = 'easy' | 'medium' | 'hard';

export const difficultyMeta: Record<Difficulty, { label: string; coins: number }> = {
  easy: { label: 'Kolay', coins: 5 },
  medium: { label: 'Orta', coins: 10 },
  hard: { label: 'Zor', coins: 20 },
};
