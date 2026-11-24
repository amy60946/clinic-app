import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Bildirim zili + okunmamış sayısı (üst köşe düğmesi ya da liste satırındaki küçük işaret).
// Satırdaki küçük zil (24 Kasım 2026): yeni bir şey varsa dolu lacivert zil + sarı sayı (okunmamış bildirim) ya da sarı nokta
// (`dot`: bildirimi okunmuş ama satırda ebeveynden yeni kayıt var); yoksa soluk çizgi zil. Sakin tek vurgu rengi (bildirim
// listesindeki okunmamış noktasıyla aynı sarı), kırmızı yok; renk tek başına değil: sayı ve erişilebilirlik etiketi.
export default function Bell({ count, onPress, small, dot }: { count: number; onPress?: () => void; small?: boolean; dot?: boolean }) {
  const on = count > 0 || (!!small && !!dot);
  const mark = small && on ? (count > 0 ? `${count} okunmamış bildirim` : 'Yeni kayıt var') : undefined;
  const icon = (
    <View style={small ? styles.small : styles.btn} {...(mark ? { accessible: true, accessibilityRole: 'image' as const, accessibilityLabel: mark } : {})}>
      <Ionicons name={on ? 'notifications' : 'notifications-outline'} size={small ? 18 : 20} color={on || !small ? colors.navy : colors.faint} />
      {count > 0 ? (
        <View style={[styles.badge, small && styles.badgeCalm]}>
          <Text style={[styles.badgeText, small && { color: colors.navy }]}>{count > 99 ? '99+' : count}</Text>
        </View>
      ) : on ? <View style={styles.dot} /> : null}
    </View>
  );
  if (!onPress) return icon;
  return (
    <Pressable onPress={onPress} hitSlop={8} accessibilityRole="button"
      accessibilityLabel={count ? `Bildirimler, ${count} okunmamış` : 'Bildirimler'}>
      {icon}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  small: { width: 24, height: 24, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute', top: -2, right: -4, minWidth: 18, height: 18, borderRadius: 9, paddingHorizontal: 4,
    backgroundColor: colors.danger, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.bg,
  },
  badgeCalm: { top: -5, right: -8, backgroundColor: colors.gold, borderColor: '#fff' },
  dot: { position: 'absolute', top: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold, borderWidth: 2, borderColor: '#fff' },
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
});
