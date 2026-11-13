import React, { useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, useWindowDimensions, NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { track } from '../lib/track';

// İlk kullanım rehberi (kullanıcı kararı 26 Ekim 2026: ParentApp ile aynı "G1" biçimi, tasarım
// https://claude.ai/artifact/NfSc3FCuCntqgqRWruwnbX v2; 26 Ekim: davet bağlantısı ve Plan sekmesine göre güncellendi): uygulamanın kendi ekranı tam boy ve %60 lacivertle
// karartılmış, dokunulacak yer altın halka + ① ② numarası, iki dokunuş arasında altın kesikli çizgi;
// yazı yalnız başlık + tek kısa satır. Yeni hesapta bir kez açılır, ana ekrandaki "Nasıl kullanılır" ile yeniden.
// 3 Kasım 2026 (ilk kullanım "T1"): ekranlar güncellendi — ana ekran bölümleri (dikkat panosu), Takip Planı'nda
// "önce taslak, sonra Aileye gönder" kuralı, gruplu menü (Planla · İzle · Kayıt). 4 ekran kalır (3–4 adımlı turlar en çok bitiriliyor).

const KEY = (userId: string) => `clinic.onboarding.v1.${userId}`;
export const onboardingSeen = async (userId: string) => {
  try { return (await AsyncStorage.getItem(KEY(userId))) === '1'; } catch { return true; }
};
export const markOnboardingSeen = (userId: string) => AsyncStorage.setItem(KEY(userId), '1').catch(() => {});

// Karartma: rengi %60 lacivertle karıştırır (katman yerine; hedef üstte kalsın diye)
const DIM = 0.6;
const NAVY = [15, 27, 61];
function dim(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v * (1 - DIM) + NAVY[i] * DIM));
  return `rgb(${c.join(',')})`;
}
const BG = dim(colors.bg);
const CARD = dim('#FFFFFF');
const FAINT = dim('#E9ECF1');
const INK = colors.navy;
const SOFT = dim('#A0A6B6');

type Step = { title: string; line: string; screen: 'invite' | 'board' | 'plan' | 'training' | 'watch' };
// Takip Planı kapalıyken (lansman odağı "A", 11 Kasım 2026) üçüncü ekran ebeveyn eğitimi
const TRAINING_STEP: Step = { title: 'Eğitimi kur, Etkin yap', line: 'Taslağı ebeveyn görmez. "Etkin" yapınca görür.', screen: 'training' };
const ALL_STEPS: Step[] = [
  { title: 'Aileyi davet et', line: 'E-postayı yaz, "E-posta gönder".', screen: 'invite' },
  { title: 'Kimde ne var', line: 'Ana ekran üç bölüm.', screen: 'board' },
  { title: 'Taslak, sonra gönder', line: 'Bej = taslak. "Aileye gönder" ile gider.', screen: 'plan' },
  { title: 'İzle ve raporla', line: 'İzle bölümü; dönem sonunda "Rapor".', screen: 'watch' },
];

export default function Onboarding({ visible, plan = true, onClose }: { visible: boolean; plan?: boolean; onClose: (completed: boolean) => void }) {
  const STEPS = plan ? ALL_STEPS : ALL_STEPS.map((x) => (x.screen === 'plan' ? TRAINING_STEP : x));
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const scroller = useRef<ScrollView>(null);
  const last = index === STEPS.length - 1;

  const go = (i: number) => {
    scroller.current?.scrollTo({ x: i * width, animated: true });
    setIndex(i);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, width));
    if (i !== index && i >= 0 && i < STEPS.length) setIndex(i);
  };
  const finish = (completed: boolean) => {
    track(completed ? 'onboarding.done' : 'onboarding.skip', { step: index + 1 });
    setIndex(0);
    onClose(completed);
  };

  const wide = width >= 720;
  return (
    <Modal visible={visible} animationType="fade" onRequestClose={() => finish(false)} statusBarTranslucent>
      <View style={{ flex: 1, backgroundColor: BG }}>
        <ScrollView
          ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false}
          onScroll={onScroll} scrollEventThrottle={32} style={{ flex: 1 }}
        >
          {STEPS.map((s) => (
            <SafeAreaView key={s.screen} style={{ width, flex: 1 }} edges={['top']}>
              <View style={[styles.column, wide && { maxWidth: 960, paddingHorizontal: 32 }]}>
                {s.screen === 'invite' && <InviteMock />}
                {s.screen === 'board' && <BoardMock />}
                {s.screen === 'plan' && <PlanMock wide={wide} />}
                {s.screen === 'training' && <TrainingMock wide={wide} />}
                {s.screen === 'watch' && <MenuMock plan={plan} />}
              </View>
            </SafeAreaView>
          ))}
        </ScrollView>

        {/* Açıklama kartı: telefonda altta, geniş ekranda sol altta (hedefleri örtmez) */}
        <SafeAreaView edges={['bottom']} pointerEvents="box-none" style={[styles.cardWrap, wide && styles.cardWrapWide]}>
          <View style={[styles.card, wide && { width: 380 }]}>
            <View style={styles.cardTop}>
              <Text style={styles.count}>{index + 1} / {STEPS.length}</Text>
              <Pressable onPress={() => finish(false)} hitSlop={8} style={styles.skip} accessibilityRole="button">
                <Text style={styles.skipText}>Atla</Text>
              </Pressable>
            </View>
            <Text style={styles.title} accessibilityRole="header">{STEPS[index].title}</Text>
            <View style={styles.cardRow}>
              <Text style={styles.line}>{STEPS[index].line}</Text>
              {last ? (
                <Pressable onPress={() => finish(true)} style={styles.start} accessibilityRole="button">
                  <Text style={styles.startText}>Başla</Text>
                </Pressable>
              ) : (
                <Pressable onPress={() => go(index + 1)} style={styles.next} accessibilityRole="button" accessibilityLabel="İleri">
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                </Pressable>
              )}
            </View>
            <View style={styles.dots}>
              {STEPS.map((_, i) => (
                <Pressable key={i} onPress={() => go(i)} hitSlop={8} accessibilityLabel={`Adım ${i + 1}`}>
                  <View style={[styles.dot, i === index && styles.dotOn]} />
                </Pressable>
              ))}
            </View>
          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

/* ---------- Uygulama ekranlarının sadeleştirilmiş, karartılmış kopyaları ---------- */

function Badge({ n, side = 'left' }: { n: number; side?: 'left' | 'right' }) {
  return (
    <View style={[styles.badge, side === 'left' ? { left: -12 } : { right: -12 }]}>
      <Text style={styles.badgeText}>{n}</Text>
    </View>
  );
}

function Header({ title, sub, back }: { title: string; sub: string; back?: boolean }) {
  return (
    <View style={styles.header}>
      {back && <View style={styles.round}><Ionicons name="chevron-back" size={18} color={INK} /></View>}
      <View style={{ flex: 1, gap: 2 }}>
        {!back && <Text style={{ fontSize: 12, fontWeight: '700', color: SOFT }}>Moyo Mercek</Text>}
        <Text style={{ fontSize: back ? 19 : 22, fontWeight: '800', color: INK }}>{title}</Text>
        <Text style={{ fontSize: 12, color: SOFT }}>{sub}</Text>
      </View>
      <View style={styles.round}><Ionicons name="notifications-outline" size={20} color={INK} /></View>
    </View>
  );
}

const Label = ({ children }: { children: string }) => <Text style={styles.label}>{children}</Text>;
const Block = ({ h }: { h: number }) => <View style={[styles.block, { height: h }]} />;

function InviteMock() {
  return (
    <View style={{ gap: 8 }}>
      <Header title="Mavi Çocuk ve Aile Merkezi" sub="Dr. Elif Kaya · Klinik Psikolog" />
      <View style={[styles.block, { height: 56, backgroundColor: dim('#E6EAF5') }]} />
      <Label>Başlarken</Label>
      <Block h={92} />
      <Label>Aileyi davet et</Label>
      <View style={[styles.block, { padding: 16, gap: 10 }]}>
        <View style={{ height: 40, borderRadius: 12, backgroundColor: BG, justifyContent: 'center', paddingHorizontal: 12 }}>
          <Text style={{ fontSize: 13, color: SOFT }}>ebeveyn@ornek.com</Text>
        </View>
        <View style={styles.target}>
          <Ionicons name="mail-outline" size={18} color="#fff" />
          <Text style={styles.ctaText}>E-posta gönder</Text>
          <Badge n={1} />
        </View>
      </View>
    </View>
  );
}

// Ana ekran: danışanlar bölümlere ayrılır (dikkat panosu); neden çipleri olgu, hepsi aynı nötr renk
function BoardMock() {
  const row = (name: string, chip: string, lit = false) => (
    <View style={[styles.row, !lit && { backgroundColor: CARD }]}>
      <View style={[styles.avatar, !lit && { backgroundColor: FAINT }]}><Text style={{ fontSize: 16, fontWeight: '800', color: lit ? '#2C4A9A' : INK }}>{name[0]}</Text></View>
      <Text style={{ flex: 1, fontSize: 15, fontWeight: '800', color: INK }}>{name}</Text>
      <View style={[styles.chip, !lit && { backgroundColor: FAINT }]}><Text style={[styles.chipText, !lit && { color: INK }]}>{chip}</Text></View>
    </View>
  );
  return (
    <View style={{ gap: 8 }}>
      <Header title="Mavi Çocuk ve Aile Merkezi" sub="Dr. Elif Kaya · Klinik Psikolog" />
      <View>
        <View style={[styles.lit, { gap: 8 }]}>
          <Text style={styles.sec}>Senin sıran</Text>
          {row('Nazlı', '2 değişiklik gönderilmedi', true)}
          <Text style={styles.sec}>Ebeveynden yeni</Text>
          {row('Arda', '2 davranış kaydı', true)}
          <Text style={styles.sec}>Sessiz kalanlar</Text>
          {row('Ece', '9 gündür kayıt yok', true)}
        </View>
        <Badge n={1} />
      </View>
      <Label>Diğer danışanlar</Label>
      {row('Mert', 'bekleyen bir şey yok')}
    </View>
  );
}

// Takip Planı: hedef satırı; taslak bej (aile görmez) ① → "Aileye gönder (2)" ②
function PlanMock({ wide }: { wide: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      <Header title="Nazlı · Takip Planı" sub="8 yaş · Sorumlu: sen" back />
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, alignItems: 'center' }}>
        <View style={[styles.pillDim]}><Text style={{ fontSize: 12, fontWeight: '700', color: INK }}>Kitaplık</Text></View>
        <View style={[styles.pillDim]}><Text style={{ fontSize: 12, fontWeight: '700', color: INK }}>+ Davranış hedefi</Text></View>
        <View>
          <View style={[styles.target, { height: 44, paddingHorizontal: 16 }]}>
            <Ionicons name="paper-plane-outline" size={16} color="#fff" />
            <Text style={styles.ctaText}>Aileye gönder (2)</Text>
          </View>
          <Badge n={2} side="right" />
        </View>
      </View>
      <View style={[styles.block, { padding: 14, gap: 6 }]}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: INK }}>Sabah hazırlığını kendi başına yapar</Text>
        <Text style={{ fontSize: 12, color: SOFT }}>Günlük yaşam · 3. hafta / 8</Text>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 8, marginTop: 4 }}>
          <View style={[styles.block, { flex: 1, height: 56, backgroundColor: FAINT }]} />
          <View style={[styles.block, { flex: 1, height: 56, backgroundColor: FAINT }]} />
          <View style={{ flex: 1 }}>
            <View style={styles.draft}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#7A5A1E' }}>Taslak · Akşam hazırlığı</Text>
              <Text style={{ fontSize: 12, color: '#7A5A1E' }}>aile görmez</Text>
            </View>
            <Badge n={1} />
          </View>
        </View>
      </View>
      <Block h={64} />
    </View>
  );
}

// Danışan menüsü: Planla · İzle · Kayıt; İzle ① ve Rapor ②
// Ebeveyn Eğitimi: taslak eğitim (aile görmez) ① → durumu "Etkin" yap ②; altında üç bölüm
function TrainingMock({ wide }: { wide: boolean }) {
  return (
    <View style={{ gap: 8 }}>
      <Header title="Nazlı · Ebeveyn Eğitimi" sub="8 yaş · Sorumlu: sen" back />
      <View style={[styles.block, { padding: 14, gap: 8 }]}>
        <Text style={{ fontSize: 15, fontWeight: '800', color: INK }}>Ebeveyn zor geçişlerden önce iki uyarı verir</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <View>
            <View style={styles.draft}>
              <Text style={{ fontSize: 13, fontWeight: '800', color: '#7A5A1E' }}>Taslak</Text>
              <Text style={{ fontSize: 12, color: '#7A5A1E' }}>ebeveyn görmez</Text>
            </View>
            <Badge n={1} />
          </View>
          <View>
            <View style={[styles.target, { height: 44, paddingHorizontal: 16 }]}>
              <Ionicons name="checkmark-circle-outline" size={16} color="#fff" />
              <Text style={styles.ctaText}>Etkin yap</Text>
            </View>
            <Badge n={2} side="right" />
          </View>
        </View>
        <View style={{ flexDirection: wide ? 'row' : 'column', gap: 8, marginTop: 4 }}>
          {['Öğrenme modülleri', 'Uygulama görevleri', 'Hızlı yapılacaklar'].map((x) => (
            <View key={x} style={[styles.block, { flex: wide ? 1 : undefined, padding: 10, backgroundColor: FAINT }]}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: INK }}>{x}</Text>
            </View>
          ))}
        </View>
      </View>
      <Block h={64} />
    </View>
  );
}

function MenuMock({ plan }: { plan: boolean }) {
  const group = (head: string, items: string[], lit?: string[]) => (
    <View style={[styles.block, { padding: 12, gap: 6 }, lit && { backgroundColor: '#fff' }, lit && styles.ring]}>
      <Text style={[styles.sec, { marginTop: 0 }, lit && { color: '#6B7286' }]}>{head}</Text>
      {items.map((x) => (
        <Text key={x} style={{ fontSize: 15, fontWeight: lit?.includes(x) ? '800' : '600', color: INK }}>{x}</Text>
      ))}
    </View>
  );
  return (
    <View style={{ gap: 8 }}>
      <Header title="Nazlı" sub="8 yaş · Sorumlu: sen" back />
      {group('Planla', plan ? ['Ebeveyn Eğitimi', 'Takip Planı', 'Seanslar'] : ['Ebeveyn Eğitimi', 'Seanslar'])}
      <View>
        {group('İzle', ['Davranışlar ve Olaylar', 'Özet', 'Ev Rutinleri'], ['Davranışlar ve Olaylar', 'Ev Rutinleri'])}
        <Badge n={1} />
      </View>
      <View>
        <View style={[styles.block, { padding: 12, gap: 6 }]}>
          <Text style={[styles.sec, { marginTop: 0 }]}>Kayıt</Text>
          <Text style={{ fontSize: 15, fontWeight: '600', color: INK }}>Notlar</Text>
          <View style={[styles.ring, { backgroundColor: '#fff', borderRadius: 10, paddingVertical: 6, paddingHorizontal: 8, alignSelf: 'flex-start' }]}>
            <Text style={{ fontSize: 15, fontWeight: '800', color: colors.navy }}>Rapor · PDF ve ilerleme notu</Text>
          </View>
          <Text style={{ fontSize: 15, fontWeight: '600', color: INK }}>Danışan Bilgileri</Text>
        </View>
        <Badge n={2} side="right" />
      </View>
    </View>
  );
}

const ring = { borderWidth: 4, borderColor: colors.gold, shadowColor: colors.gold, shadowOpacity: 0.5, shadowRadius: 10, shadowOffset: { width: 0, height: 0 } };

const styles = StyleSheet.create({
  column: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 12 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  round: { width: 40, height: 40, borderRadius: 20, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: SOFT, marginTop: 8 },
  block: { borderRadius: 16, backgroundColor: CARD },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, backgroundColor: '#fff', padding: 14 },
  ring,
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#E6EAF5', alignItems: 'center', justifyContent: 'center' },
  target: { ...ring, height: 52, borderRadius: 14, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  lit: { ...ring, borderRadius: 18, backgroundColor: colors.bg, padding: 10 },
  sec: { fontSize: 11, fontWeight: '800', letterSpacing: 0.6, textTransform: 'uppercase', color: '#6B7286', marginTop: 2 },
  chip: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: '#E6EAF5' },
  chipText: { fontSize: 12, fontWeight: '700', color: '#2C4A9A' },
  pillDim: { height: 36, borderRadius: 10, paddingHorizontal: 12, backgroundColor: CARD, alignItems: 'center', justifyContent: 'center' },
  draft: { ...ring, borderRadius: 12, backgroundColor: '#F7F1E6', padding: 10, gap: 2, minHeight: 56, justifyContent: 'center' },
  badge: { position: 'absolute', top: -14, width: 26, height: 26, borderRadius: 13, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontSize: 13, fontWeight: '800', color: colors.navy },
  cardWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' },
  cardWrapWide: { alignItems: 'flex-start', paddingHorizontal: 40, paddingBottom: 40 },
  card: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 22, padding: 18, gap: 8, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { fontSize: 12, fontWeight: '700', color: '#6B5300', backgroundColor: '#FFF6DE', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, overflow: 'hidden' },
  skip: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  skipText: { fontSize: 14, fontWeight: '600', color: '#5B6274' },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy },
  cardRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  line: { flex: 1, fontSize: 15, color: '#4A5165' },
  next: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  start: { height: 48, paddingHorizontal: 20, borderRadius: 24, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  startText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 5, marginTop: 2 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D5D9E2' },
  dotOn: { width: 18, backgroundColor: colors.navy },
});
