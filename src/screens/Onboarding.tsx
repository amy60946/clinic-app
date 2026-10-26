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

type Step = { title: string; line: string; screen: 'invite' | 'client' | 'plan' | 'report' };
const STEPS: Step[] = [
  { title: 'Aileyi davet et', line: 'Davet senin adınla e-postayla gider', screen: 'invite' },
  { title: 'Danışanını aç', line: 'Aile paylaşınca burada belirir', screen: 'client' },
  { title: 'Takip planını kur', line: 'Hazır paketle başla, sonra düzenle', screen: 'plan' },
  { title: 'Raporunu al', line: 'PDF kaydet ya da yazdır', screen: 'report' },
];

export default function Onboarding({ visible, onClose }: { visible: boolean; onClose: (completed: boolean) => void }) {
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
                {s.screen === 'client' && <ClientListMock />}
                {s.screen === 'plan' && <ClientMock tab="Plan" wide={wide} />}
                {s.screen === 'report' && <ClientMock tab="Rapor" wide={wide} />}
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
        {!back && <Text style={{ fontSize: 12, fontWeight: '700', color: SOFT }}>ClinicApp</Text>}
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
      <Label>Danışanlar (0)</Label>
      <Block h={60} />
      <Label>Aileyi davet et</Label>
      <View style={[styles.block, { padding: 16, gap: 10 }]}>
        <View style={{ height: 34, borderRadius: 8, backgroundColor: FAINT }} />
        <View style={{ height: 40, borderRadius: 12, backgroundColor: BG }} />
        <View style={styles.target}>
          <Text style={styles.ctaText}>Aileyi davet et</Text>
          <Badge n={1} />
        </View>
      </View>
    </View>
  );
}

function ClientListMock() {
  return (
    <View style={{ gap: 8 }}>
      <Header title="Mavi Çocuk ve Aile Merkezi" sub="Dr. Elif Kaya · Klinik Psikolog" />
      <View style={[styles.block, { height: 56, backgroundColor: dim('#E6EAF5') }]} />
      <Label>Danışanlar (1)</Label>
      <View style={[styles.row, styles.ring]}>
        <View style={styles.avatar}><Text style={{ fontSize: 17, fontWeight: '800', color: '#2C4A9A' }}>N</Text></View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={{ fontSize: 16, fontWeight: '800', color: colors.navy }}>Nazlı</Text>
          <Text style={{ fontSize: 12, color: '#5B6274' }}>Ayşe · ebeveyn onayı</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#6B7286" />
        <Badge n={1} />
      </View>
      <Label>Aileyi davet et</Label>
      <Block h={150} />
    </View>
  );
}

const TABS = ['Özet', 'Rutin', 'Zor anlar', 'Plan', 'Notlar', 'Öneriler', 'Rapor'];

function ClientMock({ tab, wide }: { tab: 'Plan' | 'Rapor'; wide: boolean }) {
  const cols = wide ? 7 : 4;
  const at = TABS.indexOf(tab);
  const col = at % cols;
  const rows = [TABS.slice(0, cols), TABS.slice(cols)].filter((r) => r.length);
  return (
    <View style={{ gap: 8 }}>
      <Header title="Nazlı · Sabah rutini" sub="8 yaş · Sorumlu: sen" back />
      <View>
        <View style={[styles.tabs, { backgroundColor: FAINT }]}>
          {rows.map((r, ri) => (
            <View key={ri} style={{ flexDirection: 'row', gap: 4 }}>
              {Array.from({ length: cols }).map((_, ci) => {
                const t = r[ci];
                const on = t === tab;
                return (
                  <View key={ci} style={[styles.tab, on && styles.tabOn]}>
                    {!!t && <Text style={[styles.tabText, on && { color: colors.navy, fontWeight: '800' }]}>{t}</Text>}
                    {on && <Badge n={1} />}
                  </View>
                );
              })}
            </View>
          ))}
        </View>
        {/* ① → ② kesikli yol */}
        <View style={[styles.path, { left: `${((col + 0.5) / cols) * 100}%` }]} />
      </View>
      {tab === 'Plan' ? (
        <>
          <View style={[styles.target, { marginTop: 18 }]}>
            <Ionicons name="albums-outline" size={20} color="#fff" />
            <Text style={styles.ctaText}>Hazır paketle başla</Text>
            <Badge n={2} side="right" />
          </View>
          <Block h={92} />
          <Block h={92} />
        </>
      ) : (
        <View style={[styles.block, { padding: 16, gap: 12, marginTop: 18 }]}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: INK }}>Ev rutini gözlem raporu</Text>
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {['Baş harf', 'Tam ad', 'Etiket'].map((x) => (
              <View key={x} style={{ borderRadius: 8, paddingVertical: 5, paddingHorizontal: 9, backgroundColor: FAINT }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: INK }}>{x}</Text>
              </View>
            ))}
          </View>
          <View style={styles.target}>
            <Text style={styles.ctaText}>Raporu aç</Text>
            <Badge n={2} side="right" />
          </View>
        </View>
      )}
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
  tabs: { borderRadius: 14, padding: 4, gap: 4 },
  tab: { flex: 1, height: 38, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  tabOn: { ...ring, borderWidth: 3, backgroundColor: '#fff' },
  tabText: { fontSize: 13, fontWeight: '600', color: INK },
  path: { position: 'absolute', top: '100%', width: 0, height: 22, marginLeft: -1.5, borderLeftWidth: 3, borderColor: colors.gold, borderStyle: 'dashed' },
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
