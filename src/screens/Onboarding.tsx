import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, Modal, StyleSheet, Platform, Animated, AccessibilityInfo, useWindowDimensions,
  NativeSyntheticEvent, NativeScrollEvent, StyleProp, TextStyle, ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors } from '../theme';
import { track } from '../lib/track';
import { useLayout } from '../lib/layout';
import { FamilySeesPage } from './HelpSheet';

// "Nasıl kullanılır?" turu (kullanıcı isteği 24 Kasım 2026: soru-yanıt sayfası yerine, Moyo'nun (ParentApp) tanıtımı biçiminde
// kullanarak gösteren görsel tur: adım adım, az ve net yazı, "n / N"). Her adım uygulamanın bugünkü ekranının sade kopyasıdır;
// ekran karartılır, dokunulacak tek yer altın çerçeveyle aydınlık kalır; kartta birkaç kelimelik başlık + tek kısa cümle,
// "n / N", Geri / İleri, Atla. Dokunmatik ekranda yana kaydırılır; web'de ok tuşları da çalışır.
// Altı özellik, sırayla: davet · ana ekrandaki pano · Ev Rutinleri (rutin önerme) · Davranışlar ve Olaylar (hedef davranış) ·
// seans / takvim · rapor ("Aileye gönder"); yedinci adım kapanış: "Örnek aileyle dene" (yaptırarak öğreten tur, SampleTour.tsx),
// "Bitir" ve "Aile neyi görür?". Takip Planı ve ebeveyn eğitimi (uzaktan ayar bayrakları) açık olsa da tur aynıdır.
// 26 Ekim ve 3 Kasım 2026'nın 4 ekranlık "Kısa tanıtım"ı bu turla birleşti (ayrı giriş yok).
// Ekranlar değişince buradaki kopyalar da güncellenir (ClientBoard, ClientScreen menüsü, HomeRoutines, BehaviorsTab,
// CalendarScreen + SessionSheet, ReportTab).

const KEY = (userId: string) => `clinic.onboarding.v1.${userId}`;
export const onboardingSeen = async (userId: string) => {
  try { return (await AsyncStorage.getItem(KEY(userId))) === '1'; } catch { return true; }
};
export const markOnboardingSeen = (userId: string) => AsyncStorage.setItem(KEY(userId), '1').catch(() => {});

type StepId = 'invite' | 'board' | 'routine' | 'behavior' | 'session' | 'report' | 'done';
// need: dar düzende hedefin alt kenarının sayfanın üstünden uzaklığı (yaklaşık). Ekran kısaysa sayfa o kadar yukarı alınır,
// hedef kartın altında kalmaz.
type Step = { id: StepId; title: string; line: string; need: number };
const STEPS: Step[] = [
  { id: 'invite', title: 'Aileyi davet et', line: 'Ana ekranda "Aileyi davet et"e dokun, ebeveynin e-postasını yaz.', need: 330 },
  { id: 'board', title: 'Kimde ne var?', line: 'Yeni kayıt giren aileler üstte, 7 gündür sessiz kalanlar altta durur.', need: 480 },
  { id: 'routine', title: 'Rutin öner', line: 'Ev Rutinleri\'nde "Aileye öner"e dokun, hazır bir rutin seç.', need: 320 },
  { id: 'behavior', title: 'Hedef davranış ekle', line: 'Davranışı ve stratejileri yaz, ebeveyn olayları Moyo\'dan bildirsin.', need: 280 },
  { id: 'session', title: 'Seans planla', line: 'Takvim\'de "+ Seans"a dokun, saati ve istersen ücreti yaz.', need: 60 },
  { id: 'report', title: 'Raporu aileye gönder', line: 'Önce raporu aç ve gözden geçir, sonra "Aileye gönder"e dokun.', need: 520 },
  { id: 'done', title: 'Hazırsın', line: 'Örnek aile Deniz\'le hepsini kendin dene.', need: 310 },
];
const N = STEPS.length;

// Karartma: rengi %60 lacivertle karıştırır (katman yerine; aydınlık kalan hedef ölçüm gerektirmez, yerinden kaymaz)
const DIM = 0.6;
const NAVY = [15, 27, 61];
function dim(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v, i) => Math.round(v * (1 - DIM) + NAVY[i] * DIM));
  return `rgb(${c.join(',')})`;
}
const BG = dim(colors.bg);
const WHITE = '#FFFFFF';

// plan / training: yalnız "Aile neyi görür?" sayfasının içeriği için (tur adımları bayraklara bakmaz)
export default function HelpTour({ visible, plan = true, training = true, onClose, onSample }: {
  visible: boolean; plan?: boolean; training?: boolean; onClose: () => void; onSample: () => void;
}) {
  const { width, height } = useWindowDimensions();
  const { desktop } = useLayout();
  const [index, setIndex] = useState(0);
  const [sees, setSees] = useState(false);
  const [box, setBox] = useState({ w: 0, h: 0 });        // adım sayfasının alanı
  const scroller = useRef<ScrollView>(null);
  // Hareket azaltma ayarı okunmadan pencere açılmaz: geçiş türü pencere açıkken değişirse web'de açılış tamamlanmış sayılmıyor
  // (Esc ile kapanmıyordu). Tür, pencere açılırken bir kez seçilir.
  const reduce = useReduceMotion();
  const [shown, setShown] = useState<'fade' | 'none' | null>(null);
  useEffect(() => {
    if (!visible) setShown(null);
    else if (reduce !== null) setShown((s) => s ?? (reduce ? 'none' : 'fade'));
  }, [visible, reduce]);
  const anim = useRef<'fade' | 'none'>('fade');
  if (shown) anim.current = shown;
  const pulse = usePulse(visible && reduce === false);
  const pw = box.w || width;
  const last = index === N - 1;
  const twoPane = width >= 1000;                        // geniş ekran: kart solda, ekran kopyası sağda (üst üste gelmez)

  useEffect(() => { if (visible) { setIndex(0); setSees(false); } }, [visible]);
  // alan değişince (döndürme, pencere boyu) açık adım yerinde kalsın
  useEffect(() => { scroller.current?.scrollTo({ x: index * pw, animated: false }); }, [pw]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (i: number) => {
    if (i < 0 || i >= N) return;
    scroller.current?.scrollTo({ x: i * pw, animated: reduce === false });
    setIndex(i);
  };
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / Math.max(1, pw));
    if (i !== index && i >= 0 && i < N) setIndex(i);
  };
  // kapanış: hangi adımda ve nasıl (atla / bitir / örnek aile)
  const finish = (end: 'skip' | 'done' | 'sample') => {
    track('help.tour', { step: index + 1, end });
    if (end === 'sample') onSample(); else onClose();
  };
  const back = () => (sees ? setSees(false) : finish(last ? 'done' : 'skip'));

  // Web: ok tuşlarıyla ileri / geri
  const nav = useRef({ index, go, sees });
  nav.current = { index, go, sees };
  useEffect(() => {
    if (Platform.OS !== 'web' || !visible || typeof window === 'undefined') return;
    const onKey = (e: KeyboardEvent) => {
      if (nav.current.sees) return;
      if (e.key === 'ArrowRight') nav.current.go(nav.current.index + 1);
      if (e.key === 'ArrowLeft') nav.current.go(nav.current.index - 1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [visible]);

  const step = STEPS[index];
  const card = (
    <View style={[styles.card, twoPane && { maxWidth: 380 }]}>
      <View style={styles.cardTop}>
        <Text style={styles.count} accessibilityLabel={`Adım ${index + 1} / ${N}`}>{index + 1} / {N}</Text>
        {last ? (
          <Pressable onPress={() => { track('help.sees'); setSees(true); }} hitSlop={8} style={styles.skip} accessibilityRole="button">
            <Text style={styles.seesText}>Aile neyi görür?</Text>
          </Pressable>
        ) : (
          <Pressable onPress={() => finish('skip')} hitSlop={8} style={styles.skip} accessibilityRole="button" accessibilityLabel="Turu atla">
            <Text style={styles.skipText}>Atla</Text>
          </Pressable>
        )}
      </View>
      <View accessibilityLiveRegion="polite" style={{ gap: 6 }}>
        <Text style={styles.title} accessibilityRole="header">{step.title}</Text>
        <Text style={styles.line}>{step.line}</Text>
      </View>
      <View style={styles.actions}>
        {!last && (
          <View style={styles.dots}>
            {STEPS.map((s, i) => (
              <Pressable key={s.id} onPress={() => go(i)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${i + 1}. adım: ${s.title}`}
                accessibilityState={{ selected: i === index }}>
                <View style={[styles.dot, i === index && styles.dotOn]} />
              </Pressable>
            ))}
          </View>
        )}
        <View style={styles.buttons}>
          {index > 0 && (
            <Pressable onPress={() => go(index - 1)} style={styles.ghost} accessibilityRole="button">
              <Text style={styles.ghostText}>Geri</Text>
            </Pressable>
          )}
          {last ? (
            <>
              <Pressable onPress={() => finish('done')} style={styles.ghost} accessibilityRole="button">
                <Text style={styles.ghostText}>Bitir</Text>
              </Pressable>
              <Pressable onPress={() => finish('sample')} style={styles.next} accessibilityRole="button">
                <Text style={styles.nextText}>Örnek aileyle dene</Text>
              </Pressable>
            </>
          ) : (
            <Pressable onPress={() => go(index + 1)} style={styles.next} accessibilityRole="button">
              <Text style={styles.nextText}>İleri</Text>
              <Ionicons name="arrow-forward" size={16} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );

  // Ekran kopyaları süsleme sayılır: ekran okuyucu yalnız kartı okur
  const pager = (
    <View style={{ flex: 1, minWidth: 0 }} onLayout={(e) => setBox({ w: Math.round(e.nativeEvent.layout.width), h: Math.round(e.nativeEvent.layout.height) })}
      aria-hidden accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <ScrollView ref={scroller} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={32} style={{ flex: 1 }}>
        {STEPS.map((s) => (
          <View key={s.id} style={{ width: pw, overflow: 'hidden' }}>
            <View style={[styles.page, { marginTop: -Math.max(0, s.need + 28 - (box.h || height)) }, home(s.id) && styles.pageHome]}>
              <Scene id={s.id} sidebar={desktop} single={width >= 1000} />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <Modal visible={shown !== null} animationType={anim.current} onRequestClose={back} statusBarTranslucent>
      <Pulse.Provider value={pulse}>
        <SafeAreaView style={{ flex: 1, backgroundColor: BG }} edges={['top', 'bottom']}>
          {twoPane ? (
            <View style={{ flex: 1, flexDirection: 'row' }}>
              <View style={styles.rail}>{card}</View>
              {pager}
            </View>
          ) : (
            <>
              {pager}
              <View style={styles.cardWrap}>{card}</View>
            </>
          )}
        </SafeAreaView>
        {sees && <FamilySeesPage plan={plan} training={training} onBack={() => setSees(false)} />}
      </Pulse.Provider>
    </Modal>
  );
}

// ana ekranın kopyaları (tek sütun, ortada); ötekiler danışan / takvim ekranı
const home = (id: StepId) => id === 'invite' || id === 'board' || id === 'done';

// null: henüz okunmadı
function useReduceMotion() {
  const [reduce, setReduce] = useState<boolean | null>(null);
  useEffect(() => {
    let live = true;
    const asked = AccessibilityInfo.isReduceMotionEnabled?.();
    if (!asked) setReduce(false);
    else asked.then((v) => { if (live) setReduce(!!v); }).catch(() => { if (live) setReduce(false); });
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => { live = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

// Hedefin çevresindeki hale yavaşça nabız atar; hareket azaltma açıksa sabit
function usePulse(on: boolean) {
  const v = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!on) { v.setValue(1); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(v, { toValue: 0.25, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
      Animated.timing(v, { toValue: 1, duration: 900, useNativeDriver: Platform.OS !== 'web' }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [on, v]);
  return v;
}

/* ---------- Yapı taşları: aydınlık (Lit) değilse her renk karartılır ---------- */

const Lit = createContext(false);
const Pulse = createContext<Animated.Value | null>(null);
type Icon = keyof typeof Ionicons.glyphMap;
function useTone() {
  const lit = useContext(Lit);
  return (hex: string) => (lit ? hex : dim(hex));
}

function T({ children, s = 14, w = '500', c = colors.navy, n, style }: {
  children: React.ReactNode; s?: number; w?: '400' | '500' | '600' | '700' | '800'; c?: string; n?: number; style?: StyleProp<TextStyle>;
}) {
  const tone = useTone();
  return <Text numberOfLines={n} style={[{ fontSize: s, fontWeight: w, color: tone(c) }, style]}>{children}</Text>;
}
function Ico({ name, size = 18, c = colors.navy }: { name: Icon; size?: number; c?: string }) {
  const tone = useTone();
  return <Ionicons name={name} size={size} color={tone(c)} />;
}
function Box({ bg = WHITE, line, style, children }: { bg?: string; line?: string; style?: StyleProp<ViewStyle>; children?: React.ReactNode }) {
  const tone = useTone();
  return <View style={[{ backgroundColor: tone(bg) }, !!line && { borderWidth: 1, borderColor: tone(line) }, style]}>{children}</View>;
}
const Round = ({ icon, bg }: { icon: Icon; bg?: string }) => <Box bg={bg} style={styles.round}><Ico name={icon} /></Box>;
const Glow = ({ children }: { children: React.ReactNode }) => <Lit.Provider value>{children}</Lit.Provider>;

// Hedef: aydınlık kalır; arkasında altın çerçeve ve nabız atan hale. r = içindeki öğenin köşe yarıçapı
function Spot({ r = 14, style, children }: { r?: number; style?: StyleProp<ViewStyle>; children: React.ReactNode }) {
  const pulse = useContext(Pulse);
  return (
    <View style={style}>
      <Animated.View pointerEvents="none" style={[styles.halo, { borderRadius: r + 11, opacity: pulse ?? 1 }]} />
      <View pointerEvents="none" style={[styles.ring, { borderRadius: r + 4 }]} />
      <Glow>{children}</Glow>
    </View>
  );
}

const Cta = ({ label, icon }: { label: string; icon?: Icon }) => (
  <Box bg={colors.navy} style={styles.cta}>
    {!!icon && <Ico name={icon} c={WHITE} />}
    <T s={15} w="700" c={WHITE}>{label}</T>
  </Box>
);
const Field = ({ children }: { children: string }) => <T s={13} w="600" style={{ marginTop: 4 }}>{children}</T>;
const Input = ({ value, ghost, style }: { value: string; ghost?: boolean; style?: StyleProp<ViewStyle> }) => (
  <Box line={colors.line} style={[styles.input, style]}><T s={15} c={ghost ? colors.muted : colors.navy} n={1}>{value}</T></Box>
);
const Sec = ({ children }: { children: string }) => <T s={11} w="700" c="#6B7387" style={styles.sec}>{children}</T>;
const Label = ({ children }: { children: string }) => <T s={13} w="600" c={colors.muted} style={{ marginTop: 6 }}>{children}</T>;

function Scene({ id, sidebar, single }: { id: StepId; sidebar: boolean; single: boolean }) {
  if (id === 'invite') return <InviteScene />;
  if (id === 'board') return <BoardScene />;
  if (id === 'session') return <SessionScene />;
  if (id === 'done') return <DoneScene />;
  const active = id === 'routine' ? 'Ev Rutinleri' : id === 'behavior' ? 'Davranışlar ve Olaylar' : 'Rapor';
  return (
    <ClientFrame active={active} sidebar={sidebar} single={single}>
      {id === 'routine' ? <RoutineScene /> : id === 'behavior' ? <BehaviorScene /> : <ReportScene />}
    </ClientFrame>
  );
}

/* ---------- 1 · Davet: ana ekran › "Aileyi davet et" penceresi ---------- */

function InviteScene() {
  return (
    <View style={{ gap: 8 }}>
      <View style={styles.sheetHead}>
        <Round icon="close" />
        <T s={17} w="700">Aileyi davet et</T>
      </View>
      <T s={13} c={colors.muted}>Davet senin adınla e-postayla gider. Davet 3 gün geçerli.</T>
      <Label>Ebeveynin e-postası</Label>
      <Input value="ayse@ornek.com" />
      <Label>Çocuğun adı (isteğe bağlı)</Label>
      <Input value="Ör. Efe" ghost />
      <Spot r={14} style={{ marginTop: 14 }}><Cta label="E-posta gönder" /></Spot>
    </View>
  );
}

/* ---------- 2 · Ana ekrandaki pano: Ebeveynden yeni · Sessiz kalanlar ---------- */

function HomeHead() {
  return (
    <View style={styles.head}>
      <View style={{ flex: 1, gap: 2 }}>
        <T s={12} w="700" c={colors.muted} style={{ letterSpacing: 1 }}>Moyo Mercek</T>
        <T s={21} w="700">Mavi Çocuk ve Aile Merkezi</T>
      </View>
      <Round icon="notifications-outline" />
      <Box bg={colors.navy} style={styles.avatar}><T s={12} w="700" c={WHITE}>DE</T></Box>
    </View>
  );
}

function ClientRow({ name, parent, chip, seen, small }: { name: string; parent: string; chip?: [Icon, string]; seen?: boolean; small?: string }) {
  return (
    <Box style={styles.row}>
      <Box bg={colors.today} style={styles.initial}><T s={16} w="700">{name[0]}</T></Box>
      <View style={{ flex: 1, minWidth: 0, gap: 3 }}>
        <T s={15} w="600">{name}</T>
        <T s={13} n={1}>Ebeveyn: {parent}</T>
        {!!chip && (
          <View style={[styles.inline, { gap: 8, rowGap: 4, flexWrap: 'wrap' }]}>
            <Box bg="#F1F3F7" style={styles.reason}>
              <Ico name={chip[0]} size={12} />
              <T s={11.5} w="600" style={{ flexShrink: 1 }}>{chip[1]}</T>
            </Box>
            {seen && <T s={12} w="700" style={{ textDecorationLine: 'underline' }}>Gördüm</T>}
          </View>
        )}
        {!!small && <T s={12} c={colors.muted} n={1}>{small}</T>}
      </View>
      <Ico name="chevron-forward" c={colors.faint} />
    </Box>
  );
}

function BoardScene() {
  return (
    <View style={{ gap: 8 }}>
      <HomeHead />
      <Box bg={colors.today} style={styles.member}>
        <Ico name="calendar-outline" size={20} />
        <View style={{ flex: 1 }}>
          <T s={15} w="700">Takvim</T>
          <T s={12} c={colors.muted}>Bugün 2 seans</T>
        </View>
        <Ico name="chevron-forward" c={colors.muted} />
      </Box>
      <Label>Danışanlar (3)</Label>
      <Spot r={16} style={{ marginTop: 4 }}>
        <Box bg={colors.bg} style={styles.board}>
          <Sec>Ebeveynden yeni · 1</Sec>
          <ClientRow name="Nazlı" parent="Ayşe" chip={['pulse-outline', '2 davranış kaydı · bugün']} seen />
          <Sec>Sessiz kalanlar · 1</Sec>
          <ClientRow name="Arda" parent="Mehmet" chip={['moon-outline', '9 gündür kayıt yok']} small="Uzman: Mert Aydın" />
        </Box>
      </Spot>
      <View style={{ marginTop: 6, gap: 6 }}>
        <Sec>Diğer danışanlar · 1</Sec>
        <ClientRow name="Ece" parent="Zeynep" small="Ebeveyn onayı: 3 Kasım 2026" />
      </View>
    </View>
  );
}

/* ---------- Danışan ekranı: geniş düzende sol menü (Planla · Takip), dar düzende bölüm seçici ---------- */

const PLAN = ['Seanslar', 'Notlar', 'Rapor', 'Danışan Bilgileri'];
const WATCH = ['Davranışlar ve Olaylar', 'Ev Rutinleri', 'Özet'];
const NAV_ICON: Record<string, Icon> = {
  Seanslar: 'calendar-outline', Notlar: 'create-outline', Rapor: 'print-outline', 'Danışan Bilgileri': 'person-circle-outline',
  'Davranışlar ve Olaylar': 'locate-outline', 'Ev Rutinleri': 'repeat-outline', Özet: 'grid-outline',
};

function ClientFrame({ active, sidebar, single, children }: { active: string; sidebar: boolean; single: boolean; children: React.ReactNode }) {
  const head = (
    <View style={styles.head}>
      <Round icon="menu" />
      {!sidebar && <Round icon="chevron-back" />}
      <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
        <T s={19} w="700">Nazlı</T>
        <T s={12} c={colors.muted} n={1}>8 yaş · Ebeveyn: Ayşe</T>
      </View>
      <Round icon="notifications-outline" />
    </View>
  );
  // açık bölüm aydınlık (çerçevesiz): nerede olduğun görünür
  const item = (label: string, cell: boolean) => {
    const on = label === active;
    const body = cell ? (
      <Box key={label} bg={on ? WHITE : '#ECEEF3'} style={styles.gridItem}>
        <T s={12} w={on ? '700' : '500'} c={on ? colors.navy : colors.muted} n={2} style={{ textAlign: 'center', flexShrink: 1 }}>{label}</T>
      </Box>
    ) : (
      <Box key={label} bg={on ? colors.today : '#FAFBFC'} style={styles.nav}>
        <Ico name={NAV_ICON[label]} size={16} c={on ? colors.navy : colors.muted} />
        <T s={13} w={on ? '700' : '500'} style={{ flexShrink: 1 }}>{label}</T>
      </Box>
    );
    return on ? <Glow key={label}>{body}</Glow> : body;
  };
  if (sidebar) {
    return (
      <View style={{ flexDirection: 'row', gap: 16 }}>
        <Box bg="#FAFBFC" style={styles.side}>
          <View style={[styles.inline, { paddingHorizontal: 6 }]}>
            <Ico name="chevron-back" size={14} />
            <T s={12} w="600">Tüm Danışanlar</T>
          </View>
          <Box line={colors.line} style={styles.switch}>
            <T s={14} w="700">Nazlı</T>
            <Ico name="chevron-down" size={14} c={colors.muted} />
          </Box>
          {([['Planla', PLAN], ['Takip', WATCH]] as [string, string[]][]).map(([g, items]) => (
            <View key={g} style={{ gap: 2 }}>
              <T s={10.5} w="700" c={colors.muted} style={styles.group}>{g}</T>
              {items.map((x) => item(x, false))}
            </View>
          ))}
        </Box>
        <View style={{ flex: 1, minWidth: 0, gap: 10 }}>{head}{children}</View>
      </View>
    );
  }
  const rows = single ? [[...PLAN, ...WATCH]] : [PLAN, WATCH];
  return (
    <View style={{ gap: 10 }}>
      {head}
      <Box bg="#ECEEF3" style={styles.grid}>
        {rows.map((row, i) => <View key={i} style={styles.gridRow}>{row.map((x) => item(x, true))}</View>)}
      </Box>
      {children}
    </View>
  );
}

const Segments = ({ items }: { items: string[] }) => (
  <Box bg="#ECEEF3" style={styles.seg}>
    {items.map((x, i) => (
      <Box key={x} bg={i === 0 ? WHITE : '#ECEEF3'} style={styles.segItem}>
        <T s={13} w={i === 0 ? '700' : '500'} c={i === 0 ? colors.navy : colors.muted} n={1}>{x}</T>
      </Box>
    ))}
  </Box>
);

/* ---------- 3 · Ev Rutinleri: "+ Aileye öner" ---------- */

const DAYS = ['Ça', 'Pe', 'Cu', 'Ct', 'Pz', 'Pt', 'Sa'];
const WEEK: { title: string; done: number; cells: string }[] = [
  { title: 'Yatağını topla', done: 5, cells: 'vxvvvvo' },
  { title: 'Dişlerini fırçala', done: 7, cells: 'vvvvvvv' },
];
const CELL: Record<string, { icon: Icon; c: string }> = {
  v: { icon: 'checkmark-circle', c: colors.ok }, x: { icon: 'close', c: colors.faint }, o: { icon: 'ellipse-outline', c: colors.faint },
};

function RoutineScene() {
  return (
    <>
      <Segments items={['Haftalık', 'Zaman İçinde', 'Oranlar']} />
      <View style={[styles.inline, { gap: 10, rowGap: 14, flexWrap: 'wrap', marginTop: 2 }]}>
        <Box line={colors.line} style={styles.add}>
          <Ico name="download-outline" size={15} />
          <T s={13} w="600">İndir (CSV)</T>
        </Box>
        <Box line={colors.line} style={styles.add}>
          <Ico name="paper-plane-outline" size={15} />
          <T s={13} w="600">Gönderilenler (1)</T>
        </Box>
        <Spot r={20}>
          <Box bg={colors.navy} style={styles.add}>
            <Ico name="add" c={WHITE} />
            <T s={14} w="700" c={WHITE}>Aileye öner</T>
          </Box>
        </Spot>
      </View>
      <Box style={styles.cardBox}>
        <View style={styles.weekRow}>
          <T s={11} w="600" c={colors.muted} style={{ flex: 1 }}>Adım</T>
          {DAYS.map((d) => <View key={d} style={styles.cell}><T s={11} w="600" c={colors.muted}>{d}</T></View>)}
        </View>
        {WEEK.map((r) => (
          <View key={r.title} style={styles.weekRow}>
            <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
              <T s={13} w="600" n={1}>{r.title}</T>
              <T s={11} c={colors.muted}>Son 7 gün: {r.done}</T>
            </View>
            {r.cells.split('').map((k, i) => <View key={i} style={styles.cell}><Ico name={CELL[k].icon} size={k === 'x' ? 13 : 17} c={CELL[k].c} /></View>)}
          </View>
        ))}
      </Box>
    </>
  );
}

/* ---------- 4 · Davranışlar ve Olaylar: "+ Hedef davranış ekle" ---------- */

function BehaviorCard({ title, sub, right }: { title: string; sub: string; right?: string }) {
  return (
    <Box line={colors.line} style={styles.bcard}>
      <Ico name="chevron-forward" />
      <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
        <T s={15} w="700">{title}</T>
        <T s={12} c={colors.muted}>{sub}</T>
      </View>
      {right ? <T s={12} c={colors.muted}>{right}</T> : <Ico name="settings-outline" />}
    </Box>
  );
}

function BehaviorScene() {
  return (
    <>
      <View style={[styles.inline, { gap: 10 }]}>
        <Round icon="locate-outline" />
        <T s={17} w="700" style={{ flex: 1 }}>Hedef davranışlar ve bildirilen olaylar</T>
      </View>
      <View style={{ flexDirection: 'row', marginTop: 2 }}>
        <Spot r={14}><Box bg={colors.navy} style={[styles.cta, { paddingHorizontal: 18 }]}><T s={15} w="700" c={WHITE}>+ Hedef davranış ekle</T></Box></Spot>
      </View>
      <BehaviorCard title="Ekranı kapatırken ağlama" sub="Başlangıç: 3 Kas · 4 olay" />
      <BehaviorCard title="Diğer bildirilen olaylar" sub="Hedefe bağlı olmayan olaylar ve davranış kayıtları" right="9 kayıt" />
    </>
  );
}

/* ---------- 5 · Takvim: "+ Seans" → "Yeni seans" penceresi (ücret) ---------- */

function SessionScene() {
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.head}>
        <Round icon="chevron-back" />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T s={19} w="700">Takvim</T>
          <T s={12} c={colors.muted} n={1}>26 Kasım 2026, Perşembe</T>
        </View>
        <Round icon="settings-outline" />
        <Spot r={18}><Box bg={colors.navy} style={styles.pill}><T s={13} w="700" c={WHITE}>+ Seans</T></Box></Spot>
      </View>
      {/* "+ Seans"a dokununca açılan pencere */}
      <Box style={styles.sheet}>
        <View style={styles.sheetHead}>
          <Round icon="close" bg={colors.bg} />
          <T s={17} w="700">Yeni seans</T>
        </View>
        <Field>Danışan</Field>
        <Box line={colors.line} style={[styles.input, styles.inline, { gap: 8 }]}>
          <Ico name="person-outline" size={16} />
          <T s={15} style={{ flex: 1 }}>Nazlı</T>
          <T s={13} w="700" style={{ textDecorationLine: 'underline' }}>Değiştir</T>
        </Box>
        <Field>Tarih ve saat</Field>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Input value="26.11.2026" style={{ flex: 1 }} />
          <Input value="15:00" style={{ width: 86 }} />
        </View>
        <Field>Ücret (TL)</Field>
        <Input value="450" />
        <T s={12} c={colors.muted}>Aile de Moyo'da görür.</T>
      </Box>
    </View>
  );
}

/* ---------- 6 · Rapor: "Raporu aç", sonra "Aileye gönder" ---------- */

function ReportScene() {
  return (
    <>
      <Label>Ev rutini gözlem raporu (4 hafta)</Label>
      <Box style={styles.cardBox}>
        <T s={13} n={2}>Haftalık rutin kartı, adım tabloları ve davranış kaydı özeti.</T>
        <Cta label="Raporu aç" />
      </Box>
      <Label>Raporu aileye gönder</Label>
      <Box style={styles.cardBox}>
        <T s={13} n={2}>Rapor ailenin Moyo uygulamasına gider.</T>
        <Input value="Ev rutini gözlem raporu" />
        <Spot r={14}><Cta label="Aileye gönder" /></Spot>
      </Box>
    </>
  );
}

/* ---------- 7 · Kapanış: örnek aile Deniz ---------- */

function DoneScene() {
  return (
    <View style={{ gap: 8 }}>
      <HomeHead />
      <Label>Danışanlar (3)</Label>
      <ClientRow name="Nazlı" parent="Ayşe" chip={['pulse-outline', '2 davranış kaydı · bugün']} seen />
      <Spot r={16} style={{ marginTop: 8 }}>
        <Box line={colors.faint} style={[styles.row, { borderStyle: 'dashed' }]}>
          <Box bg={colors.today} style={styles.initial}><T s={16} w="700">D</T></Box>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <View style={[styles.inline, { gap: 8 }]}>
              <T s={15} w="600">Deniz</T>
              <Box bg={colors.today} style={styles.tag}><T s={11} w="700">Örnek aile</T></Box>
            </View>
            <T s={12} c={colors.muted}>Gerçek değil; ekranların nasıl görüneceğini gösterir</T>
          </View>
          <Ico name="chevron-forward" c={colors.faint} />
        </Box>
      </Spot>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { width: '100%', maxWidth: 1040, alignSelf: 'center', paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  pageHome: { maxWidth: 600 },
  rail: { width: 420, paddingLeft: 32, paddingRight: 8, justifyContent: 'center' },
  cardWrap: { paddingHorizontal: 16, paddingBottom: 16, paddingTop: 4, alignItems: 'center' },
  card: { width: '100%', maxWidth: 520, backgroundColor: '#fff', borderRadius: 22, padding: 18, gap: 10, shadowColor: '#000', shadowOpacity: 0.25, shadowRadius: 20, shadowOffset: { width: 0, height: 12 }, elevation: 8 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  count: { fontSize: 12, fontWeight: '700', color: '#6B5300', backgroundColor: '#FFF6DE', borderRadius: 10, paddingHorizontal: 9, paddingVertical: 3, overflow: 'hidden' },
  skip: { minHeight: 44, minWidth: 44, alignItems: 'flex-end', justifyContent: 'center' },
  skipText: { fontSize: 14, fontWeight: '600', color: '#5B6274' },
  seesText: { fontSize: 14, fontWeight: '700', color: colors.navy, textDecorationLine: 'underline' },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy },
  line: { fontSize: 15, lineHeight: 21, color: '#4A5165' },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginTop: 4 },
  buttons: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', flexWrap: 'wrap', gap: 8, flexGrow: 1, flexShrink: 1 },
  next: { height: 46, paddingHorizontal: 16, borderRadius: 23, backgroundColor: colors.navy, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  nextText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ghost: { height: 46, paddingHorizontal: 14, borderRadius: 23, borderWidth: 1.5, borderColor: colors.line, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  ghostText: { color: colors.navy, fontSize: 14, fontWeight: '700' },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#D5D9E2' },
  dotOn: { width: 18, backgroundColor: colors.navy },

  halo: { position: 'absolute', left: -11, top: -11, right: -11, bottom: -11, backgroundColor: 'rgba(233,178,43,0.38)' },
  ring: { position: 'absolute', left: -4, top: -4, right: -4, bottom: -4, backgroundColor: colors.gold },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  sheetHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  cta: { height: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  input: { height: 46, borderRadius: 12, paddingHorizontal: 12, justifyContent: 'center' },
  sec: { letterSpacing: 0.8, textTransform: 'uppercase' },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, padding: 14 },
  board: { borderRadius: 16, padding: 10, gap: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 12 },
  initial: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 1 },
  tag: { borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 },
  side: { width: 196, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 14, gap: 4, alignSelf: 'flex-start' },
  switch: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginVertical: 6 },
  group: { textTransform: 'uppercase', letterSpacing: 0.6, paddingHorizontal: 10, marginTop: 8, marginBottom: 2 },
  nav: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10 },
  grid: { borderRadius: 10, padding: 3, gap: 3 },
  gridRow: { flexDirection: 'row', gap: 3 },
  gridItem: { flex: 1, minWidth: 0, minHeight: 38, alignItems: 'center', justifyContent: 'center', paddingVertical: 6, paddingHorizontal: 4, borderRadius: 8 },
  seg: { flexDirection: 'row', borderRadius: 10, padding: 3, gap: 3 },
  segItem: { flex: 1, minWidth: 0, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  add: { height: 40, borderRadius: 20, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 6 },
  pill: { height: 36, borderRadius: 18, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center' },
  cardBox: { borderRadius: 16, padding: 14, gap: 10 },
  weekRow: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  cell: { width: 26, alignItems: 'center' },
  bcard: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, padding: 14 },
  sheet: { borderTopLeftRadius: 20, borderTopRightRadius: 20, borderBottomLeftRadius: 16, borderBottomRightRadius: 16, padding: 16, gap: 8 },
});
