import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { IconButton } from '../components/ui';
import { track } from '../lib/track';

// "Nasıl kullanılır?" (ilk kullanım "N1" + "A1", kullanıcı isteği 3 Kasım 2026; benchmark: NN/g — baştaki tanıtım tek başına
// öğretmez, yerinde kısa yanıt işe yarar; SimplePractice başlarken dizisi). Üstte kısa tanıtım (4 ekran) ve örnek aile,
// altında kısa sorular: 2–3 cümle + "Göster" (ilgili yeri açar; danışan yoksa örnek ailede). "Aile neyi görür?" kartı
// (FamilySees) Takip Planı'nın (i) kutusunda da. Metinler ekranların bugünkü adlarıyla; ekran değişince burası da güncellenir.

export type HelpAction = 'invite' | 'routine' | 'plan' | 'report' | 'team' | 'home';
// plan: yalnız Takip Planı açıkken (uzaktan ayar `care_plan`); noPlan: yalnız kapalıyken (lansman odağı "A", 11 Kasım 2026)
type Item = { key: string; q: string; a?: string[]; card?: boolean; show?: HelpAction; showLabel?: string; ownerOnly?: boolean; plan?: boolean; noPlan?: boolean };

// Kısa yanıt (kullanıcı isteği 3 Kasım 2026): bir iki cümle, dokunulacak tuş tırnak içinde
const ITEMS: Item[] = [
  { key: 'invite', q: 'Aileyi nasıl davet ederim?', show: 'invite', showLabel: 'Davet et', a: ['"Aileyi davet et" › ebeveynin e-postası › "E-posta gönder". Davet 3 gün geçerli; ebeveyn onaylayınca çocuk ana ekranda.'] },
  { key: 'sees', q: 'Aile neyi görür?', card: true },
  { key: 'training', noPlan: true, q: 'Ebeveyne eğitim nasıl atarım?', show: 'plan', showLabel: 'Ebeveyn Eğitimi', a: ['Danışan › Ebeveyn Eğitimi › "+ Eğitim ekle". Modül, uygulama görevi ve yapılacak ekle. Eğitim Taslak açılır; "Etkin" yapınca ebeveyn görür.'] },
  { key: 'tasks', noPlan: true, q: 'Uygulama görevi ile hızlı yapılacak farkı ne?', show: 'plan', showLabel: 'Ebeveyn Eğitimi', a: ['Uygulama görevi tekrarlanır; ebeveyn her uyguladığında kayıt girer (ör. "Geçişten önce iki uyarı ver"). Hızlı yapılacak bir kez yapılır ve işaretlenir (ör. "Zamanlayıcı hazırla").'] },
  { key: 'routine', plan: true, q: 'Rutin ya da macera nasıl öneririm?', show: 'routine', showLabel: 'Ev Rutinleri', a: ['Ev Rutinleri › "+ Aileye öner". Takip Planı\'ndan eklersen taslak olur. Eklemek ebeveynin kararı.'] },
  { key: 'routine2', noPlan: true, q: 'Rutin ya da macera nasıl öneririm?', show: 'routine', showLabel: 'Ev Rutinleri', a: ['Ev Rutinleri › "+ Aileye öner". Eklemek ebeveynin kararı.'] },
  { key: 'publish', plan: true, q: '"Aileye gönder" ne yapar?', show: 'plan', showLabel: 'Takip Planı', a: ['Taslakları (bej) aileye yollar. Önce özet açılır; işaretliler tek bildirimle gider.'] },
  { key: 'evaluate', plan: true, q: 'Ne zaman değerlendiririm?', show: 'plan', showLabel: 'Takip Planı', a: ['Dört haftada bir "Değerlendirme zamanı" çıkar › "Değerlendir" › puan › "Kaydet". Aile görmez.'] },
  { key: 'board', q: 'Ana ekrandaki bölümler?', show: 'home', showLabel: 'Ana ekran', a: ['Senin sıran: senden bekleyen. Ebeveynden yeni: son 7 günde ebeveynin girdikleri. Sessiz kalanlar: 7 gündür kayıt yok.'] },
  { key: 'report', q: 'Raporu nasıl alırım?', show: 'report', showLabel: 'Rapor', a: ['Rapor › "Raporu aç" (PDF). İlerleme notu için "Notu kopyala"; yapay zekâ yok.'] },
  { key: 'team', q: 'Ekibime uzman nasıl eklerim?', show: 'team', showLabel: 'Ayarlar', ownerOnly: true, a: ['Uzmandan kişisel kodunu iste (onun Ayarlar sayfasında). Ayarlar › Ekip › "Uzman ekle"ye yaz; uzman onaylayınca ekibine katılır.'] },
  { key: 'workspace', q: 'Birden çok klinikte çalışıyorum, nasıl ayırırım?', a: ['Sol üstte "ClinicApp" yanındaki küçük hesap düğmesine dokun: "Bireysel hesap" ve ekip hesapları (her klinik için bir tane) ayrıdır. Ekip hesabı, klinik seni ekibine eklediğinde ve kabul ettiğinde açılır. Danışanlar, davetler ve seanslar seçili hesaba aittir.'] },
];

export default function HelpSheet({ visible, owner, plan = true, onClose, onIntro, onSample, onAction }: {
  visible: boolean; owner: boolean; plan?: boolean; onClose: () => void; onIntro: () => void; onSample: () => void; onAction: (a: HelpAction) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const items = ITEMS.filter((x) => (!x.ownerOnly || owner) && (plan ? !x.noPlan : !x.plan));
  const toggle = (k: string) => {
    setOpen((o) => (o === k ? null : k));
    if (open !== k) track('help.open', { q: k });
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.column}>
          <View style={styles.header}>
            <IconButton name="close" onPress={onClose} label="Kapat" />
            <Text style={[styles.title, { flex: 1 }]} accessibilityRole="header">Nasıl kullanılır?</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }}>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              <Pressable onPress={onSample} style={styles.primary} accessibilityRole="button">
                <Ionicons name="sparkles-outline" size={18} color="#fff" />
                <Text style={styles.primaryText}>Örnek aileyle dene</Text>
              </Pressable>
              <Pressable onPress={onIntro} style={styles.secondary} accessibilityRole="button">
                <Ionicons name="play-circle-outline" size={16} color={colors.navy} />
                <Text style={styles.secondaryText}>Kısa tanıtım</Text>
              </Pressable>
            </View>
            <View style={styles.list}>
              {items.map((x, i) => {
                const on = open === x.key;
                return (
                  <View key={x.key} style={[i > 0 && styles.line, on && styles.openItem]}>
                    <Pressable onPress={() => toggle(x.key)} style={styles.q} accessibilityRole="button" accessibilityState={{ expanded: on }}>
                      <Text style={styles.qText}>{x.q}</Text>
                      <Ionicons name={on ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
                    </Pressable>
                    {on && (
                      <View style={styles.answer}>
                        {x.card ? <FamilySees plan={plan} /> : x.a?.map((t) => <Text key={t} style={styles.aText}>{t}</Text>)}
                        {x.show && (
                          <Pressable onPress={() => { track('help.show', { q: x.key }); onAction(x.show!); }} style={styles.show} accessibilityRole="button">
                            <Text style={styles.showText}>{x.showLabel ?? 'Göster'}</Text>
                            <Ionicons name="arrow-forward" size={14} color={colors.navy} />
                          </Pressable>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

// "Aile neyi görür?" (A1): üç sütun, dar ekranda alt alta. Kurallar ortak akislar.md 12.1 ve rıza kuralları (CLAUDE.md) ile aynı.
const SEES: { title: string; tone: 'family' | 'private' | 'none'; icon: keyof typeof Ionicons.glyphMap; items: string[] }[] = [
  {
    title: 'Aile görür (sen gönderince)', tone: 'family', icon: 'people-outline',
    items: ['Davranış hedefi, hedef düzeyi, süre, aileye not', 'Etkin ve tamamlanan programlar', 'Rutin ve macera önerileri', 'Değişiklik önerileri'],
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
// Takip Planı kapalıyken (lansman odağı "A") aile tarafı: etkin eğitimler ve macera önerileri
const SEES_TRAINING: typeof SEES = [
  { title: 'Aile görür', tone: 'family', icon: 'people-outline', items: ['Etkin eğitimler: modüller, uygulama görevleri, yapılacaklar', 'Hedef davranışlar ve stratejiler', 'Macera önerileri'] },
  { title: 'Yalnız sen ve yetkili ekibin', tone: 'private', icon: 'eye-off-outline', items: ['Notlar', 'Taslak eğitimler', 'Ustalık ölçütü verisi', 'Klinik etiketi'] },
  SEES[2],
];
export function FamilySees({ compact, plan = true }: { compact?: boolean; plan?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      {!compact && plan && <Text style={styles.aText}>Bej = aileye gitmez.</Text>}
      <View style={styles.sees}>
        {(plan ? SEES : SEES_TRAINING).map((c) => (
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

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  primary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 11 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondary: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 14, paddingVertical: 10 },
  secondaryText: { color: colors.navy, fontSize: 14, fontWeight: '600' },
  list: { backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  openItem: { backgroundColor: '#F7F9FC' },
  q: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 14 },
  qText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.navy },
  answer: { paddingHorizontal: 14, paddingBottom: 14, gap: 8 },
  aText: { fontSize: 14, color: colors.text, lineHeight: 20 },
  show: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 7 },
  showText: { fontSize: 13, fontWeight: '700', color: colors.navy },
  sees: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  seeCol: { flexGrow: 1, flexBasis: 190, borderRadius: radius.sm, padding: 10, gap: 4 },
  seeFamily: { backgroundColor: '#E9F0FB' },
  seePrivate: { backgroundColor: '#F7F1E6', borderWidth: 1, borderColor: '#E7D9BD' },
  seeNone: { backgroundColor: '#EEF0F4' },
  seeTitle: { fontSize: 13, fontWeight: '700', color: colors.navy },
  seeItem: { fontSize: 13, color: colors.text, lineHeight: 18 },
});
