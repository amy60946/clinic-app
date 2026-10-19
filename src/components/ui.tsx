import React from 'react';
import { View, Text, Pressable, StyleSheet, ViewStyle, ActivityIndicator, TextInput, TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

// ParentApp ile aynı görsel dil (sade, beyaz kartlar, lacivert vurgu). Ortak parçalar ParentApp/src/components/ui.tsx'ten.

const AVATAR_EMOJI: Record<string, string> = {
  martı: '🕊️', kedi: '🐱', sincap: '🐿️', köpek: '🐶', kuş: '🐦', caretta: '🐢', ayı: '🐻', kurt: '🐺',
  keçi: '🐐', flamingo: '🦩', fil: '🐘', zebra: '🦓', at: '🐴', kadın: '👩', erkek: '👨',
};

export function Avatar({ id, size = 44, ring = false }: { id?: string; size?: number; ring?: boolean }) {
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2, backgroundColor: '#EEF0F5', alignItems: 'center', justifyContent: 'center',
      borderWidth: ring ? 2 : 0, borderColor: colors.navy,
    }}>
      <Text style={{ fontSize: size * 0.5 }}>{(id && AVATAR_EMOJI[id]) || '🙂'}</Text>
    </View>
  );
}

export function Initials({ name, size = 36 }: { name: string; size?: number }) {
  const t = name.split(/\s+/).filter((w) => w && !w.endsWith('.')).map((w) => w[0]).slice(0, 2).join('').toUpperCase() || '·';
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: colors.today, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.38, fontWeight: '700', color: colors.navy }}>{t}</Text>
    </View>
  );
}

export function IconButton({
  name, onPress, size = 20, style, color = colors.navy, label,
}: {
  name: keyof typeof Ionicons.glyphMap; onPress?: () => void; size?: number; style?: ViewStyle; color?: string; label: string;
}) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={8}
      style={[{ width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' }, style]}>
      <Ionicons name={name} size={size} color={color} />
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle | ViewStyle[] }) {
  return <View style={[styles.card, style as ViewStyle]}>{children}</View>;
}

export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={o.id} onPress={() => onChange(o.id)} style={[styles.segItem, value === o.id && styles.segActive]}>
          <Text numberOfLines={1} style={{ fontSize: 13, fontWeight: value === o.id ? '700' : '500', color: value === o.id ? colors.navy : colors.muted }}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export const Label = ({ children, style }: { children: string; style?: object }) => (
  <Text style={[{ fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: colors.muted, marginTop: 20, marginBottom: 8 }, style]}>
    {children.toUpperCase()}
  </Text>
);

export function Button({ title, onPress, busy, kind = 'primary', style, icon }: {
  title: string; onPress: () => void; busy?: boolean; kind?: 'primary' | 'ghost' | 'danger'; style?: ViewStyle;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const fg = kind === 'primary' ? '#fff' : kind === 'danger' ? colors.danger : colors.navy;
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.btn,
        kind === 'primary' ? { backgroundColor: colors.navy } : { borderWidth: 1, borderColor: kind === 'danger' ? colors.danger : colors.line, backgroundColor: '#fff' },
        (busy || pressed) && { opacity: 0.7 },
        style,
      ]}
    >
      {busy ? <ActivityIndicator color={fg} /> : (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          {icon && <Ionicons name={icon} size={16} color={fg} />}
          <Text style={{ color: fg, fontSize: 15, fontWeight: '700' }}>{title}</Text>
        </View>
      )}
    </Pressable>
  );
}

export function Field({ label, style, ...p }: TextInputProps & { label?: string }) {
  return (
    <View>
      {!!label && <Text style={styles.cap}>{label}</Text>}
      <TextInput placeholderTextColor={colors.faint} {...p} style={[styles.input, style]} />
    </View>
  );
}

// Yüzde çubuğu (0–100)
export function Bar({ pct, color = colors.navy, height = 6 }: { pct: number; color?: string; height?: number }) {
  return (
    <View style={{ height, borderRadius: height / 2, backgroundColor: '#F1F3F8', overflow: 'hidden' }}>
      <View style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height, backgroundColor: color }} />
    </View>
  );
}

export function Pill({ text, tone = 'neutral' }: { text: string; tone?: 'neutral' | 'good' | 'warn' | 'bad' }) {
  const c = tone === 'good' ? colors.easy : tone === 'warn' ? colors.medium : tone === 'bad' ? colors.hard : { bg: '#EEF0F5', fg: colors.muted };
  return (
    <View style={{ backgroundColor: c.bg, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' }}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.fg }}>{text}</Text>
    </View>
  );
}

// Yön oku: pozitif fark yeşil yukarı, negatif kırmızı aşağı (yüzde puanı)
export function Trend({ delta }: { delta: number | null }) {
  if (delta === null) return <Text style={styles.cap}>–</Text>;
  const up = delta > 2, down = delta < -2;
  const color = up ? colors.easy.fg : down ? colors.danger : colors.muted;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
      <Ionicons name={up ? 'arrow-up' : down ? 'arrow-down' : 'remove'} size={12} color={color} />
      <Text style={{ fontSize: 12, fontWeight: '600', color }}>{Math.abs(Math.round(delta))}</Text>
    </View>
  );
}

export const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16 },
  seg: { flexDirection: 'row', backgroundColor: '#ECEEF3', borderRadius: radius.sm, padding: 3 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: 8 },
  segActive: { backgroundColor: '#fff' },
  btn: { height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  cap: { fontSize: 12, color: colors.muted },
  input: { backgroundColor: '#F3F4F8', borderRadius: radius.sm, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: colors.navy, marginTop: 4 },
});
