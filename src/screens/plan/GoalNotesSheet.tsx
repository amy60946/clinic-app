import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { IconButton, Input } from '../../components/ui';
import type { PlanGoal } from '../../lib/plan';
import type { Note } from '../../lib/clinic';
import { dayMonth } from './EvaluateSheet';
import { PRIVATE } from './tones';

// Hedefin notları (kullanıcı kararı "N3", 3 Kasım 2026; sade): üstte yaz + Kaydet, altında tek zaman çizelgesi —
// hedef notları (clinic_notes.goal_id) ve değerlendirme notları (goal_ratings.note). Aile görmez. Silme danışan › Notlar'da.

export type GoalNoteItem = { key: string; at: string; text: string; rating?: number };
export function goalTimeline(goal: Pick<PlanGoal, 'id' | 'ratings'>, notes: Note[] | null): GoalNoteItem[] {
  const fromNotes = (notes ?? []).filter((n) => n.goal_id === goal.id).map((n) => ({ key: n.id, at: n.created_at, text: n.body }));
  const fromRatings = goal.ratings.filter((r) => !!r.note?.trim()).map((r) => ({ key: `r-${r.week}`, at: `${r.week}T12:00:00`, text: r.note.trim(), rating: r.rating }));
  return [...fromNotes, ...fromRatings].sort((a, b) => b.at.localeCompare(a.at));
}
const sign = (v: number) => (v > 0 ? `+${v}` : v === 0 ? '0' : `−${-v}`);

export default function GoalNotesSheet({ goal, notes, canWrite, onClose, onAdd }: {
  goal: PlanGoal | null; notes: Note[] | null; canWrite: boolean; onClose: () => void; onAdd: (body: string) => Promise<void>;
}) {
  return (
    <Modal visible={!!goal} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {goal && <Body goal={goal} notes={notes} canWrite={canWrite} onClose={onClose} onAdd={onAdd} />}
    </Modal>
  );
}

function Body({ goal, notes, canWrite, onClose, onAdd }: { goal: PlanGoal; notes: Note[] | null; canWrite: boolean; onClose: () => void; onAdd: (body: string) => Promise<void> }) {
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const items = goalTimeline(goal, notes);
  const save = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try { await onAdd(body.trim()); setBody(''); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <IconButton name="close" onPress={onClose} label="Kapat" />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Notlar</Text>
            <Text style={styles.small} numberOfLines={1}>{goal.title}</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="eye-off-outline" size={12} color={PRIVATE.fg} />
            <Text style={styles.badgeText}>Aile görmez</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          {canWrite && (
            <View style={{ gap: 8 }}>
              <Input value={body} onChangeText={setBody} placeholder="Bu davranış hedefine not…" multiline maxLength={4000} />
              <Pressable onPress={save} disabled={busy || !body.trim()} style={[styles.cta, (busy || !body.trim()) && { opacity: 0.5 }]} accessibilityRole="button">
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Kaydet</Text>}
              </Pressable>
            </View>
          )}
          {items.length === 0 ? (
            <Text style={[styles.small, { textAlign: 'center', marginTop: 12 }]}>Henüz not yok.</Text>
          ) : items.map((x) => (
            <View key={x.key} style={styles.item}>
              <Text style={styles.meta}>{x.rating !== undefined ? `Değerlendirme ${sign(x.rating)} · ${dayMonth(x.at.slice(0, 10))} haftası` : dayMonth(x.at.slice(0, 10))}</Text>
              <Text style={styles.text}>{x.text}</Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIVATE.bg, borderColor: PRIVATE.line, borderWidth: 1, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: PRIVATE.fg },
  cta: { height: 46, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  item: { backgroundColor: PRIVATE.card, borderWidth: 1, borderColor: PRIVATE.line, borderRadius: radius.sm, padding: 12, gap: 4 },
  meta: { fontSize: 11.5, fontWeight: '700', color: PRIVATE.fg },
  text: { fontSize: 14, color: PRIVATE.text, lineHeight: 20 },
});
