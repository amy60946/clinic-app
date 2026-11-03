import React, { useCallback, useRef, useState } from 'react';
import { View, Text, Pressable, Modal, StyleSheet, Platform, useWindowDimensions, GestureResponderEvent } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';

// Uygulamanın kendi menüsü (kullanıcı isteği 3 Kasım 2026: "üç nokta, Sürüyor/Ulaşıldı gibi düğmelerin açılan pencereleri
// uygulamanın UI'ıyla güncellensin; şu an Apple menüsü gibi"). İşleyiş referansı: Apple HIG — iPad'de dokunulan yerin yanında
// açılan küçük pencere (popover), iPhone'da alttan sayfa (action sheet); kısa liste, seçili durum işaretli, yıkıcı işlem en sonda
// ve kırmızı. Geniş ekranda (≥ 600) dokunulan noktanın yanında kart, dar ekranda alttan sayfa + "Vazgeç".
// Kullanım: const [menu, openMenu] = useActionMenu(); … {menu} … onPress={(e) => openMenu({ title, items }, e)}

export type MenuItem = {
  label: string; icon?: keyof typeof Ionicons.glyphMap; onPress?: () => void;
  destructive?: boolean; checked?: boolean; hint?: string;
};
export type MenuSpec = { title?: string; message?: string; items: MenuItem[]; cancel?: boolean };
type Open = MenuSpec & { at?: { x: number; y: number } };

export function useActionMenu(): [React.ReactNode, (spec: MenuSpec, e?: GestureResponderEvent) => void] {
  const [spec, setSpec] = useState<Open | null>(null);
  const open = useCallback((s: MenuSpec, e?: GestureResponderEvent) => {
    const n = e?.nativeEvent as { pageX?: number; pageY?: number } | undefined;
    setSpec({ ...s, at: n && typeof n.pageX === 'number' && typeof n.pageY === 'number' ? { x: n.pageX, y: n.pageY } : undefined });
  }, []);
  return [<ActionMenu key="menu" spec={spec} onClose={() => setSpec(null)} />, open];
}

// Onay: tek yıkıcı işlem + Vazgeç (ör. "Taslak silinsin mi?")
export const confirmSpec = (title: string, message: string, label: string, onConfirm: () => void, icon: keyof typeof Ionicons.glyphMap = 'trash-outline'): MenuSpec =>
  ({ title, message, cancel: true, items: [{ label, icon, destructive: true, onPress: onConfirm }] });

function ActionMenu({ spec, onClose }: { spec: Open | null; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const [h, setH] = useState(0);
  const pending = useRef<(() => void) | null>(null);
  const wide = width >= 600;
  const W = 300;
  // iOS'ta bir pencere kapanırken başka pencere açılamaz: seçilen işlem menü kapanınca çalışır
  const pick = (f?: () => void) => {
    if (!f) return onClose();
    if (Platform.OS === 'ios') { pending.current = f; onClose(); } else { onClose(); setTimeout(f, 0); }
  };
  const run = () => { const f = pending.current; pending.current = null; f?.(); };
  if (!spec && !pending.current) return null;

  let pos: object = { left: (width - W) / 2, top: Math.max(24, (height - (h || 240)) / 2) };
  if (wide && spec?.at) {
    const est = h || 60 + (spec.items.length + (spec.cancel ? 1 : 0)) * 52;
    const left = Math.max(12, Math.min(width - W - 12, spec.at.x - W + 28));
    const top = spec.at.y + 14 + est < height - 12 ? spec.at.y + 14 : Math.max(12, spec.at.y - 14 - est);
    pos = { left, top };
  }
  const rows = (spec?.items ?? []).map((it) => (
    <Pressable key={it.label} onPress={() => pick(it.checked ? undefined : it.onPress)} accessibilityRole="menuitem"
      accessibilityState={{ selected: !!it.checked }}
      style={({ pressed, hovered }: { pressed: boolean; hovered?: boolean }) => [styles.item, (pressed || hovered) && styles.itemOn]}>
      {!!it.icon && <Ionicons name={it.icon} size={18} color={it.destructive ? colors.hard.fg : colors.navy} />}
      <View style={{ flex: 1, gap: 1 }}>
        <Text style={[styles.label, it.destructive && { color: colors.hard.fg }, it.checked && { fontWeight: '800' }]}>{it.label}</Text>
        {!!it.hint && <Text style={styles.hint}>{it.hint}</Text>}
      </View>
      {it.checked && <Ionicons name="checkmark" size={18} color={colors.navy} />}
    </Pressable>
  ));
  const head = (!!spec?.title || !!spec?.message) && (
    <View style={styles.head}>
      {!!spec?.title && <Text style={styles.title} numberOfLines={2}>{spec.title}</Text>}
      {!!spec?.message && <Text style={styles.message}>{spec.message}</Text>}
    </View>
  );
  return (
    <Modal visible={!!spec} transparent animationType="fade" onRequestClose={onClose} onDismiss={run} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Kapat" />
      {wide ? (
        <View style={[styles.pop, { width: W }, pos]} onLayout={(e) => setH(e.nativeEvent.layout.height)} accessibilityRole="menu">
          {head}
          {rows}
          {spec?.cancel && (
            <Pressable onPress={onClose} style={({ pressed }) => [styles.item, styles.line, pressed && styles.itemOn]} accessibilityRole="button">
              <Text style={[styles.label, { color: colors.muted }]}>Vazgeç</Text>
            </Pressable>
          )}
        </View>
      ) : (
        <SafeAreaView edges={['bottom']} style={styles.sheetWrap} pointerEvents="box-none">
          <View style={styles.sheet} accessibilityRole="menu">
            {head}
            {rows}
          </View>
          <Pressable onPress={onClose} style={({ pressed }) => [styles.sheet, styles.cancel, pressed && styles.itemOn]} accessibilityRole="button">
            <Text style={[styles.label, { textAlign: 'center', fontWeight: '700' }]}>Vazgeç</Text>
          </Pressable>
        </SafeAreaView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(8, 12, 24, 0.28)' },
  pop: { position: 'absolute', backgroundColor: '#fff', borderRadius: radius.md, paddingVertical: 6, borderWidth: 1, borderColor: colors.line,
    shadowColor: '#0F1B3D', shadowOpacity: 0.18, shadowRadius: 18, shadowOffset: { width: 0, height: 8 }, elevation: 8 },
  sheetWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 10, paddingBottom: 10, gap: 8 },
  sheet: { backgroundColor: '#fff', borderRadius: radius.lg, paddingVertical: 6, overflow: 'hidden' },
  cancel: { paddingVertical: 16, alignItems: 'center' },
  head: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 8, gap: 3, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line, marginBottom: 4 },
  title: { fontSize: 14, fontWeight: '800', color: colors.navy },
  message: { fontSize: 13, color: colors.muted, lineHeight: 18 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 48 },
  itemOn: { backgroundColor: '#F1F4FA' },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, marginTop: 4 },
  label: { fontSize: 15, fontWeight: '600', color: colors.navy },
  hint: { fontSize: 12, color: colors.muted },
});
