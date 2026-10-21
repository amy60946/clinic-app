import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';

// Bildirim zili + okunmamış sayısı (üst köşe düğmesi ya da liste satırındaki küçük işaret)
export default function Bell({ count, onPress, small }: { count: number; onPress?: () => void; small?: boolean }) {
  const icon = (
    <View style={small ? styles.small : styles.btn}>
      <Ionicons name={count ? 'notifications' : 'notifications-outline'} size={small ? 18 : 20} color={count ? colors.navy : small ? colors.faint : colors.navy} />
      {count > 0 && (
        <View style={[styles.badge, small && { top: -4, right: -7 }]}>
          <Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text>
        </View>
      )}
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
  badgeText: { fontSize: 10, fontWeight: '800', color: '#fff' },
});
