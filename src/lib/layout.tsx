import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Pressable, Text, StyleSheet, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius } from '../theme';

// iPad'de iki görünüm (kullanıcı kararları 2 Kasım 2026): "ipad" = dokunmaya göre (üstte bölüm seçici) VARSAYILAN,
// "web" = web panelinin düzeni (sol menü, geniş takip planı). Uzman sağ üstteki iki seçenekli düğmeyle seçer; seçim cihazda saklanır.
// Web tarayıcısında ve iPhone'da düğme yok: web her zaman web düzeni, telefon her zaman dar düzen.
// Anahtar v2: ilk sürümde varsayılan "web" idi; herkes iPad görünümüyle yeniden başlar.
export type LayoutMode = 'web' | 'ipad';
const KEY = 'clinic.layout.v2';
export const isPad = Platform.OS === 'ios' && (Platform as unknown as { isPad?: boolean }).isPad === true;

const Ctx = createContext<{ mode: LayoutMode; setMode: (m: LayoutMode) => void }>({ mode: isPad ? 'ipad' : 'web', setMode: () => {} });

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<LayoutMode>(isPad ? 'ipad' : 'web');
  useEffect(() => {
    if (!isPad) return;
    AsyncStorage.getItem(KEY).then((v) => { if (v === 'web' || v === 'ipad') setModeState(v); }).catch(() => {});
  }, []);
  const setMode = (m: LayoutMode) => { setModeState(m); AsyncStorage.setItem(KEY, m).catch(() => {}); };
  return <Ctx.Provider value={{ mode, setMode }}>{children}</Ctx.Provider>;
}

// desktop: sol menülü web düzeni. Web'de 900 pikselden itibaren; iPad'de "web görünümü" seçiliyse 700'den itibaren (dikey iPad dahil),
// "iPad görünümü" seçiliyse hiç.
export function useLayout() {
  const { mode, setMode } = useContext(Ctx);
  const { width } = useWindowDimensions();
  const desktop = isPad ? mode === 'web' && width >= 700 : width >= 900;
  return { mode, setMode, desktop, width };
}

// Sağ üstte: iPad'de görünüm seçimi (iki seçenek yan yana; seçili olan beyaz)
export function LayoutToggle() {
  const { mode, setMode } = useLayout();
  if (!isPad) return null;
  const opts: { id: LayoutMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { id: 'ipad', label: 'iPad', icon: 'tablet-portrait-outline' }, { id: 'web', label: 'Web', icon: 'desktop-outline' },
  ];
  return (
    <View style={styles.wrap} accessibilityRole="radiogroup" accessibilityLabel="Görünüm">
      {opts.map((o) => {
        const on = mode === o.id;
        return (
          <Pressable key={o.id} onPress={() => !on && setMode(o.id)} accessibilityRole="radio" accessibilityState={{ selected: on }}
            accessibilityLabel={`${o.label} görünümü`} hitSlop={4} style={[styles.opt, on && styles.optOn]}>
            <Ionicons name={o.icon} size={14} color={on ? colors.navy : colors.muted} />
            <Text style={[styles.text, !on && { color: colors.muted, fontWeight: '500' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', backgroundColor: '#ECEEF3', borderRadius: radius.pill, padding: 3, gap: 2 },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 4, borderRadius: radius.pill, paddingHorizontal: 10, height: 28 },
  optOn: { backgroundColor: '#fff' },
  text: { fontSize: 12, fontWeight: '700', color: colors.navy },
});
