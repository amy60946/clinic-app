import React from 'react';
import { Pressable, Text, Platform, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { saveTextFile } from '../lib/saveFile';
import { toCsv } from '../lib/csv';
import { track } from '../lib/track';

// Tabloyu CSV olarak indir (web) ya da paylaş (iOS). Dosya cihazda oluşur, sunucuya gitmez.
export default function ExportButton({ name, header, rows, event }: {
  name: string; header: string[]; rows: () => string[][]; event: string;
}) {
  const go = async () => {
    const body = rows();
    if (!body.length) return Alert.alert('Bu dönemde dışa aktarılacak kayıt yok.');
    try {
      const r = await saveTextFile(name, toCsv([header, ...body]));
      if (r === 'saved') track(event, { rows: body.length });
    } catch (e) {
      Alert.alert('Dosya oluşturulamadı', (e as Error).message);
    }
  };
  return (
    <Pressable onPress={go} hitSlop={6} accessibilityRole="button" style={({ pressed }) => [styles.btn, pressed && { opacity: 0.7 }]}>
      <Ionicons name={Platform.OS === 'web' ? 'download-outline' : 'share-outline'} size={16} color={colors.navy} />
      <Text style={styles.text}>{Platform.OS === 'web' ? 'İndir (CSV)' : 'Paylaş (CSV)'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  text: { fontSize: 13, fontWeight: '600', color: colors.navy },
});
