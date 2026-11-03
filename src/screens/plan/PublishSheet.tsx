import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { CoachSheetOverlay, CoachTarget } from '../../lib/coach';
import { IconButton } from '../../components/ui';
import type { PubItem } from '../../lib/planCore';

// "Aileye gönder" özeti (kullanıcı kararı 2 Kasım 2026, "G1"; ortak care_plan_publish_selected): gidecekler hedef hedef listelenir,
// hepsi işaretli gelir; işareti kaldırılan bu gönderimde bekler. Aile tek bildirim alır. GAS ve gizli hedef listede çıkmaz.
export type PubGroup = { id: string | null; title: string; color: string; hidden: boolean };
const KIND: Record<PubItem['kind'], string> = { goal: 'Hedef', module: 'Program', routine: 'Rutin', task: 'Görev', change: 'Değişiklik' };

export default function PublishSheet({ items, groups, onClose, onSend }: {
  items: PubItem[] | null; groups: PubGroup[]; onClose: () => void; onSend: (hold: string[]) => Promise<void>;
}) {
  return (
    <Modal visible={!!items} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {items && <Body items={items} groups={groups} onClose={onClose} onSend={onSend} />}
    </Modal>
  );
}

function Body({ items, groups, onClose, onSend }: {
  items: PubItem[]; groups: PubGroup[]; onClose: () => void; onSend: (hold: string[]) => Promise<void>;
}) {
  const [off, setOff] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const picked = items.filter((x) => !off.includes(x.key));
  const sections = useMemo(() => {
    const known = [...groups.filter((g) => items.some((x) => x.goalId === g.id))];
    const loose = items.filter((x) => !x.goalId || !groups.some((g) => g.id === x.goalId));
    return [
      ...known.map((g) => ({ g, list: items.filter((x) => x.goalId === g.id) })),
      ...(loose.length ? [{ g: { id: null, title: 'Hedefe bağlı olmayanlar', color: colors.faint, hidden: false }, list: loose }] : []),
    ];
  }, [items, groups]);
  const toggle = (k: string) => setOff((x) => (x.includes(k) ? x.filter((y) => y !== k) : [...x, k]));
  const send = async () => {
    setBusy(true);
    try {
      await onSend(items.filter((x) => off.includes(x.key)).flatMap((x) => x.hold));
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <IconButton name="close" onPress={onClose} label="Kapat" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Aileye gönder</Text>
            <Text style={styles.small}>Ebeveyn tek bildirim alır. İşaretini kaldırdığın bekler, sonra gönderirsin.</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 8 }}>
          <CoachTarget id="sheet.publish.list" style={{ gap: 8 }}>
          {sections.map(({ g, list }) => (
            <View key={g.id ?? 'loose'} style={{ gap: 6 }}>
              <View style={styles.group}>
                <View style={[styles.dot, { backgroundColor: g.color }]} />
                <Text style={styles.groupText} numberOfLines={1}>{g.title}</Text>
                {g.hidden && <Text style={styles.hidden}>Yalnız sende · hedef gitmez</Text>}
              </View>
              {list.map((x) => {
                const on = !off.includes(x.key);
                return (
                  <Pressable key={x.key} onPress={() => toggle(x.key)} style={[styles.item, !on && { opacity: 0.6 }]}
                    accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                    <View style={[styles.box, on && styles.boxOn]}>{on && <Ionicons name="checkmark" size={13} color="#fff" />}</View>
                    <View style={{ flex: 1, gap: 1 }}>
                      <Text style={styles.itemTitle}>{KIND[x.kind]}: {x.title}</Text>
                      <Text style={styles.small}>{on ? x.detail : 'bekletiliyor'}</Text>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ))}
          </CoachTarget>
          <Text style={[styles.small, { marginTop: 6 }]}>GAS değerlendirmeleri ve "Yalnız sende" hedefler aileye hiç gitmez.</Text>
          <CoachTarget id="sheet.publish.send"><Pressable onPress={send} disabled={busy || !picked.length} style={[styles.cta, (busy || !picked.length) && { opacity: 0.5 }]} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#fff" /> : (
              <Text style={styles.ctaText}>{picked.length === items.length ? `Hepsini gönder (${items.length})` : `Seçilenleri gönder (${picked.length})`}</Text>
            )}
          </Pressable></CoachTarget>
        </ScrollView>
      </View>
      <CoachSheetOverlay sheet="publish" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 600, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  group: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  groupText: { fontSize: 12, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  hidden: { fontSize: 11, color: '#7A5A1E' },
  item: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#fff', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, padding: 10 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  boxOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  itemTitle: { fontSize: 14, fontWeight: '600', color: colors.navy },
  cta: { height: 50, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
