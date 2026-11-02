import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, Pressable, Text, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius } from '../theme';

// iPad'de iki görünüm (kullanıcı kararı 2 Kasım 2026): "web" = web panelinin düzeni (sol menü, geniş takip planı),
// "ipad" = dokunmaya göre (üstte bölüm seçici, sütunlar alt alta). Uzman sağ üstteki düğmeyle seçer; seçim cihazda saklanır.
// Web tarayıcısında ve iPhone'da düğme yok: web her zaman web düzeni, telefon her zaman dar düzen.
export type LayoutMode = 'web' | 'ipad';
const KEY = 'clinic.layout.v1';
export const isPad = Platform.OS === 'ios' && (Platform as unknown as { isPad?: boolean }).isPad === true;

const Ctx = createContext<{ mode: LayoutMode; setMode: (m: LayoutMode) => void }>({ mode: 'web', setMode: () => {} });

export function LayoutProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<LayoutMode>('web');
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

// Sağ üstte: iPad'de görünüm seçimi
export function LayoutToggle() {
  const { mode, setMode } = useLayout();
  if (!isPad) return null;
  const next: LayoutMode = mode === 'web' ? 'ipad' : 'web';
  return (
    <Pressable onPress={() => setMode(next)} accessibilityRole="button" hitSlop={6}
      accessibilityLabel={mode === 'web' ? 'iPad görünümüne geç' : 'Web görünümüne geç'} style={styles.btn}>
      <Ionicons name={mode === 'web' ? 'desktop-outline' : 'tablet-portrait-outline'} size={15} color={colors.navy} />
      <Text style={styles.text}>{mode === 'web' ? 'Web görünümü' : 'iPad görünümü'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line,
    borderRadius: radius.pill, paddingHorizontal: 10, height: 32 },
  text: { fontSize: 12, fontWeight: '600', color: colors.navy },
});
