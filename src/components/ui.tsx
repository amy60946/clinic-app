import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator, TextInputProps, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, Difficulty, difficultyMeta } from '../theme';

// ParentApp'in bileşenleriyle aynı görünüm (src/components/ui.tsx, src/screens/AuthScreens.tsx)

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

// Büyük harfe çevirme ve harf aralığı yok: Türkçe "i/İ" bozuluyordu (ParentApp ile aynı düzeltme)
export const Label = ({ children }: { children: string }) => (
  <Text style={styles.label}>{children}</Text>
);

export function Input({ secure, ...props }: TextInputProps & { secure?: boolean }) {
  const [hidden, setHidden] = useState(true);
  return (
    <View style={styles.inputWrap}>
      <TextInput
        {...props}
        secureTextEntry={secure && hidden}
        placeholderTextColor={colors.muted}
        style={styles.input}
      />
      {secure && (
        <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'}>
          <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.muted} />
        </Pressable>
      )}
    </View>
  );
}

export function Cta({ label, onPress, busy, disabled, style }: {
  label: string; onPress: () => void; busy?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  return (
    <Pressable style={[styles.cta, busy && { opacity: 0.7 }, disabled && { opacity: 0.4 }, style]} onPress={onPress}
      disabled={busy || disabled} accessibilityRole="button" accessibilityState={{ disabled: !!(busy || disabled) }}>
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{label}</Text>}
    </Pressable>
  );
}

export function LinkText({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} hitSlop={8} style={{ alignSelf: 'center', paddingVertical: 6 }}>
      <Text style={styles.link}>{children}</Text>
    </Pressable>
  );
}

export function Notice({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={styles.notice}>
      <Ionicons name={icon} size={22} color={colors.navy} />
      <Text style={{ flex: 1, fontSize: 13, color: colors.navy, lineHeight: 19 }}>{text}</Text>
    </View>
  );
}

export function Segmented<T extends string>({
  options, value, onChange,
}: { options: { id: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={styles.seg}>
      {options.map((o) => (
        <Pressable key={o.id} onPress={() => onChange(o.id)} style={[styles.segItem, value === o.id && styles.segActive]}>
          <Text style={{ fontSize: 13, fontWeight: value === o.id ? '700' : '500', color: value === o.id ? colors.navy : colors.muted }}>
            {o.label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

// ParentApp ile aynı açma/kapama düğmesi
export function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      style={{ width: 46, height: 28, borderRadius: 14, backgroundColor: value ? colors.navy : '#D7DAE2', padding: 3, justifyContent: 'center' }}
    >
      <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: '#fff', alignSelf: value ? 'flex-end' : 'flex-start' }} />
    </Pressable>
  );
}

export function DifficultyBadge({ d, coins }: { d: Difficulty; coins: number }) {
  const c = d === 'easy' ? colors.easy : d === 'medium' ? colors.medium : colors.hard;
  return (
    <View style={[styles.badge, { backgroundColor: c.bg }]}>
      <Text style={{ fontSize: 11, fontWeight: '600', color: c.fg }}>{difficultyMeta[d].label} · {coins}</Text>
      <View style={styles.coin} />
    </View>
  );
}

export function IconButton({ name, onPress, label, size = 20 }: {
  name: keyof typeof Ionicons.glyphMap; onPress?: () => void; label: string; size?: number;
}) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} hitSlop={8} style={styles.iconBtn}>
      <Ionicons name={name} size={size} color={colors.navy} />
    </Pressable>
  );
}

// Yatay kaydırılan seçim çubuğu (ParentApp "Görev Oluştur" kategori çipleriyle aynı görünüm). Telefonda alt satıra kaymaz.
export function ChipBar<T extends string>({ options, value, onChange, inset = 0 }: {
  options: { id: T; label: string; icon?: keyof typeof Ionicons.glyphMap }[]; value: T; onChange: (v: T) => void;
  inset?: number; // kaydırma alanı ekran kenarına kadar uzanırken ilk/son çipin kenardan boşluğu
}) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ gap: 8, paddingVertical: 4, paddingHorizontal: inset, alignItems: 'center' }}>
      {options.map((o) => {
        const on = o.id === value;
        return (
          <Pressable key={o.id} onPress={() => onChange(o.id)} accessibilityRole="tab" accessibilityState={{ selected: on }}
            style={[styles.chip, on && { backgroundColor: colors.navy, borderColor: colors.navy }]}>
            {o.icon && <Ionicons name={o.icon} size={16} color={on ? '#fff' : colors.navy} />}
            <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: '600', color: on ? '#fff' : colors.navy }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

// Küçük düğme (ikincil eylem)
export function SmallButton({ label, onPress, danger, busy }: { label: string; onPress: () => void; danger?: boolean; busy?: boolean }) {
  return (
    <Pressable onPress={onPress} disabled={busy} hitSlop={6}
      style={[styles.small, danger && { borderColor: colors.danger }, busy && { opacity: 0.6 }]}>
      <Text style={{ fontSize: 13, fontWeight: '600', color: danger ? colors.danger : colors.navy }}>{label}</Text>
    </Pressable>
  );
}

// Kısa metin + "i": dokununca ayrıntı yerinde açılır (Alert web'de görünmediği için açılır kutu)
export function InfoText({ text, detail, small }: { text: string; detail: string[]; small?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <Text style={[styles.infoText, small && styles.infoSmall]}>{text}</Text>
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={10} accessibilityRole="button"
          accessibilityLabel={open ? 'Açıklamayı kapat' : 'Nasıl çalışır?'} accessibilityState={{ expanded: open }}>
          <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={small ? 18 : 22} color={colors.navy} />
        </Pressable>
      </View>
      {open && (
        <View style={styles.infoBox}>
          {detail.map((d) => (
            <View key={d} style={{ flexDirection: 'row', gap: 8 }}>
              <Text style={styles.infoDetail}>•</Text>
              <Text style={[styles.infoDetail, { flex: 1 }]}>{d}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

// Onay kutusu satırı: önceden işaretli gelmez; metindeki bağlantılar (InlineLink) kutuyu değiştirmez
export function CheckRow({ checked, onToggle, children, small }: { checked: boolean; onToggle: () => void; children: React.ReactNode; small?: boolean }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: small ? 8 : 10 }}>
      <Pressable onPress={onToggle} hitSlop={8} accessibilityRole="checkbox" accessibilityState={{ checked }}>
        <Ionicons name={checked ? 'checkbox' : 'square-outline'} size={small ? 18 : 22} color={checked ? colors.navy : colors.muted} />
      </Pressable>
      <Text style={[styles.checkText, small && styles.checkSmall]} onPress={onToggle}>{children}</Text>
    </View>
  );
}

export function InlineLink({ children, onPress }: { children: string; onPress: () => void }) {
  return (
    <Text style={styles.inlineLink} accessibilityRole="link" onPress={(e) => { e?.stopPropagation?.(); onPress(); }}>{children}</Text>
  );
}

export function Empty({ text }: { text: string }) {
  return <Text style={{ fontSize: 13, color: colors.muted, lineHeight: 19, paddingVertical: 8 }}>{text}</Text>;
}

const styles = StyleSheet.create({
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  coin: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 6, height: 40, paddingHorizontal: 16,
    borderRadius: radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line,
  },
  seg: { flexDirection: 'row', flexWrap: 'wrap', backgroundColor: '#ECEEF3', borderRadius: radius.sm, padding: 3 },
  segItem: { flexGrow: 1, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 10, borderRadius: 8 },
  segActive: { backgroundColor: '#fff' },
  small: { borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 20, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.sm,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.navy },
  cta: { height: 52, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  notice: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, padding: 16, alignItems: 'center' },
  infoText: { flex: 1, fontSize: 14, color: colors.text, lineHeight: 20 },
  infoSmall: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  infoBox: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 12, gap: 6 },
  infoDetail: { fontSize: 13, color: colors.text, lineHeight: 19 },
  checkText: { flex: 1, fontSize: 13, color: colors.text, lineHeight: 20 },
  checkSmall: { fontSize: 12, lineHeight: 17, color: colors.muted },
  inlineLink: { fontWeight: '700', color: colors.navy, textDecorationLine: 'underline' },
});
