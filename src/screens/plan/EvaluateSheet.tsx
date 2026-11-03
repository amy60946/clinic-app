import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { CoachSheetOverlay, CoachTarget, useCoachEmit } from '../../lib/coach';
import { IconButton } from '../../components/ui';
import { formatTR } from '../../dates';
import type { PlanGoal, GoalStatus } from '../../lib/plan';
import { goalWeek, lastRating, shiftDay } from '../../lib/planCore';
import { GAS_LABELS } from './PlanEditor';
import { PRIVATE } from './tones';

// "Değerlendir" (kullanıcı kararı 2 Kasım 2026, "A1"): GAS her hafta girilmez; uzman gözden geçirme anında bu pencereyi açar.
// Hedefe ulaşma düzeyi (GAS −2…+2) bu haftaya yazılır; "Bundan sonra" hedefin durumunu da seçtirir (Sürdür / Ulaşıldı / Ara ver).
// GAS aileye gitmez.
export const dayMonth = (iso: string) => formatTR(iso).replace(/ \d{4}$/, '');
const NEXT: { id: GoalStatus; label: string }[] = [
  { id: 'active', label: 'Sürdür' }, { id: 'achieved', label: 'Ulaşıldı' }, { id: 'paused', label: 'Ara ver' },
];

export default function EvaluateSheet({ goal, week, today, initialStatus, onClose, onSave }: {
  goal: PlanGoal | null; week: string; today: string; initialStatus?: GoalStatus;
  onClose: () => void; onSave: (rating: number | null, status: GoalStatus) => Promise<void>;
}) {
  return (
    <Modal visible={!!goal} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {goal && <Body goal={goal} week={week} today={today} initialStatus={initialStatus} onClose={onClose} onSave={onSave} />}
    </Modal>
  );
}

function Body({ goal, week, today, initialStatus, onClose, onSave }: {
  goal: PlanGoal; week: string; today: string; initialStatus?: GoalStatus;
  onClose: () => void; onSave: (rating: number | null, status: GoalStatus) => Promise<void>;
}) {
  const current = goal.ratings.find((r) => r.week === week)?.rating;
  const [rating, setRating] = useState<number | null>(current ?? null);
  const emit = useCoachEmit();
  const [status, setStatus] = useState<GoalStatus>(initialStatus ?? goal.status);
  const [busy, setBusy] = useState(false);
  const past = [...goal.ratings].filter((r) => r.week !== week).sort((a, b) => a.week.localeCompare(b.week)).slice(-5);
  const n = goalWeek(goal.created_at, today);
  const end = goal.weeks ? shiftDay(goal.created_at.slice(0, 10), goal.weeks * 7) : null;
  const ended = !!end && today >= end;
  const last = lastRating(goal);

  const save = async () => {
    if (rating === null && status === goal.status) return Alert.alert('Bir düzey seç', 'Hedefe ulaşma düzeyini (−2 … +2) seç ya da hedefin durumunu değiştir.');
    setBusy(true);
    try {
      await onSave(rating === current ? (current ?? null) : rating, status);
    } catch (e) {
      Alert.alert('Kaydedilemedi', (e as Error).message);
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
            <Text style={styles.title}>Değerlendir</Text>
            <Text style={styles.small} numberOfLines={2}>{goal.title}</Text>
          </View>
          <View style={styles.badge}>
            <Ionicons name="eye-off-outline" size={12} color={PRIVATE.fg} />
            <Text style={styles.badgeText}>Aile görmez</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }}>
          <Text style={styles.small}>
            {formatTR(today)} · {goal.weeks ? `${Math.min(n, goal.weeks)}. hafta / ${goal.weeks}` : `${n}. hafta`}
            {last ? ` · son değerlendirme ${dayMonth(last.week)}` : ' · ilk değerlendirme'}
          </Text>
          {ended && goal.status === 'active' && (
            <View style={styles.warn}><Ionicons name="time-outline" size={14} color={colors.medium.fg} />
              <Text style={[styles.small, { color: colors.medium.fg, flex: 1 }]}>Süre doldu ({goal.weeks} hafta). Hedefi sürdürmeyi, kapatmayı ya da ara vermeyi seç.</Text></View>
          )}
          {!!goal.target && <Text style={styles.body}>Hedef düzey: <Text style={{ fontWeight: '700' }}>{goal.target}</Text></Text>}

          <Text style={styles.label}>Hedefe ulaşma düzeyi (GAS)</Text>
          <CoachTarget id="sheet.eval.scale"><View style={styles.scale}>
            {[-2, -1, 0, 1, 2].map((v) => (
              <Pressable key={v} onPress={() => { setRating(v); emit('rated'); }} accessibilityRole="radio" accessibilityState={{ selected: rating === v }}
                accessibilityLabel={GAS_LABELS[v]} style={[styles.scaleBtn, rating === v && styles.scaleOn]}>
                <Text style={[styles.scaleNum, rating === v && { color: '#fff' }]}>{v > 0 ? `+${v}` : v === 0 ? '0' : `−${-v}`}</Text>
              </Pressable>
            ))}
          </View></CoachTarget>
          <Text style={styles.small}>{rating !== null ? GAS_LABELS[rating] : '0 = beklenen düzey. Uygulamadaki oranlar ve davranış kayıtları yardımcıdır; karar senin.'}</Text>
          {past.length > 0 && (
            <Text style={styles.small}>Önceki: {past.map((r) => `${dayMonth(r.week)} ${r.rating > 0 ? `+${r.rating}` : r.rating}`).join(' · ')}</Text>
          )}

          <Text style={styles.label}>Bundan sonra</Text>
          <View style={styles.seg}>
            {NEXT.map((x) => (
              <Pressable key={x.id} onPress={() => setStatus(x.id)} accessibilityRole="radio" accessibilityState={{ selected: status === x.id }}
                style={[styles.segItem, status === x.id && styles.segOn]}>
                <Text style={[styles.segText, status === x.id && styles.segTextOn]}>{x.label}</Text>
              </Pressable>
            ))}
          </View>
          {status !== goal.status && (
            <Text style={styles.small}>Durum aileye "Aileye gönder" ile gider (hedef aileye açıksa).</Text>
          )}

          <CoachTarget id="sheet.eval.save" style={{ marginTop: 10 }}><Pressable onPress={save} disabled={busy} style={[styles.cta, { marginTop: 0 }, busy && { opacity: 0.6 }]} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Kaydet</Text>}
          </Pressable></CoachTarget>
        </ScrollView>
      </View>
      <CoachSheetOverlay sheet="evaluate" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  label: { fontSize: 13, fontWeight: '700', color: colors.navy, marginTop: 6 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: PRIVATE.bg, borderColor: PRIVATE.line, borderWidth: 1,
    borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { fontSize: 11, fontWeight: '700', color: PRIVATE.fg },
  warn: { flexDirection: 'row', gap: 6, alignItems: 'flex-start', backgroundColor: colors.medium.bg, borderRadius: radius.sm, padding: 10 },
  scale: { flexDirection: 'row', gap: 6 },
  scaleBtn: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  scaleOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  scaleNum: { fontSize: 15, fontWeight: '700', color: colors.navy },
  seg: { flexDirection: 'row', backgroundColor: '#ECEEF3', borderRadius: 10, padding: 3, gap: 3 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segOn: { backgroundColor: '#fff' },
  segText: { fontSize: 13, fontWeight: '600', color: colors.muted },
  segTextOn: { color: colors.navy, fontWeight: '700' },
  cta: { height: 50, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
