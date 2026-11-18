import React, { createContext, useContext, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent, type ScrollViewProps } from 'react-native';

// Alt ana menü (kullanıcı isteği 17 Kasım 2026: "Instagram'daki gibi sıvı menü; ekran kullanılırken biraz küçülsün, kullanım
// bitince büyüsün"). Çubuk `components/LiquidTabBar.tsx`; burası "küçüldü mü" durumunu ve kaydırma dinleyicilerini tutar.
// Durum React durumunda değil küçük bir depoda: kaydırırken ekranlar yeniden çizilmez, yalnız çubuk dinler.
export type TabId = 'clients' | 'calendar' | 'library' | 'settings';

export const TAB_BAR_HEIGHT = 60;
export const TAB_BAR_BOTTOM = 22;        // alt güvenli alanın üstünde
// Çubuk görünürken ekranların kaydırma içeriğinin kendi alt boşluğuna EKLEYECEĞİ pay: çubuk + altındaki aralık (son satır
// çubuğun arkasında kalmasın). Alt güvenli alan ayrıca eklenmez: dört ekranın SafeAreaView'u onu zaten bırakıyor, çubuk da
// onun üstünde durur.
export const TAB_BAR_CLEARANCE = TAB_BAR_HEIGHT + TAB_BAR_BOTTOM;

const SHRINK_AFTER = 30;   // bu kadar aşağı kaydırınca küçülür
const GROW_AFTER = 8;      // bu kadar yukarı kaydırınca büyür (1–2 puanlık titreme sayılmaz)
const IDLE_MS = 700;       // son kaydırma olayından bu kadar sonra büyür ("kullanım bitince")

type ScrollEvent = NativeSyntheticEvent<NativeScrollEvent>;
type Store = {
  visible: () => boolean;
  shrunk: () => boolean;
  subscribe: (fn: () => void) => () => void;
  shrink: () => void;
  expand: () => void;      // hemen büyür, bekleyen sayaç silinir
  touch: () => void;       // kaydırma sürüyor: küçükse "boşta" sayacı yeniden kurulur
  stop: () => void;        // yalnız sayacı siler (sağlayıcı ekrandan çıkarken)
};

const idle = () => {};
const NOOP: Store = { visible: () => false, shrunk: () => false, subscribe: () => idle, shrink: idle, expand: idle, touch: idle, stop: idle };
const Ctx = createContext<{ visible: boolean; store: Store }>({ visible: false, store: NOOP });

// `visible`: çubuk şu an gösteriliyor mu (dört ana ekran + dar düzen). Kapalıyken dinleyiciler iş yapmaz, alt boşluk 0.
export function TabBarProvider({ visible, children }: { visible: boolean; children: React.ReactNode }) {
  const seen = useRef(visible);
  seen.current = visible;
  const store = useMemo<Store>(() => {
    let shrunk = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const listeners = new Set<() => void>();
    const set = (v: boolean) => { if (shrunk !== v) { shrunk = v; listeners.forEach((f) => f()); } };
    const clear = () => { if (timer) { clearTimeout(timer); timer = null; } };
    return {
      visible: () => seen.current,
      shrunk: () => shrunk,
      subscribe: (fn) => { listeners.add(fn); return () => { listeners.delete(fn); }; },
      shrink: () => set(true),
      expand: () => { clear(); set(false); },
      touch: () => { if (!shrunk) return; clear(); timer = setTimeout(() => { timer = null; set(false); }, IDLE_MS); },
      stop: clear,
    };
  }, []);
  useEffect(() => { if (!visible) store.expand(); }, [visible, store]);
  useEffect(() => store.stop, [store]);
  const value = useMemo(() => ({ visible, store }), [visible, store]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

// Çubuğun kendisi için: küçüldü mü + dokununca büyüt
export function useTabBarShrunk() {
  const { store } = useContext(Ctx);
  const shrunk = useSyncExternalStore(store.subscribe, store.shrunk, store.shrunk);
  return { shrunk, expand: store.expand };
}

type Own = Pick<ScrollViewProps, 'onScroll' | 'onScrollEndDrag' | 'onMomentumScrollEnd'>;

// Ekranın ana kaydırma alanı için: `scrollProps` ScrollView / FlatList'e yayılır (ekranın kendi onScroll'u varsa `own` ile
// verilir, ikisi de çalışır), `bottomPad` içeriğin alt boşluğuna eklenir. Çubuk görünmüyorsa ikisi de etkisizdir.
export function useTabBarScroll(own?: Own) {
  const { visible, store } = useContext(Ctx);
  const ownRef = useRef(own);
  ownRef.current = own;
  const pos = useRef({ y: 0, down: 0, up: 0, at: 0 });
  // ekran değişince (bu kaydırma alanı gidince) çubuk tam boyuna döner
  useEffect(() => store.expand, [store]);
  const scrollProps = useMemo(() => ({
    scrollEventThrottle: 16,
    onScroll: (e: ScrollEvent) => {
      ownRef.current?.onScroll?.(e);
      if (!store.visible()) return;
      const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
      // iOS'un üstte ve altta esnemesi yön sayılmaz: konum içerik sınırlarına kırpılır
      const max = Math.max(0, contentSize.height - layoutMeasurement.height);
      const y = Math.min(Math.max(contentOffset.y, 0), max);
      const p = pos.current;
      const now = Date.now();
      if (now - p.at > IDLE_MS) { p.down = 0; p.up = 0; }     // ara verildi: eşikler baştan sayılır
      p.at = now;
      const dy = y - p.y;
      p.y = y;
      if (y <= 0) { p.down = 0; p.up = 0; store.expand(); return; }
      if (dy > 0) { p.up = 0; p.down += dy; if (p.down > SHRINK_AFTER) store.shrink(); }
      else if (dy < 0) { p.down = 0; p.up -= dy; if (p.up > GROW_AFTER) store.expand(); }
      store.touch();
    },
    onScrollEndDrag: (e: ScrollEvent) => { ownRef.current?.onScrollEndDrag?.(e); store.touch(); },
    onMomentumScrollEnd: (e: ScrollEvent) => { ownRef.current?.onMomentumScrollEnd?.(e); store.touch(); },
  }), [store]);
  return { scrollProps, bottomPad: visible ? TAB_BAR_CLEARANCE : 0 };
}

// Aynı işin hazır hali: çubuğu sağlayan ekranın kendi listesi için (HomeScreen sağlayıcıyı kendisi çizdiği için kancayı
// doğrudan kullanamaz). Dinleyicileri bağlar, içeriğin sonuna çubuk kadar boşluk koyar.
export function TabBarScrollView({ children, onScroll, onScrollEndDrag, onMomentumScrollEnd, ...rest }: ScrollViewProps) {
  const { scrollProps, bottomPad } = useTabBarScroll({ onScroll, onScrollEndDrag, onMomentumScrollEnd });
  return (
    <ScrollView {...rest} {...scrollProps}>
      {children}
      {bottomPad > 0 && <View style={{ height: bottomPad }} />}
    </ScrollView>
  );
}
