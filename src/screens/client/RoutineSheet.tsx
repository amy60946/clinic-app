import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Input, IconButton, DifficultyBadge, Segmented } from '../../components/ui';
import { todayISO } from '../../dates';
import { SuggestionInput } from '../../lib/clinic';
import {
  Routine, RoutineDraft, DraftRepeat, routineSuggestions, draftOf, shiftTime, normalizeTime, newGroupId, REPEAT_TEXT, fitsAge, agesText,
} from '../../lib/routines';
import type { AgeGroup } from '../../templates';
import { repeatSummary } from './SuggestionEditor';

const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
export type RoutineGoal = { id: string; title: string };

// Günlük rutin önerisi v2 (ortak akislar.md 5.4 "Günlük rutin v2"; kullanıcı kararı 28 Ekim 2026):
// görev seç/çıkar, saatleri tek tek ya da hep birlikte kaydır, tekrar (hafta içi · her gün · seçili günler), isteğe bağlı hedef.
// Seçili görevler TEK PAKET olarak gider (aynı routine_group); ebeveyn tek kartta görür, isterse görev çıkarır.
// Kabul edilen her görev ayrı görevdir: onay ve oyun görev görev.
export default function RoutineSheet({ routine, childName, band, taken, goals, onClose, onSubmit }: {
  routine: Routine | null; childName: string; band: AgeGroup | null; taken: string[]; goals: RoutineGoal[];
  onClose: () => void; onSubmit: (list: SuggestionInput[]) => Promise<void>;
}) {
  return (
    <Modal visible={!!routine} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {routine && <Body routine={routine} childName={childName} band={band} taken={taken} goals={goals} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function Body({ routine, childName, band, taken, goals, onClose, onSubmit }: {
  routine: Routine; childName: string; band: AgeGroup | null; taken: string[]; goals: RoutineGoal[];
  onClose: () => void; onSubmit: (list: SuggestionInput[]) => Promise<void>;
}) {
  const [draft, setDraft] = useState<RoutineDraft>(() => draftOf(routine, taken));
  const [note, setNote] = useState('');
  const [goalId, setGoalId] = useState<string | null>(null);
  const [editing, setEditing] = useState<{ id: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const picked = draft.tasks.filter((t) => t.on).length;
  const set = (patch: Partial<RoutineDraft>) => setDraft((d) => ({ ...d, ...patch }));
  const toggle = (id: string) => set({ tasks: draft.tasks.map((t) => (t.id === id ? { ...t, on: !t.on } : t)) });
  const shiftAll = (min: number) => set({ tasks: draft.tasks.map((t) => (t.time ? { ...t, time: shiftTime(t.time, min) } : t)) });
  const toggleDay = (d: number) => set({ days: draft.days.includes(d) ? draft.days.filter((x) => x !== d) : [...draft.days, d] });
  const saveTime = () => {
    if (!editing) return;
    const v = editing.text.trim() ? normalizeTime(editing.text) : '';
    if (v === null) return Alert.alert('Saat geçersiz', 'Saati 07:30 biçiminde yaz.');
    set({ tasks: draft.tasks.map((t) => (t.id === editing.id ? { ...t, time: v } : t)) });
    setEditing(null);
  };
  const repeats: { id: DraftRepeat; label: string }[] = [
    ...(routine.repeat === 'weekly' ? [{ id: 'own' as const, label: 'Görev günleri' }] : []),
    { id: 'weekdays', label: 'Hafta içi' }, { id: 'daily', label: 'Her gün' }, { id: 'days', label: 'Günleri seç' },
  ];

  const send = async () => {
    if (editing) saveTime();
    if (!picked) return Alert.alert('En az bir görev seç');
    if (draft.repeat === 'days' && !draft.days.length) return Alert.alert('En az bir gün seç');
    const list = routineSuggestions(routine, draft, todayISO(), note, { group: newGroupId(), goalId });
    setBusy(true);
    try {
      await onSubmit(list);
    } catch (e) {
      Alert.alert('Rutin önerilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <IconButton name="close" onPress={onClose} label="Kapat" />
          <Text style={styles.title}>Günlük rutin önerisi</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 12 }} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          <View style={[styles.hero, { backgroundColor: routine.tint }]}>
            <View style={styles.heroIcon}><Ionicons name={routine.icon as keyof typeof Ionicons.glyphMap} size={26} color={colors.navy} /></View>
            <View style={{ flex: 1 }}>
              <Text style={styles.heroTitle}>{routine.title}</Text>
              <Text style={styles.heroSub}>{routine.subtitle} · {agesText(routine.ages)}</Text>
            </View>
          </View>
          {!fitsAge(routine, band) && (
            <Text style={[styles.small, { color: colors.medium.fg }]}>Bu rutin {agesText(routine.ages)} için hazırlandı; {childName}'in yaş grubu farklı.</Text>
          )}

          <Text style={styles.label}>Ne zaman?</Text>
          <Segmented options={repeats} value={draft.repeat} onChange={(r) => set({ repeat: r })} />
          {draft.repeat === 'own' && <Text style={styles.small}>{REPEAT_TEXT.weekly}.</Text>}
          {draft.repeat === 'days' && (
            <View style={styles.days}>
              {DAY_SHORT.map((d, i) => {
                const on = draft.days.includes(i + 1);
                return (
                  <Pressable key={d} onPress={() => toggleDay(i + 1)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                    style={[styles.day, on && styles.dayOn]}>
                    <Text style={[styles.dayText, on && { color: '#fff' }]}>{d}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}

          <View style={styles.shiftRow}>
            <Text style={[styles.small, { flex: 1 }]}>Bütün saatleri kaydır</Text>
            {[-30, -15, 15, 30].map((m) => (
              <Pressable key={m} onPress={() => shiftAll(m)} style={styles.shift} accessibilityRole="button" accessibilityLabel={`${m > 0 ? m : -m} dakika ${m > 0 ? 'ileri' : 'geri'}`}>
                <Text style={styles.shiftText}>{m > 0 ? `+${m}` : m} dk</Text>
              </Pressable>
            ))}
          </View>

          <Text style={styles.small}>
            Çıkarmak istediğin göreve dokun; saati değiştirmek için saate dokun. Ebeveyn rutini tek kartta görür, isterse görev çıkarıp ekler. Her görev ayrı onaylanır, oyunda ayrı görev olarak çıkar.
          </Text>
          <View style={styles.list}>
            {draft.tasks.map((t, i) => (
              <View key={t.id} style={[styles.row, i > 0 && styles.rowLine]}>
                <Pressable onPress={() => toggle(t.id)} hitSlop={6} accessibilityRole="checkbox" accessibilityState={{ checked: t.on }}
                  accessibilityLabel={t.title}>
                  <Ionicons name={t.on ? 'checkbox' : 'square-outline'} size={22} color={t.on ? colors.navy : colors.faint} />
                </Pressable>
                {editing?.id === t.id ? (
                  <TextInput value={editing.text} onChangeText={(x) => setEditing({ id: t.id, text: x })} onBlur={saveTime} onSubmitEditing={saveTime}
                    autoFocus maxLength={5} keyboardType="numbers-and-punctuation" placeholder="07:30" style={styles.timeInput} />
                ) : (
                  <Pressable onPress={() => setEditing({ id: t.id, text: t.time })} accessibilityRole="button" accessibilityLabel={`${t.title} saati`}
                    style={styles.timeBtn}>
                    <Text style={styles.time}>{t.time || '––:––'}</Text>
                  </Pressable>
                )}
                <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
                <Pressable onPress={() => toggle(t.id)} style={{ flex: 1, gap: 3 }}>
                  <Text style={[styles.task, !t.on && { color: colors.muted }]}>{t.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <DifficultyBadge d={t.difficulty} coins={t.coins} />
                    {draft.repeat === 'own' && !!t.days?.length && <Text style={styles.small}>{repeatSummary('weekly', t.days)}</Text>}
                    {!t.on && taken.some((x) => x.trim().toLocaleLowerCase('tr-TR') === t.title.trim().toLocaleLowerCase('tr-TR')) && (
                      <Text style={[styles.small, { color: colors.medium.fg }]}>Çocukta zaten var ya da önerildi</Text>
                    )}
                  </View>
                </Pressable>
              </View>
            ))}
          </View>

          {goals.length > 0 && (
            <>
              <Text style={styles.label}>Hangi hedef için? (isteğe bağlı)</Text>
              <View style={styles.goals}>
                {[{ id: '', title: 'Hedefe bağlama' }, ...goals].map((g) => {
                  const on = (goalId ?? '') === g.id;
                  return (
                    <Pressable key={g.id || 'none'} onPress={() => setGoalId(g.id || null)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                      style={[styles.goal, on && styles.goalOn]}>
                      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={18} color={on ? colors.navy : colors.faint} />
                      <Text style={[styles.goalText, !g.id && { color: colors.muted }]}>{g.title}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text style={styles.small}>Bağlarsan Takip planı'nda hedefin altında rutinin evde ne kadar yapıldığı görünür (ebeveyn kaydı, puan değil).</Text>
            </>
          )}

          <Text style={styles.label}>Aileye notun (isteğe bağlı)</Text>
          <Input value={note} onChangeText={setNote} placeholder="Ör. İlk hafta yalnız sabah görevlerine odaklanın" maxLength={140} />
          <Pressable onPress={send} disabled={busy || !picked} style={[styles.cta, (busy || !picked) && { opacity: 0.5 }]} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{`Rutini öner (${picked} görev)`}</Text>}
          </Pressable>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: radius.md, padding: 16 },
  heroIcon: { width: 48, height: 48, borderRadius: 14, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 18, fontWeight: '800', color: colors.navy },
  heroSub: { fontSize: 13, color: colors.text, marginTop: 2 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 6 },
  days: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  day: { minWidth: 44, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', alignItems: 'center' },
  dayOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  dayText: { fontSize: 13, fontWeight: '600', color: colors.navy },
  shiftRow: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  shift: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  shiftText: { fontSize: 12, fontWeight: '700', color: colors.navy },
  list: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  timeBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: '#FAFBFC' },
  time: { fontSize: 13, fontWeight: '700', color: colors.navy, fontVariant: ['tabular-nums'] },
  timeInput: { width: 62, borderWidth: 1.5, borderColor: colors.navy, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, fontSize: 13, fontWeight: '700', color: colors.navy },
  task: { fontSize: 14, fontWeight: '600', color: colors.navy },
  goals: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  goal: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 11, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  goalOn: { backgroundColor: colors.today },
  goalText: { flex: 1, fontSize: 14, color: colors.navy },
  cta: { height: 52, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
