import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { IconButton } from '../components/ui';

// "Aile neyi görür?" (ilk kullanım "A1", 3 Kasım 2026). 24 Kasım 2026 (kullanıcı isteği): soru-yanıt biçimindeki
// "Nasıl kullanılır?" sayfası kalktı, yerine adım adım görsel tur geldi (Onboarding.tsx). Eski sayfadan yalnız bu kart kaldı,
// çünkü başka yerde yazmıyor: turun son adımından tek dokunuşla açılır (FamilySeesPage), Takip Planı'nın (i) kutusunda da durur.
// Kurallar ortak akislar.md 12.1 ve rıza kuralları (CLAUDE.md) ile aynı; ekran değişince burası da güncellenir.

const SEES: { title: string; tone: 'family' | 'private' | 'none'; icon: keyof typeof Ionicons.glyphMap; items: string[] }[] = [
  {
    title: 'Aile görür (sen gönderince)', tone: 'family', icon: 'people-outline',
    items: ['Davranış hedefi, hedef düzeyi, süre, aileye not', 'Etkin ve tamamlanan programlar', 'Rutin ve adım önerileri', 'Değişiklik önerileri'],
  },
  {
    title: 'Yalnız sen ve yetkili ekibin', tone: 'private', icon: 'eye-off-outline',
    items: ['Notlar', 'Değerlendirmeler (GAS)', 'Taslaklar, "Planlandı" programlar', '"Yalnız sende" davranış hedefleri', 'Klinik etiketi'],
  },
  {
    title: 'Sen de görmezsin', tone: 'none', icon: 'lock-closed-outline',
    items: ['Ebeveynin e-posta ve telefonu', 'Ailenin posta kutusu, İnci defteri'],
  },
];
// Takip Planı kapalıyken (lansman odağı "A") aile tarafı: etkin eğitimler, rutin ve adım önerileri
const SEES_TRAINING: typeof SEES = [
  { title: 'Aile görür', tone: 'family', icon: 'people-outline', items: ['Etkin eğitimler: modüller, uygulama görevleri, yapılacaklar', 'Hedef davranışlar ve stratejiler', 'Rutin ve adım önerileri'] },
  { title: 'Yalnız sen ve yetkili ekibin', tone: 'private', icon: 'eye-off-outline', items: ['Notlar', 'Taslak eğitimler', 'Ustalık ölçütü verisi', 'Klinik etiketi'] },
  SEES[2],
];
// Takip Planı ve ebeveyn eğitimi kapalıyken (23 Kasım 2026); seans ve rapor ortak akislar.md 27.1–27.2
const SEES_BASIC: typeof SEES = [
  { title: 'Aile görür', tone: 'family', icon: 'people-outline', items: ['Hedef davranışlar ve stratejiler', 'Rutin ve adım önerileri', 'Aileye açık seanslar ve ücreti', 'Gönderdiğin raporlar'] },
  { title: 'Yalnız sen ve yetkili ekibin', tone: 'private', icon: 'eye-off-outline', items: ['Notlar', 'Seans kaydı ve gündemi', 'Klinik etiketi'] },
  SEES[2],
];
export function FamilySees({ compact, plan = true, training = true }: { compact?: boolean; plan?: boolean; training?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      {!compact && plan && <Text style={styles.aText}>Bej = aileye gitmez.</Text>}
      <View style={styles.sees}>
        {(plan ? SEES : training ? SEES_TRAINING : SEES_BASIC).map((c) => (
          <View key={c.title} style={[styles.seeCol, c.tone === 'family' ? styles.seeFamily : c.tone === 'private' ? styles.seePrivate : styles.seeNone]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={c.icon} size={14} color={c.tone === 'private' ? '#7A5A1E' : colors.navy} />
              <Text style={[styles.seeTitle, c.tone === 'private' && { color: '#7A5A1E' }]}>{c.title}</Text>
            </View>
            {c.items.map((t) => <Text key={t} style={[styles.seeItem, c.tone === 'private' && { color: '#5A4A2A' }]}>• {t}</Text>)}
          </View>
        ))}
      </View>
      <Text style={styles.small}>Ebeveyn paylaşımı her an durdurabilir; erişimin hemen biter.</Text>
    </View>
  );
}

// Turun son adımından açılan kısa sayfa (ayrı pencere değil: turun penceresinin içinde çizilir; iOS'ta pencere üstüne pencere açılmaz)
export function FamilySeesPage({ plan, training, onBack }: { plan: boolean; training: boolean; onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <IconButton name="chevron-back" onPress={onBack} label="Tura dön" />
          <Text style={[styles.title, { flex: 1 }]} accessibilityRole="header">Aile neyi görür?</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
          <FamilySees plan={plan} training={training} />
          <Text style={styles.aText}>Rutin ve adımları sen önerirsin. Eklemek ebeveynin kararıdır.</Text>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  aText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  sees: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seeCol: { flexGrow: 1, flexBasis: 190, borderRadius: radius.sm, padding: 10, gap: 4 },
  seeFamily: { backgroundColor: '#E9F0FB' },
  seePrivate: { backgroundColor: '#F7F1E6', borderWidth: 1, borderColor: '#E7D9BD' },
  seeNone: { backgroundColor: '#EEF0F4' },
  seeTitle: { fontSize: 13, fontWeight: '700', color: colors.navy },
  seeItem: { fontSize: 13, color: colors.text, lineHeight: 18 },
});
