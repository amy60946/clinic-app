import React from 'react';
import { View, Text, Pressable, Modal, ScrollView, StyleSheet, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { IconButton } from './ui';
import { useKeyboardHeight } from '../lib/useKeyboardHeight';

// Alttan açılan sayfa. Klavye açılınca sayfa klavyenin üstüne çıkar ve içerik
// kaydırılabilir kalır; yazılan alan her zaman görünür.
export default function Sheet({ visible, title, onClose, children, header }: {
  visible: boolean; title: string; onClose: () => void; children: React.ReactNode; header?: React.ReactNode;
}) {
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const kb = useKeyboardHeight();
  const maxScroll = Math.max(160, height - kb - insets.top - 190);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={{ flex: 1 }}>
        <Pressable style={{ flex: 1, backgroundColor: 'rgba(15,27,61,0.35)' }} onPress={onClose} accessibilityLabel="Kapat" />
        <View style={[styles.sheet, { paddingBottom: kb ? kb + 12 : Math.max(insets.bottom, 20) + 14 }]}>
          <View style={styles.head}>
            <Text style={styles.title}>{title}</Text>
            <IconButton name="close" label="Kapat" onPress={onClose} style={{ backgroundColor: '#F1F2F6' }} />
          </View>
          {header}
          <ScrollView
            style={{ maxHeight: maxScroll }}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
            contentContainerStyle={{ paddingTop: header ? 16 : 0, gap: 14 }}
          >
            {children}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20 },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 16, fontWeight: '700', color: colors.navy },
});
