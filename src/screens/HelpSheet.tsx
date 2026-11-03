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
type Item = { key: string; q: string; a?: string[]; card?: boolean; show?: HelpAction; showLabel?: string; ownerOnly?: boolean };

const ITEMS: Item[] = [
  {
    key: 'invite', q: 'Bir aileyi nasıl davet ederim?', show: 'invite', showLabel: 'Davet penceresini aç',
    a: [
      'Ana ekranda "Aileyi davet et"e dokun, ebeveynin e-postasını yaz; istersen çocuğun adını ve yaş grubunu ekle.',
      'Davet senin adınla e-postayla gider ve 3 gün geçerlidir. Ebeveyn ParentApp\'te daveti kabul edip çocuğu paylaşınca çocuk ana ekranında görünür.',
    ],
  },
  { key: 'sees', q: 'Aile neyi görür, neyi görmez?', card: true },
  {
    key: 'routine', q: 'Aileye rutin ya da görev nasıl öneririm?', show: 'routine', showLabel: 'Ev Rutinleri\'ni aç',
    a: [
      'Danışan › Ev Rutinleri › "+ Aileye öner": çocuğun yaşına uygun hazır bir rutin ya da tek bir görev seç, saatleri düzenle, gönder.',
      'Takip Planı\'nda bir hedefin altından eklersen taslak olur ve "Aileye gönder" ile gider. Görevi ekleme kararı ebeveynindir; gönderdiklerin "Gönderilenler"de.',
    ],
  },
  {
    key: 'publish', q: '"Aileye gönder" ne yapar?', show: 'plan', showLabel: 'Takip Planı\'nı aç',
    a: [
      'Takip Planı\'nda eklediğin hedef, program ve rutinler önce taslaktır; bej olanları aile görmez.',
      '"Aileye gönder" önce bir özet açar: işaretli olanlar aileye tek bildirimle gider, işaretini kaldırdıkların bekler. Sonradan yaptığın değişiklikler yeniden "gönderilmedi" sayılır.',
    ],
  },
  {
    key: 'evaluate', q: 'Hedefi ne zaman değerlendiririm?', show: 'plan', showLabel: 'Takip Planı\'nı aç',
    a: [
      'Dört haftada bir ya da hedefin süresi dolunca; zamanı gelince Takip Planı\'nda "Değerlendirme zamanı" çıkar.',
      '"Değerlendir" ile GAS (−2…+2) seçer, sonra Sürdür, Ulaşıldı ya da Ara ver dersin. Değerlendirme aileye gitmez; raporda tarihleriyle yer alır.',
    ],
  },
  {
    key: 'board', q: 'Ana ekrandaki bölümler ne anlama geliyor?', show: 'home', showLabel: 'Ana ekrana dön',
    a: [
      'Senin sıran: aileye gönderilmemiş değişikliğin, değerlendirme zamanı gelen hedefin ya da planı olmayan danışan.',
      'Aileden yeni: son 7 günün davranış kayıtları ve öneri kararları; "Gördüm" deyince yeni bir şey gelene kadar kapanır. Sessiz kalanlar: ailenin 7 gündür kaydı yok.',
      'Bu bir hatırlatmadır; sıralama ya da puan değildir.',
    ],
  },
  {
    key: 'report', q: 'Raporu ve ilerleme notunu nasıl alırım?', show: 'report', showLabel: 'Rapor\'u aç',
    a: [
      'Danışan › Rapor: dönemi ve çocuğun adının nasıl görüneceğini seç. Web\'de PDF olarak kaydedersin, iPad\'de yazdırma ya da paylaşma açılır.',
      '"İlerleme notu" dönemin kayıtlarından kuralla derlenir; kopyalayıp kendi notuna eklersin. Yapay zekâ kullanılmaz, veri cihazdan çıkmaz.',
    ],
  },
  {
    key: 'team', q: 'Ekibime nasıl uzman eklerim?', show: 'team', showLabel: 'Ayarlar › Ekip', ownerOnly: true,
    a: [
      'Ayarlar › Ekip › "Ekibe uzman davet et": kod 15 dakika geçerlidir. Uzman ClinicApp\'te "Kodum var" ile katılır.',
      'Ekip üyesi yalnız kendi davet ettiği aileleri ve senin atadıklarını görür; atamayı danışan › Danışan Bilgileri › "Ekip erişimini yönet"ten yaparsın.',
    ],
  },
];

export default function HelpSheet({ visible, owner, onClose, onIntro, onSample, onAction }: {
  visible: boolean; owner: boolean; onClose: () => void; onIntro: () => void; onSample: () => void; onAction: (a: HelpAction) => void;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const items = ITEMS.filter((x) => !x.ownerOnly || owner);
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
              <Pressable onPress={onIntro} style={styles.primary} accessibilityRole="button">
                <Ionicons name="play-circle-outline" size={18} color="#fff" />
                <Text style={styles.primaryText}>Kısa tanıtım (4 ekran)</Text>
              </Pressable>
              <Pressable onPress={onSample} style={styles.secondary} accessibilityRole="button">
                <Ionicons name="sparkles-outline" size={16} color={colors.navy} />
                <Text style={styles.secondaryText}>Örnek aileyi aç</Text>
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
                        {x.card ? <FamilySees /> : x.a?.map((t) => <Text key={t} style={styles.aText}>{t}</Text>)}
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
            <Text style={styles.foot}>ClinicApp gözlem toplar, tanı koymaz. Acil yardım hizmeti değildir; acil durumda 112'yi ara.</Text>
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
    items: ['"Aile görür" açık hedefler: hedef düzeyi, süresi ve aileye notun', 'Etkin ve tamamlanan programlar', 'Rutin ve görev önerilerin; eklemek ebeveynin kararı', 'Değişiklik önerilerin'],
  },
  {
    title: 'Yalnız sen ve yetkili ekibin', tone: 'private', icon: 'eye-off-outline',
    items: ['Klinik notların', 'Değerlendirmeler (GAS)', 'Taslaklar ve "Planlandı" programlar', '"Yalnız sende" hedefler', 'Klinik etiketi ve davetteki kendi notun'],
  },
  {
    title: 'Sen de görmezsin', tone: 'none', icon: 'lock-closed-outline',
    items: ['Ebeveynin e-postası ve telefonu', 'Ailenin posta kutusu ve coin defteri'],
  },
];
export function FamilySees({ compact }: { compact?: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      {!compact && <Text style={styles.aText}>Bej renk her yerde aynı anlama gelir: aileye gitmez.</Text>}
      <View style={styles.sees}>
        {SEES.map((c) => (
          <View key={c.title} style={[styles.seeCol, c.tone === 'family' ? styles.seeFamily : c.tone === 'private' ? styles.seePrivate : styles.seeNone]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <Ionicons name={c.icon} size={14} color={c.tone === 'private' ? '#7A5A1E' : colors.navy} />
              <Text style={[styles.seeTitle, c.tone === 'private' && { color: '#7A5A1E' }]}>{c.title}</Text>
            </View>
            {c.items.map((t) => <Text key={t} style={[styles.seeItem, c.tone === 'private' && { color: '#5A4A2A' }]}>• {t}</Text>)}
          </View>
        ))}
      </View>
      <Text style={styles.small}>Ebeveyn paylaşımı her an durdurabilir; durdurunca erişimin hemen biter.</Text>
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
  foot: { fontSize: 12, color: colors.muted, lineHeight: 17, marginTop: 4 },
});
