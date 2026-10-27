import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Input, IconButton, DifficultyBadge } from '../../components/ui';
import { todayISO } from '../../dates';
import { SuggestionInput } from '../../lib/clinic';
import { Routine, routineTasks, routineSuggestions, isTaken, REPEAT_TEXT } from '../../lib/routines';
import { repeatSummary } from './SuggestionEditor';

// Günlük rutin önerisi (kullanıcı isteği 27 Ekim 2026; ortak akislar.md 5.4): seçilen rutinin görevleri tek seferde önerilir.
// Uzman görev çıkarabilir; çocukta aynı adlı görev ya da bekleyen öneri varsa o görev baştan seçili gelmez.
// Her görev ayrı öneri olur; ebeveyn ParentApp'te her birini ayrı kabul eder.
export default function RoutineSheet({ routine, childName, taken, onClose, onSubmit }: {
  routine: Routine | null; childName: string; taken: string[]; onClose: () => void; onSubmit: (list: SuggestionInput[]) => Promise<void>;
}) {
  return (
    <Modal visible={!!routine} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {routine && <Body routine={routine} childName={childName} taken={taken} onClose={onClose} onSubmit={onSubmit} />}
    </Modal>
  );
}

function Body({ routine, childName, taken, onClose, onSubmit }: {
  routine: Routine; childName: string; taken: string[]; onClose: () => void; onSubmit: (list: SuggestionInput[]) => Promise<void>;
}) {
  const tasks = useMemo(() => routineTasks(routine), [routine]);
  const [picked, setPicked] = useState<string[]>(() => tasks.filter((t) => !isTaken(t.title, taken)).map((t) => t.id));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const send = async () => {
    const list = routineSuggestions(routine, tasks.filter((t) => picked.includes(t.id)), todayISO(), note);
    if (!list.length) return Alert.alert('En az bir görev seç');
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
              <Text style={styles.heroSub}>{routine.subtitle} · {REPEAT_TEXT[routine.repeat]}</Text>
            </View>
          </View>
          <Text style={styles.small}>
            {childName} için önerilecek görevler. Çıkarmak istediğine dokun. Ebeveyn her görevi ParentApp'te ayrı ayrı onaylar; saatler hatırlatma saati olur.
          </Text>
          <View style={styles.list}>
            {tasks.map((t, i) => {
              const on = picked.includes(t.id);
              const dup = isTaken(t.title, taken);
              return (
                <Pressable key={t.id} onPress={() => toggle(t.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: '#F7F8FA' }]}>
                  <Ionicons name={on ? 'checkbox' : 'square-outline'} size={22} color={on ? colors.navy : colors.faint} />
                  <Text style={styles.time}>{t.time}</Text>
                  <Text style={{ fontSize: 20 }}>{t.emoji}</Text>
                  <View style={{ flex: 1, gap: 3 }}>
                    <Text style={[styles.task, !on && { color: colors.muted }]}>{t.title}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <DifficultyBadge d={t.difficulty} coins={t.coins} />
                      {routine.repeat === 'weekly' && !!t.days?.length && <Text style={styles.small}>{repeatSummary('weekly', t.days)}</Text>}
                      {dup && <Text style={[styles.small, { color: colors.medium.fg }]}>Çocukta zaten var ya da önerildi</Text>}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.label}>Aileye notun (isteğe bağlı)</Text>
          <Input value={note} onChangeText={setNote} placeholder="Ör. İlk hafta yalnız sabah görevlerine odaklanın" maxLength={140} />
          <Pressable onPress={send} disabled={busy || !picked.length} style={[styles.cta, (busy || !picked.length) && { opacity: 0.5 }]} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>{`Rutini öner (${picked.length} görev)`}</Text>}
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
  list: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  time: { width: 44, fontSize: 13, fontWeight: '700', color: colors.navy },
  task: { fontSize: 14, fontWeight: '600', color: colors.navy },
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 8 },
  cta: { height: 52, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
