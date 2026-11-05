// Takvim ekranlarının ortak küçük parçaları: pencere başlığı, durum çipi, seçim çipleri, alan etiketi.
import React from 'react';
import { View, Text, Pressable, StyleSheet, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { IconButton } from '../../components/ui';
import { STATUS_META, type SessionStatus } from '../../lib/sessionCore';

export function SheetHeader({ title, sub, onClose, right }: { title: string; sub?: string; onClose: () => void; right?: React.ReactNode }) {
  return (
    <View style={s.header}>
      <IconButton name="close" onPress={onClose} label="Kapat" />
      <View style={{ flex: 1 }}>
        <Text style={s.title} numberOfLines={1}>{title}</Text>
        {!!sub && <Text style={s.small} numberOfLines={2}>{sub}</Text>}
      </View>
      {right}
    </View>
  );
}

export function StatusChip({ status, small }: { status: SessionStatus; small?: boolean }) {
  const m = STATUS_META[status];
  return (
    <View style={[s.chip, { backgroundColor: m.bg, borderColor: m.line }, small && { paddingHorizontal: 6, paddingVertical: 1 }]}>
      <Text style={{ fontSize: small ? 10.5 : 11.5, fontWeight: '700', color: m.fg }}>{m.label}</Text>
    </View>
  );
}

export function Chips<T extends string | number>({ options, value, onChange, multi }: {
  options: { id: T; label: string }[]; value: T | T[]; onChange: (v: T) => void; multi?: boolean;
}) {
  const on = (id: T) => (multi ? (value as T[]).includes(id) : value === id);
  return (
    <View style={s.chips}>
      {options.map((o) => (
        <Pressable key={String(o.id)} onPress={() => onChange(o.id)} accessibilityRole={multi ? 'checkbox' : 'radio'}
          accessibilityState={multi ? { checked: on(o.id) } : { selected: on(o.id) }}
          style={[s.opt, on(o.id) && s.optOn]}>
          <Text style={[s.optText, on(o.id) && { color: '#fff' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

// 24 saatlik saat alanı (tarayıcı biçimine bağlı 12 saatlik görünüm yerine): "0930" yazınca "09:30" olur
export function TimeInput({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const fix = (raw: string) => {
    const d = raw.replace(/[^0-9]/g, '').slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}:${d.slice(2)}` : d;
  };
  const ok = /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
  return (
    <TextInput value={value} onChangeText={(v) => onChange(fix(v))} placeholder="09:00" accessibilityLabel={label} keyboardType="number-pad" maxLength={5}
      style={[s.input, { width: 92, minHeight: 48, textAlign: 'center', fontVariant: ['tabular-nums'], fontSize: 16, fontWeight: '600' }, !ok && value.length >= 4 && { borderColor: colors.danger }]} />
  );
}

export const FieldLabel = ({ children, hint }: { children: string; hint?: string }) => (
  <View style={{ marginTop: 10, marginBottom: 6 }}>
    <Text style={s.label}>{children}</Text>
    {!!hint && <Text style={s.small}>{hint}</Text>}
  </View>
);

export const Private = ({ text = 'Yalnız sen görürsün' }: { text?: string }) => (
  <View style={s.private}>
    <Ionicons name="eye-off-outline" size={12} color="#7A5A1E" />
    <Text style={{ fontSize: 11, fontWeight: '700', color: '#7A5A1E' }}>{text}</Text>
  </View>
);

export const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  label: { fontSize: 13, fontWeight: '700', color: colors.navy },
  chip: { borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, alignSelf: 'flex-start' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  opt: { borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  optOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  optText: { fontSize: 13, fontWeight: '600', color: colors.navy },
  card: { backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, gap: 8 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  private: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F6EFE3', borderColor: '#EADFC9', borderWidth: 1,
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start' },
  input: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, color: colors.text },
  tile: { flex: 1, minWidth: 120, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 12 },
  tileNum: { fontSize: 22, fontWeight: '700', color: colors.navy },
  link: { fontSize: 13, fontWeight: '700', color: colors.navy, textDecorationLine: 'underline' },
});
