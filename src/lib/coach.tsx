import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { colors, radius } from '../theme';

// Yaptırarak öğreten tur (kullanıcı isteği 3 Kasım 2026: "yazılar kısa, hangi tuşla yapılacağı akışta, ekranın geri kalanına hafif
// siyah perde, önemli kısımları örnek çocuk üzerinden yaptır"). İşleyiş referansı: etkileşimli yürüyüş (Appcues / Userpilot /
// Chameleon "interactive walkthrough"): her adım tek bir tuşu vurgular, kullanıcı o tuşa dokununca adım ilerler.
//  · CoachTarget: vurgulanabilecek öğeyi sarar (kimlik + ekranda görünen ad).
//  · CoachOverlay: hedefin çevresini karartır (dört dikdörtgen; delikten dokunuş geçer), altın çerçeve ve kısa kart.
//  · CoachBanner: adımın açtığı pencerenin (Modal) üstünde ne yapılacağını söyler; perde pencerenin altında kalır.
//  · useCoachEmit: ekranlar olay bildirir ("goal_added" …); adımın beklediği olaysa tur ilerler. Tur yoksa hiçbir şey yapmaz.

export type CoachStep = {
  key: string;
  tab?: string;                       // adım başlarken açılacak danışan bölümü
  target?: string;                    // vurgulanacak CoachTarget kimliği; yoksa kart ortada, perde tam
  title: string;
  text: string;                       // **kalın** = dokunulacak tuş; {label} = hedefin ekrandaki adı
  until?: string;                     // adımı bitiren olay; yoksa kartta "İleri"
  sheet?: Record<string, string>;     // pencere anahtarı → o pencerenin üstündeki kısa yönerge
  final?: boolean;
};
type Entry = { ref: React.RefObject<View | null>; label?: string };
type Ctx = {
  steps: CoachStep[]; index: number; step: CoachStep;
  entries: React.MutableRefObject<Record<string, Entry>>;
  register: (id: string, e: Entry) => () => void;
  emit: (event: string) => void;
  next: () => void; close: () => void; finish: () => void;
};
const CoachCtx = createContext<Ctx | null>(null);
export const useCoach = () => useContext(CoachCtx);
export function useCoachEmit() {
  const c = useContext(CoachCtx);
  return useCallback((e: string) => { c?.emit(e); }, [c]);
}
// Bu adım şu hedefi mi vurguluyor? (ör. dar ekranda doğru sekmeyi açmak için)
export function useCoachTarget() { return useContext(CoachCtx)?.step.target ?? null; }

export function CoachProvider({ steps, index, onIndex, onClose, onFinish, children }: {
  steps: CoachStep[]; index: number; onIndex: (i: number) => void; onClose: (index: number) => void; onFinish: () => void; children: React.ReactNode;
}) {
  const entries = useRef<Record<string, Entry>>({});
  const step = steps[Math.min(index, steps.length - 1)];
  const value = useMemo<Ctx>(() => ({
    steps, index, step, entries,
    register: (id, e) => { entries.current[id] = e; return () => { if (entries.current[id] === e) delete entries.current[id]; }; },
    emit: (event) => { if (step.until === event) onIndex(index + 1); },
    next: () => onIndex(index + 1),
    close: () => onClose(index),
    finish: onFinish,
  }), [steps, index, step, onIndex, onClose, onFinish]);
  return <CoachCtx.Provider value={value}>{children}</CoachCtx.Provider>;
}

export function CoachTarget({ id, label, children, style }: { id: string; label?: string; children: React.ReactNode; style?: object }) {
  const c = useContext(CoachCtx);
  const ref = useRef<View>(null);
  const register = c?.register;
  useEffect(() => (register ? register(id, { ref, label }) : undefined), [register, id, label]);
  if (!c) return <>{children}</>;
  return <View ref={ref} collapsable={false} style={style}>{children}</View>;
}

// **kalın** parçalar
function Rich({ text, style, bold }: { text: string; style: object; bold: object }) {
  const parts = text.split('**');
  return <Text style={style}>{parts.map((p, i) => (i % 2 ? <Text key={i} style={bold}>{p}</Text> : p))}</Text>;
}

export function CoachBanner({ sheet }: { sheet: string }) {
  const c = useContext(CoachCtx);
  const t = c?.step.sheet?.[sheet];
  if (!c || !t) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Text style={styles.bannerStep}>{`${c.index} / ${c.steps.length - 2}`}</Text>
      <Rich text={t} style={styles.bannerText} bold={{ fontWeight: '800', color: colors.gold }} />
    </View>
  );
}

type Rect = { x: number; y: number; w: number; h: number };
const PAD = 6;
const DIM = 'rgba(8, 12, 24, 0.5)';

export function CoachOverlay({ finalLabel }: { finalLabel: string }) {
  const c = useContext(CoachCtx);
  const root = useRef<View>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [rect, setRect] = useState<Rect | null>(null);
  const [cardH, setCardH] = useState(150);
  const target = c?.step.target;

  // Hedefin yeri: kaydırma ve yerleşim değişebildiği için kısa aralıkla ölçülür (yalnız tur açıkken)
  useEffect(() => {
    setRect(null);
    if (!c || !target) return;
    let alive = true;
    let scrolled = false;
    const tick = () => {
      const e = c.entries.current[target];
      const node = e?.ref.current;
      if (!root.current || !node) { if (alive) setRect(null); return; }
      root.current.measureInWindow((ox, oy, _ow, oh) => {
        node.measureInWindow((x, y, w, h) => {
          if (!alive) return;
          if (!w && !h) { setRect(null); return; }
          const r = { x: x - ox, y: y - oy, w, h };
          setRect((p) => (p && Math.abs(p.x - r.x) < 1 && Math.abs(p.y - r.y) < 1 && p.w === r.w && p.h === r.h ? p : r));
          // web: ekran dışındaysa bir kez görünür alana kaydır
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
  }, [c, target]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!c) return null;
  const s = c.step;
  const label = (target && c.entries.current[target]?.label) || '';
  const text = s.text.replace('{label}', label);
  const W = box.w || 400;
  const H = box.h || 700;
  const visible = !!rect && rect.y + rect.h > 8 && rect.y < H - 8;
  const hole = visible && rect ? { x: rect.x - PAD, y: rect.y - PAD, w: rect.w + PAD * 2, h: rect.h + PAD * 2 } : null;
  const cardW = Math.min(360, W - 24);
  // kart: hedefin altında yer varsa altta, yoksa üstte; hedef yoksa altta ortada
  let cardPos: object = { left: (W - cardW) / 2, bottom: 16 };
  if (hole && W < 600) {
    // dar ekranda kart yakındaki düğmelerin üstüne binmesin: altta sabit, hedef alttaysa üstte
    if (hole.y + hole.h > H - cardH - 32) cardPos = { left: (W - cardW) / 2, top: 16 };
  } else if (hole) {
    const left = Math.max(12, Math.min(W - cardW - 12, hole.x + hole.w / 2 - cardW / 2));
    cardPos = hole.y + hole.h + 12 + cardH < H ? { left, top: hole.y + hole.h + 12 } : { left, top: Math.max(8, hole.y - cardH - 12) };
  }
  const waiting = !!s.until;
  const lost = !!target && !visible;          // hedef ekranda değil: perde dokunuşu engellemez, kaydırılabilsin
  const counted = c.steps.length - 2;         // ilk (hoş geldin) ve son (hazırsın) kart sayılmaz
  return (
    <View ref={root} collapsable={false} pointerEvents="box-none" style={StyleSheet.absoluteFill}
      onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {hole ? (
        <>
          <View pointerEvents="auto" style={[styles.dim, { left: 0, top: 0, width: W, height: Math.max(0, hole.y) }]} />
          <View pointerEvents="auto" style={[styles.dim, { left: 0, top: hole.y + hole.h, width: W, height: Math.max(0, H - hole.y - hole.h) }]} />
          <View pointerEvents="auto" style={[styles.dim, { left: 0, top: hole.y, width: Math.max(0, hole.x), height: hole.h }]} />
          <View pointerEvents="auto" style={[styles.dim, { left: hole.x + hole.w, top: hole.y, width: Math.max(0, W - hole.x - hole.w), height: hole.h }]} />
          <View pointerEvents="none" style={[styles.ring, { left: hole.x - 4, top: hole.y - 4, width: hole.w + 8, height: hole.h + 8 }]} />
        </>
      ) : (
        <View pointerEvents={lost ? 'none' : 'auto'} style={[styles.dim, StyleSheet.absoluteFill]} />
      )}
      <View style={[styles.card, { width: cardW }, cardPos]} onLayout={(e) => setCardH(e.nativeEvent.layout.height)}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          {c.index > 0 && !s.final && <Text style={styles.count}>{`${c.index} / ${counted}`}</Text>}
          <Text style={[styles.title, { flex: 1 }]}>{s.title}</Text>
          {!s.final && (
            <Pressable onPress={c.close} hitSlop={8} accessibilityRole="button">
              <Text style={styles.skip}>Atla</Text>
            </Pressable>
          )}
        </View>
        <Rich text={lost ? `${text} (Kaydır, vurgulanan yeri bul.)` : text} style={styles.text} bold={{ fontWeight: '800', color: colors.gold }} />
        {(!waiting || s.final) && (
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 2 }}>
            {s.final && (
              <Pressable onPress={c.close} style={styles.ghost} accessibilityRole="button"><Text style={styles.ghostText}>Kapat</Text></Pressable>
            )}
            <Pressable onPress={s.final ? c.finish : c.next} style={styles.next} accessibilityRole="button">
              <Text style={styles.nextText}>{s.final ? finalLabel : c.index === 0 ? 'Başla' : 'İleri'}</Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  dim: { position: 'absolute', backgroundColor: DIM },
  ring: { position: 'absolute', borderWidth: 4, borderColor: colors.gold, borderRadius: 4 },
  card: { position: 'absolute', backgroundColor: colors.navy, borderRadius: radius.md, padding: 14, gap: 6,
    shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 16, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  count: { fontSize: 11, fontWeight: '800', color: colors.gold },
  title: { fontSize: 15, fontWeight: '800', color: '#fff' },
  skip: { fontSize: 13, fontWeight: '600', color: '#C9CFE0' },
  text: { fontSize: 14, color: '#E4E8F2', lineHeight: 20 },
  next: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  nextText: { fontSize: 13, fontWeight: '800', color: colors.navy },
  ghost: { paddingHorizontal: 8, paddingVertical: 9 },
  ghostText: { fontSize: 13, fontWeight: '600', color: '#C9CFE0' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.navy, borderRadius: radius.sm, padding: 12, marginHorizontal: 16, marginBottom: 6 },
  bannerStep: { fontSize: 11, fontWeight: '800', color: colors.gold },
  bannerText: { flex: 1, fontSize: 14, color: '#fff', lineHeight: 20 },
});
