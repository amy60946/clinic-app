import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform, Animated, AccessibilityInfo } from 'react-native';
import { colors, radius } from '../theme';

// Yaptırarak öğreten tur (kullanıcı istekleri 3 Kasım 2026: "yazılar kısa, hangi tuşla yapılacağı akışta, ekranın geri kalanına
// hafif siyah perde, önemli kısımları örnek çocuk üzerinden yaptır"; "insanlar yazı okumuyor, gösterimi önceliklendir — Plana ekle,
// hedefe bağla gibi pencere içindeki yerleri de perdeyle göster"). İşleyiş referansı: etkileşimli yürüyüş (Appcues / Userpilot /
// Chameleon "interactive walkthrough"): her adım tek bir yeri vurgular, kullanıcı oraya dokununca ilerler.
//  · CoachTarget: vurgulanabilecek öğeyi sarar (kimlik + ekranda görünen ad).
//  · CoachOverlay: ekranda hedefin çevresine perde (dört dikdörtgen; delikten dokunuş geçer), nabız atan altın çerçeve, kısa kart.
//  · CoachSheetOverlay: aynısı açılan pencerenin (Modal) içinde; adımın o pencere için sıralı alt adımları (göster → dokun).
//  · useCoachEmit: ekranlar olay bildirir ("goal_added", "rated" …); adımın ya da alt adımın beklediği olaysa ilerler.
// Tur kapalıyken sağlayıcı değer vermez: hedefler yalnız çocuklarını çizer, olaylar boşa gider.

export type SubStep = {
  target: string; title: string; text?: string;
  info?: boolean;                     // yalnız gösterir: kartta "Tamam"
  until?: string;                     // bu olayla bir sonraki alt adıma geçer (ör. puan seçildi)
};
export type CoachStep = {
  key: string;
  tab?: string;                       // adım başlarken açılacak danışan bölümü
  target?: string;                    // vurgulanacak CoachTarget kimliği; yoksa kart ortada, perde tam
  title: string;
  text: string;                       // kısa; **kalın** = dokunulacak tuş; {label} = hedefin ekrandaki adı
  until?: string;                     // adımı bitiren olay; yoksa kartta "İleri"
  sheets?: Record<string, SubStep[]>; // pencere anahtarı → o pencerede sırayla gösterilecek yerler
  final?: boolean;
};
type Entry = { ref: React.RefObject<View | null>; label?: string };
type Ctx = {
  steps: CoachStep[]; index: number; step: CoachStep; counted: number;
  entries: React.MutableRefObject<Record<string, Entry>>;
  register: (id: string, e: Entry) => () => void;
  emit: (event: string) => void;
  sub: Record<string, number>; subNext: (sheet: string) => void;
  next: () => void; close: () => void; finish: () => void;
};
const CoachCtx = createContext<Ctx | null>(null);
export function useCoachEmit() {
  const c = useContext(CoachCtx);
  return useCallback((e: string) => { c?.emit(e); }, [c]);
}

export function CoachProvider({ steps, index, onIndex, onClose, onFinish, children }: {
  steps: CoachStep[]; index: number | null; onIndex: (i: number) => void; onClose: (index: number) => void; onFinish: () => void;
  children: React.ReactNode;
}) {
  const entries = useRef<Record<string, Entry>>({});
  const [sub, setSub] = useState<Record<string, number>>({});
  useEffect(() => { setSub({}); }, [index]);
  const value = useMemo<Ctx | null>(() => {
    if (index === null) return null;
    const step = steps[Math.min(index, steps.length - 1)];
    const subNext = (sheet: string) => setSub((x) => ({ ...x, [sheet]: (x[sheet] ?? 0) + 1 }));
    return {
      steps, index, step, entries, sub, subNext,
      counted: steps.filter((s) => s.until).length,
      register: (id, e) => { entries.current[id] = e; return () => { if (entries.current[id] === e) delete entries.current[id]; }; },
      emit: (event) => {
        if (step.until === event) return onIndex(index + 1);
        Object.entries(step.sheets ?? {}).forEach(([k, list]) => { if (list[sub[k] ?? 0]?.until === event) subNext(k); });
      },
      next: () => onIndex(index + 1),
      close: () => onClose(index),
      finish: onFinish,
    };
  }, [steps, index, sub, onIndex, onClose, onFinish]);
  return <CoachCtx.Provider value={value}>{children}</CoachCtx.Provider>;
}

export function CoachTarget({ id, label, children, style }: { id: string; label?: string; children: React.ReactNode; style?: object }) {
  const c = useContext(CoachCtx);
  const ref = useRef<View>(null);
  const register = c?.register;
  useEffect(() => (register ? register(id, { ref, label }) : undefined), [register, id, label]);
  // style (ör. üst boşluk) sarıcıda durur ki çerçeve yalnız öğeyi sarsın; tur kapalıyken de aynı yerleşim
  if (!c) return style ? <View style={style}>{children}</View> : <>{children}</>;
  return <View ref={ref} collapsable={false} style={style}>{children}</View>;
}

// **kalın** parçalar
function Rich({ text, style, bold }: { text: string; style: object; bold: object }) {
  const parts = text.split('**');
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={bold}>{p}</Text> : p))}</Text>;
}

type Rect = { x: number; y: number; w: number; h: number };
const PAD = 6;
const DIM = 'rgba(8, 12, 24, 0.5)';

// Hedefin yeri: kaydırma ve yerleşim değişebildiği için tur açıkken kısa aralıkla ölçülür; web'de ekran dışındaysa bir kez kaydırılır
function useTargetRect(c: Ctx | null, root: React.RefObject<View | null>, target: string | undefined) {
  const [rect, setRect] = useState<Rect | null>(null);
  useEffect(() => {
    setRect(null);
    if (!c || !target) return;
    let alive = true;
    let scrolled = false;
    const tick = () => {
      const node = c.entries.current[target]?.ref.current;
      if (!root.current || !node) { if (alive) setRect(null); return; }
      root.current.measureInWindow((ox, oy, _w, oh) => {
        node.measureInWindow((x, y, w, h) => {
          if (!alive) return;
          if (!w && !h) { setRect(null); return; }
          const r = { x: x - ox, y: y - oy, w, h };
          setRect((p) => (p && Math.abs(p.x - r.x) < 1 && Math.abs(p.y - r.y) < 1 && p.w === r.w && p.h === r.h ? p : r));
          if (!scrolled && (r.y < 0 || r.y + r.h > oh) && Platform.OS === 'web') {
            scrolled = true;
            (node as unknown as { scrollIntoView?: (o: object) => void }).scrollIntoView?.({ block: 'center', behavior: 'smooth' });
          }
        });
      });
    };
    tick();
    const id = setInterval(tick, 300);
    return () => { alive = false; clearInterval(id); };
  }, [c?.entries, target]); // eslint-disable-line react-hooks/exhaustive-deps
  return rect;
}

// Nabız atan çerçeve (hareket azaltma açıksa sabit)
function Ring({ hole }: { hole: Rect }) {
  const pulse = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    AccessibilityInfo.isReduceMotionEnabled?.().then((reduce) => {
      if (reduce) return;
      loop = Animated.loop(Animated.sequence([
        Animated.timing(pulse, { toValue: 0.35, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ]));
      loop.start();
    }).catch(() => {});
    return () => loop?.stop();
  }, [pulse]);
  return <Animated.View pointerEvents="none" style={[styles.ring, { opacity: pulse, left: hole.x - 4, top: hole.y - 4, width: hole.w + 8, height: hole.h + 8 }]} />;
}

type Card = { title: string; text?: string; count?: string; button?: string; onButton?: () => void; second?: string; onSecond?: () => void; onSkip?: () => void };

// Perde + çerçeve + kart (ekranda ya da pencerede)
function Spot({ c, target, card }: { c: Ctx; target?: string; card: Card }) {
  const root = useRef<View>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [cardH, setCardH] = useState(120);
  const rect = useTargetRect(c, root, target);
  const W = box.w || 400;
  const H = box.h || 700;
  const visible = !!rect && rect.y + rect.h > 8 && rect.y < H - 8;
  // delik ve çerçeve ekranın içinde kalır (büyük alanlar, ör. pencerenin gövdesi)
  const hole = visible && rect ? (() => {
    const x = Math.max(6, rect.x - PAD); const y = Math.max(6, rect.y - PAD);
    return { x, y, w: Math.min(W - 6, rect.x + rect.w + PAD) - x, h: Math.min(H - 6, rect.y + rect.h + PAD) - y };
  })() : null;
  const cardW = Math.min(340, W - 24);
  const mid = { left: (W - cardW) / 2 };
  let cardPos: object = { ...mid, bottom: 16 };
  if (hole) {
    const below = hole.y + hole.h + 12;
    const above = hole.y - cardH - 12;
    if (W < 600) {
      // dar ekran: kart altta (başparmak), hedef oradaysa üstte
      const bottomFree = hole.y + hole.h < H - cardH - 32;
      const topFree = hole.y > cardH + 32;
      cardPos = !bottomFree && topFree ? { ...mid, top: 16 } : { ...mid, bottom: 16 };
    } else {
      const left = Math.max(12, Math.min(W - cardW - 12, hole.x + hole.w / 2 - cardW / 2));
      cardPos = below + cardH < H - 8 ? { left, top: below } : above > 8 ? { left, top: above } : { ...mid, bottom: 16 };
    }
  }
  const lost = !!target && !visible;          // hedef ekranda değil: perde dokunuşu engellemez, kaydırılabilsin
  const label = (target && c.entries.current[target]?.label) || '';
  const text = card.text?.replace('{label}', label);
  return (
    <View ref={root} collapsable={false} pointerEvents="box-none" style={StyleSheet.absoluteFill}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {hole ? (
        <>
          <View pointerEvents="auto" style={[styles.dim, { left: 0, top: 0, width: W, height: Math.max(0, hole.y) }]} />
          <View pointerEvents="auto" style={[styles.dim, { left: 0, top: hole.y + hole.h, width: W, height: Math.max(0, H - hole.y - hole.h) }]} />
          <View pointerEvents="auto" style={[styles.dim, { left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.h }]} />
          <View pointerEvents="auto" style={[styles.dim, { left: hole.x + hole.w, top: hole.y, width: Math.max(0, W - hole.x - hole.w), height: hole.h }]} />
          <Ring hole={hole} />
        </>
      ) : (
        <View pointerEvents={lost ? 'none' : 'auto'} style={[styles.dim, StyleSheet.absoluteFill]} />
      )}
      <View style={[styles.card, { width: cardW }, cardPos]} onLayout={(e) => setCardH(e.nativeEvent.layout.height)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {!!card.count && <Text style={styles.count}>{card.count}</Text>}
          <Text style={[styles.title, { flex: 1 }]}>{card.title}</Text>
          {!!card.onSkip && (
            <Pressable onPress={card.onSkip} hitSlop={8} accessibilityRole="button"><Text style={styles.skip}>Atla</Text></Pressable>
          )}
        </View>
        {!!text && <Rich text={text} style={styles.text} bold={{ fontWeight: '800', color: colors.gold }} />}
        {lost && <Text style={styles.text}>↕ Kaydır</Text>}
        {(!!card.button || !!card.second) && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 2 }}>
            {!!card.second && (
              <Pressable onPress={card.onSecond} style={styles.ghost} accessibilityRole="button"><Text style={styles.ghostText}>{card.second}</Text></Pressable>
            )}
            {!!card.button && (
              <Pressable onPress={card.onButton} style={styles.next} accessibilityRole="button"><Text style={styles.nextText}>{card.button}</Text></Pressable>
            )}
          </View>
        )}
      </View>
    </View>
  );
}

export function CoachOverlay({ finalLabel }: { finalLabel: string }) {
  const c = useContext(CoachCtx);
  if (!c) return null;
  const s = c.step;
  const n = c.steps.slice(0, c.index + 1).filter((x) => x.until).length;
  return (
    <Spot key={s.key} c={c} target={s.target} card={{
      title: s.title, text: s.text,
      count: s.until ? `${n} / ${c.counted}` : undefined,
      button: s.final ? finalLabel : !s.until ? (c.index === 0 ? 'Başla' : 'İleri') : undefined,
      onButton: s.final ? c.finish : c.next,
      second: s.final ? 'Kapat' : undefined, onSecond: c.close,
      onSkip: s.final ? undefined : c.close,
    }} />
  );
}

// Açılan pencerenin içinde: adımın bu pencere için alt adımları sırayla (göster → dokun)
export function CoachSheetOverlay({ sheet }: { sheet: string }) {
  const c = useContext(CoachCtx);
  const list = c?.step.sheets?.[sheet];
  if (!c || !list) return null;
  const i = c.sub[sheet] ?? 0;
  const s = list[Math.min(i, list.length - 1)];
  return (
    <Spot key={`${sheet}-${i}`} c={c} target={s.target} card={{
      title: s.title, text: s.text,
      button: s.info ? 'Tamam' : undefined, onButton: () => c.subNext(sheet),
    }} />
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: { position: 'absolute', borderWidth: 4, borderColor: colors.gold, borderRadius: 4 },
  card: { position: 'absolute', backgroundColor: colors.navy, borderRadius: radius.md, paddingHorizontal: 14, paddingVertical: 12, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  count: { fontSize: 11, fontWeight: '800', color: colors.gold },
  title: { fontSize: 16, fontWeight: '800', color: '#fff' },
  skip: { fontSize: 13, fontWeight: '600', color: '#C9CFE0' },
  text: { fontSize: 14, color: '#E4E8F2', lineHeight: 20 },
  next: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  nextText: { fontSize: 13, fontWeight: '800', color: colors.navy },
  ghost: { paddingHorizontal: 8, paddingVertical: 9 },
  ghostText: { fontSize: 13, fontWeight: '600', color: '#C9CFE0' },
});
