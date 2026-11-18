import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';

// App Store aboneliğinin iki durumu (bayrak `cancel_flow`; yalnız klinik sahibi görür; docs/arastirma/iptal-benchmark.md 4.3 M4, 4.4):
// yenileme kapatıldı → bilgi kartı + "Aboneliği sürdür"; ödeme alınamadı → uyarı + "Ödeme yöntemini güncelle".
// İkisi de Apple'ın abonelik sayfasını açar. Ödeme sorununda teklif yok (kullanıcının seçimi değil); metinlerde olgu var, baskı yok.
const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

export const BILLING_TEXT = (solo: boolean) =>
  `Ödeme alınamadı. Ödeme yöntemini güncellersen ${solo ? 'üyeliğin' : 'üyeliğin ve ekibinin erişimi'} kesintisiz sürer.`;

export function CancelledCard({ until, onResume }: { until: string; onResume: () => void }) {
  return (
    <View style={styles.card}>
      <Ionicons name="information-circle-outline" size={22} color={colors.navy} />
      <View style={styles.col}>
        <Text style={styles.title}>Aboneliğin iptal edildi</Text>
        <Text style={styles.body}>{`Üyelik ${dateText(until)} tarihine kadar açık; yeniden ücret alınmaz.`}</Text>
        <Action label="Aboneliği sürdür" onPress={onResume} />
      </View>
    </View>
  );
}

// compact: ana ekrandaki tek satır (başlıksız); üyelik ekranında başlıklı
export function BillingBanner({ solo, compact, onFix }: { solo: boolean; compact?: boolean; onFix: () => void }) {
  return (
    <View style={[styles.card, styles.warn]} accessibilityRole="alert">
      <Ionicons name="alert-circle-outline" size={compact ? 20 : 22} color={colors.medium.fg} />
      <View style={styles.col}>
        <Text style={styles.body}>{BILLING_TEXT(solo)}</Text>
        <Action label="Ödeme yöntemini güncelle" onPress={onFix} />
      </View>
    </View>
  );
}

function Action({ label, onPress }: { label: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" hitSlop={6} style={({ pressed }) => [styles.btn, pressed && { opacity: 0.8 }]}>
      <Text style={styles.btnText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14, marginTop: 8 },
  warn: { backgroundColor: colors.medium.bg, borderColor: '#F0DFB0' },
  col: { flex: 1, gap: 6, alignItems: 'flex-start' },
  title: { fontSize: 16, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.text, lineHeight: 20, alignSelf: 'stretch' },
  btn: { minHeight: 40, justifyContent: 'center', borderRadius: radius.pill, borderWidth: 1.5, borderColor: colors.navy, backgroundColor: '#fff', paddingHorizontal: 16, marginTop: 4 },
  btnText: { fontSize: 14, fontWeight: '700', color: colors.navy },
});
