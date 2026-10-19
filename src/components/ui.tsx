import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator, TextInputProps, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

// ParentApp'in bileşenleriyle aynı görünüm (src/components/ui.tsx, src/screens/AuthScreens.tsx)

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export const Label = ({ children }: { children: string }) => (
  <Text style={styles.label}>{children.toUpperCase()}</Text>
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

export function Cta({ label, onPress, busy, style }: { label: string; onPress: () => void; busy?: boolean; style?: ViewStyle }) {
  return (
    <Pressable style={[styles.cta, busy && { opacity: 0.7 }, style]} onPress={onPress} disabled={busy}>
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

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.md, padding: 16 },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.6, color: colors.muted, marginTop: 20, marginBottom: 8 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.sm,
    paddingHorizontal: 14,
  },
  input: { flex: 1, paddingVertical: 14, fontSize: 15, color: colors.navy },
  cta: { height: 52, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  notice: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, padding: 16, alignItems: 'center' },
});
