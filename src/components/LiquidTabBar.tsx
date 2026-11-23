import React, { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Keyboard, Platform, Pressable, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { TAB_BAR_BOTTOM, TAB_BAR_HEIGHT, useTabBarShrunk, type TabId } from '../lib/tabBar';

// Alt ana menü: ortada yüzen hap. Ekran aşağı kaydırılırken bütün olarak biraz küçülür (0,84), yukarı kaydırınca, en üstte
// ya da kaydırma durunca geri büyür; dokununca hafifçe şişer, seçili sekmenin arkasındaki tek kapsül yeni sekmeye kayar.
// Hareket azaltma açıksa ölçek ve kayma yok, durumlar anında değişir. Ek paket yok: yalnız RN `Animated` (dönüşümler).
const TABS: { id: TabId; label: string; icon: keyof typeof Ionicons.glyphMap; iconOn: keyof typeof Ionicons.glyphMap }[] = [
  { id: 'clients', label: 'Danışanlar', icon: 'people-outline', iconOn: 'people' },
  { id: 'calendar', label: 'Takvim', icon: 'calendar-outline', iconOn: 'calendar' },
  { id: 'library', label: 'Kütüphane', icon: 'library-outline', iconOn: 'library' },
  { id: 'settings', label: 'Ayarlar', icon: 'settings-outline', iconOn: 'settings' },
];
const SHRUNK = 0.84;
const PRESSED = 1.045;
const RIM = 1;
const INSET = 4;                         // kapsül hapın dış kenarından 5 puan içeride (1 puan çerçeve + 4)
const NATIVE = Platform.OS !== 'web';    // web'de yerel sürücü yok; aynı animasyon JS ile oynar
const DIM = 'rgba(255,255,255,0.7)';
// Renk: koyu grafit cam, Moyo Ebeveyn'in alt menüsüyle aynı değerler (kullanıcı kararı 20 Kasım 2026; Moyo'da 19 Kasım, parent-app#30;
// önceki lacivert rgba(15,27,61,…)). Web: arkası hafif bulanık; yerelde (ek paket olmadan) yalnız yarı saydam grafit + siyah %10 gölge.
const WEB_GLASS = Platform.OS === 'web'
  ? ({ backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', boxShadow: '0 4px 20px rgba(0,0,0,0.10)' } as object)
  : null;

function useReduceMotion() {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled?.().then((v) => { if (live) setReduce(!!v); }).catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) => setReduce(!!v));
    return () => { live = false; sub?.remove?.(); };
  }, []);
  return reduce;
}

// Klavye açıkken çubuk çizilmez. Web'de (telefon tarayıcısı) görünür alanın belirgin kısalması klavye sayılır.
function useKeyboardOpen() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const vv = typeof window !== 'undefined' ? window.visualViewport : null;
      if (!vv) return;
      const check = () => setOpen(vv.height * vv.scale < window.innerHeight - 140);
      vv.addEventListener('resize', check);
      return () => vv.removeEventListener('resize', check);
    }
    const ios = Platform.OS === 'ios';
    // iPad'de harici klavyeyle gelen ince kısayol şeridi klavye sayılmaz
    const show = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', (e) => setOpen((e?.endCoordinates?.height ?? 0) > 120));
    const hide = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setOpen(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  return open;
}

// hide: gösterilmeyen sekmeler (ör. ebeveyn eğitimi bayrağı kapalıyken Kütüphane, 23 Kasım 2026)
export default function LiquidTabBar({ active, onSelect, hide = [] }: { active: TabId; onSelect: (to: TabId) => void; hide?: TabId[] }) {
  const tabs = TABS.filter((t) => !hide.includes(t.id));
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const keyboard = useKeyboardOpen();
  const { shrunk, expand } = useTabBarShrunk();
  const index = Math.max(0, tabs.findIndex((t) => t.id === active));
  const barW = Math.round(Math.min(width * 0.88, 420));
  const slotW = (barW - 2 * RIM) / tabs.length;

  const shrink = useRef(new Animated.Value(1)).current;     // kaydırma: 1 ↔ 0,84
  const press = useRef(new Animated.Value(1)).current;      // dokunma: 1 ↔ 1,045
  const slide = useRef(new Animated.Value(index)).current;  // kapsülün yeri (sekme sırası)
  const scale = useRef(Animated.multiply(shrink, press)).current;

  useEffect(() => {
    if (reduce) { shrink.stopAnimation(); shrink.setValue(1); press.stopAnimation(); press.setValue(1); return; }
    // yay: ~250 ms, hafif taşma
    Animated.spring(shrink, { toValue: shrunk ? SHRUNK : 1, stiffness: 420, damping: 26, mass: 1, useNativeDriver: NATIVE }).start();
  }, [shrunk, reduce, shrink, press]);

  useEffect(() => {
    if (reduce) { slide.stopAnimation(); slide.setValue(index); return; }
    Animated.timing(slide, { toValue: index, duration: 230, easing: Easing.out(Easing.cubic), useNativeDriver: NATIVE }).start();
  }, [index, reduce, slide]);

  const pressTo = (to: number) => {
    if (reduce) return;
    Animated.timing(press, { toValue: to, duration: 180, easing: Easing.out(Easing.quad), useNativeDriver: NATIVE }).start();
  };

  if (keyboard) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + TAB_BAR_BOTTOM }]}>
      <Animated.View testID="liquid-tab-bar" accessibilityRole="tablist" style={[styles.pill, WEB_GLASS, { width: barW, transform: [{ scale }] }]}>
        <Animated.View pointerEvents="none" style={[styles.capsule, {
          width: slotW - 2 * INSET,
          transform: [{ translateX: slide.interpolate({ inputRange: [0, tabs.length - 1], outputRange: [0, slotW * (tabs.length - 1)] }) }],
        }]} />
        {tabs.map((t) => {
          const on = t.id === active;
          return (
            <Pressable key={t.id} accessibilityRole="tab" accessibilityState={{ selected: on }} aria-selected={on} accessibilityLabel={t.label}
              onPressIn={() => { expand(); pressTo(PRESSED); }} onPressOut={() => pressTo(1)} onPress={() => onSelect(t.id)}
              style={[styles.slot, { width: slotW }]}>
              <Ionicons name={on ? t.iconOn : t.icon} size={22} color={on ? '#fff' : DIM} />
              <Text style={[styles.label, on && styles.labelOn]} numberOfLines={1} maxFontSizeMultiplier={1.2}>{t.label}</Text>
            </Pressable>
          );
        })}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  // yalnız hap dokunuş alır; sarmalayıcı altındaki ekrana dokunuşu geçirir
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    height: TAB_BAR_HEIGHT, borderRadius: TAB_BAR_HEIGHT / 2, flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(22,24,27,0.85)', borderWidth: RIM, borderColor: 'rgba(255,255,255,0.12)',
    shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 20, shadowOffset: { width: 0, height: 4 }, elevation: 4,
  },
  capsule: {
    position: 'absolute', left: INSET, top: INSET, bottom: INSET, borderRadius: (TAB_BAR_HEIGHT - 2 * RIM - 2 * INSET) / 2,
    backgroundColor: 'rgba(255,255,255,0.17)',
  },
  slot: { height: TAB_BAR_HEIGHT - 2 * RIM, minWidth: 44, alignItems: 'center', justifyContent: 'center', gap: 2 },
  label: { fontSize: 10.5, fontWeight: '600', color: DIM },
  labelOn: { color: '#fff' },
});
