import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, Difficulty } from '../../theme';
import { Input, IconButton, DifficultyBadge, Segmented, Toggle } from '../../components/ui';
import { ClinicianMe, saveOwnRoutine, deleteOwnRoutine } from '../../lib/clinic';
import { OwnRoutine, OwnItem, RoutineRepeat, AGE_LABEL, normalizeTime, shiftTime } from '../../lib/routines';
import { templates, AgeGroup } from '../../templates';
import { track } from '../../lib/track';

const ICONS = ['sunny-outline', 'moon-outline', 'school-outline', 'home-outline', 'people-outline', 'bicycle-outline', 'book-outline',
  'leaf-outline', 'heart-outline', 'repeat-outline'] as const;
const DAY_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
const AGES: AgeGroup[] = ['K', 'A', 'B', 'C'];
const MAX = 12;

// Uzmanın kendi rutini (C; ortak akislar.md 5.4 "Günlük rutin v2" adım 7, tablo clinic_routines): ad, simge, tekrar, yaş grupları,
// 1–12 görev (katalogdan ya da kendi yazdığı; saat, gün, zorluk). "Ekibe açık" seçilirse kliniğin diğer uzmanları görür.
export default function RoutineEditor({ visible, me, editing, teamSize, onClose, onSaved }: {
  visible: boolean; me: ClinicianMe; editing: OwnRoutine | null; teamSize: number; onClose: () => void; onSaved: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible && <Body me={me} editing={editing} teamSize={teamSize} onClose={onClose} onSaved={onSaved} />}
    </Modal>
  );
}

function Body({ me, editing, teamSize, onClose, onSaved }: {
  me: ClinicianMe; editing: OwnRoutine | null; teamSize: number; onClose: () => void; onSaved: () => void;
}) {
  const [title, setTitle] = useState(editing?.title ?? '');
  const [icon, setIcon] = useState(editing?.icon ?? 'repeat-outline');
  const [repeat, setRepeat] = useState<RoutineRepeat>(editing?.repeat ?? 'weekdays');
  const [ages, setAges] = useState<AgeGroup[]>(editing?.ages ?? []);
  const [items, setItems] = useState<OwnItem[]>(editing?.items ?? []);
  const [shared, setShared] = useState(editing?.shared ?? false);
  const [adding, setAdding] = useState<'none' | 'catalog' | 'own'>(editing ? 'none' : 'catalog');
  const [q, setQ] = useState('');
  const [own, setOwn] = useState<{ title: string; emoji: string; difficulty: Difficulty }>({ title: '', emoji: '⭐', difficulty: 'easy' });
  const [timeEdit, setTimeEdit] = useState<{ i: number; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const mine = !editing || editing.created_by === me.id || me.role === 'owner';

  const nextTime = () => {
    const last = [...items].reverse().find((x) => x.time)?.time;
    return last ? shiftTime(last, 10) : '07:00';
  };
  const add = (x: OwnItem) => {
    if (items.length >= MAX) return Alert.alert(`Bir rutinde en çok ${MAX} görev olur.`);
    setItems((l) => [...l, { ...x, time: x.time ?? nextTime(), ...(repeat === 'weekly' ? { days: x.days ?? [1] } : {}) }]);
  };
  const results = useMemo(() => {
    const query = q.trim().toLocaleLowerCase('tr-TR');
    return templates
      .filter((t) => !ages.length || ages.every((a) => t.ages.includes(a)))
      .filter((t) => !query || t.title.toLocaleLowerCase('tr-TR').includes(query))
      .slice(0, 30);
  }, [q, ages]);
  const move = (i: number, d: -1 | 1) => setItems((l) => {
    const j = i + d;
    if (j < 0 || j >= l.length) return l;
    const c = [...l];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });
  const saveTime = () => {
    if (!timeEdit) return;
    const v = timeEdit.text.trim() ? normalizeTime(timeEdit.text) : '';
    if (v === null) return Alert.alert('Saat geçersiz', 'Saati 07:30 biçiminde yaz.');
    setItems((l) => l.map((x, k) => (k === timeEdit.i ? { ...x, time: v || undefined } : x)));
    setTimeEdit(null);
  };
  const toggleDay = (i: number, d: number) => setItems((l) => l.map((x, k) => {
    if (k !== i) return x;
    const days = x.days ?? [];
    const next = days.includes(d) ? days.filter((y) => y !== d) : [...days, d].sort();
    return { ...x, days: next.length ? next : days };
  }));

  const save = async () => {
    if (timeEdit) saveTime();
    if (!title.trim()) return Alert.alert('Rutine bir ad ver.');
    if (!items.length) return Alert.alert('En az bir görev ekle.');
    setBusy(true);
    try {
      const clean = items.map((x) => ({ ...x, ...(repeat === 'weekly' ? { days: x.days?.length ? x.days : [1] } : { days: undefined }) }))
        .map(({ days, time, ...x }) => ({ ...x, ...(time ? { time } : {}), ...(days ? { days } : {}) }));
      await saveOwnRoutine(me, { title, icon, repeat, ages, shared, items: clean }, editing?.id);
      track(editing ? 'routine.own_update' : 'routine.own_create', { n: clean.length });
      onSaved();
    } catch (e) {
      Alert.alert('Kaydedilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const remove = () => Alert.alert('Rutin silinsin mi?', 'Daha önce gönderilen öneriler etkilenmez.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: () => deleteOwnRoutine(editing!.id).then(() => { track('routine.own_delete'); onSaved(); })
      .catch((e) => Alert.alert('Silinemedi', (e as Error).message)) },
  ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <IconButton name="close" onPress={onClose} label="Kapat" />
          <Text style={styles.title}>{editing ? 'Rutini düzenle' : 'Yeni rutin'}</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40, gap: 10 }} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          {!mine && <Text style={[styles.small, { color: colors.medium.fg }]}>Bu rutini ekibinden biri kurdu; yalnız o ya da klinik sahibi değiştirebilir.</Text>}
          <Text style={styles.label}>Rutinin adı</Text>
          <Input value={title} onChangeText={setTitle} placeholder="Ör. Uyku öncesi sakinleşme" maxLength={60} editable={mine} />
          <Text style={styles.label}>Simge</Text>
          <View style={styles.icons}>
            {ICONS.map((n) => (
              <Pressable key={n} disabled={!mine} onPress={() => setIcon(n)} accessibilityRole="radio" accessibilityState={{ selected: icon === n }}
                style={[styles.icon, icon === n && styles.iconOn]}>
                <Ionicons name={n} size={20} color={icon === n ? '#fff' : colors.navy} />
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Ne zaman?</Text>
          <Segmented options={[{ id: 'weekdays' as const, label: 'Hafta içi' }, { id: 'daily' as const, label: 'Her gün' }, { id: 'weekly' as const, label: 'Görev günleri' }]}
            value={repeat} onChange={(r) => { if (mine) { setRepeat(r); if (r === 'weekly') setItems((l) => l.map((x) => ({ ...x, days: x.days ?? [1] }))); } }} />
          <Text style={styles.label}>Hangi yaş grupları için?</Text>
          <View style={styles.icons}>
            {AGES.map((a) => {
              const on = ages.includes(a);
              return (
                <Pressable key={a} disabled={!mine} onPress={() => setAges((l) => (on ? l.filter((x) => x !== a) : [...l, a]))}
                  accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={[styles.age, on && styles.iconOn]}>
                  <Text style={[styles.ageText, on && { color: '#fff' }]}>{AGE_LABEL[a]}</Text>
                </Pressable>
              );
            })}
          </View>
          <Text style={styles.small}>Seçmezsen her yaş için sayılır. Seçersen katalogda yalnız o yaşlara uygun görevler çıkar.</Text>

          <Text style={styles.label}>{`Görevler (${items.length} / ${MAX})`}</Text>
          {items.length > 0 && (
            <View style={styles.list}>
              {items.map((x, i) => (
                <View key={`${x.title}-${i}`} style={[styles.row, i > 0 && styles.rowLine]}>
                  {timeEdit?.i === i ? (
                    <TextInput value={timeEdit.text} onChangeText={(t) => setTimeEdit({ i, text: t })} onBlur={saveTime} onSubmitEditing={saveTime}
                      autoFocus maxLength={5} keyboardType="numbers-and-punctuation" placeholder="07:30" style={styles.timeInput} />
                  ) : (
                    <Pressable disabled={!mine} onPress={() => setTimeEdit({ i, text: x.time ?? '' })} style={styles.timeBtn} accessibilityLabel={`${x.title} saati`}>
                      <Text style={styles.time}>{x.time || '––:––'}</Text>
                    </Pressable>
                  )}
                  <Text style={{ fontSize: 18 }}>{x.emoji}</Text>
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.task}>{x.title}</Text>
                    {repeat === 'weekly' && (
                      <View style={styles.daysMini}>
                        {DAY_SHORT.map((d, k) => {
                          const on = (x.days ?? []).includes(k + 1);
                          return (
                            <Pressable key={d} disabled={!mine} onPress={() => toggleDay(i, k + 1)} style={[styles.dayMini, on && styles.iconOn]}>
                              <Text style={[styles.dayMiniText, on && { color: '#fff' }]}>{d}</Text>
                            </Pressable>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  {mine && (
                    <View style={{ flexDirection: 'row', gap: 2 }}>
                      <IconButton name="chevron-up" label="Yukarı" size={16} onPress={() => move(i, -1)} />
                      <IconButton name="chevron-down" label="Aşağı" size={16} onPress={() => move(i, 1)} />
                      <IconButton name="close" label="Çıkar" size={16} onPress={() => setItems((l) => l.filter((_, k) => k !== i))} />
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          {mine && items.length < MAX && (
            <>
              <Segmented options={[{ id: 'catalog' as const, label: 'Katalogdan ekle' }, { id: 'own' as const, label: 'Kendin yaz' }]}
                value={adding === 'own' ? 'own' : 'catalog'} onChange={setAdding} />
              {adding === 'catalog' && (
                <>
                  <Input value={q} onChangeText={setQ} placeholder="Görev ara (ör. diş, kitap)" />
                  <View style={styles.list}>
                    {results.map((t, i) => (
                      <Pressable key={t.id} onPress={() => add({ key: t.id, title: t.title, emoji: t.emoji, skill: t.skill, category: t.category, difficulty: t.difficulty, coins: t.coins })}
                        style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: '#F7F8FA' }]} accessibilityRole="button">
                        <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
                        <Text style={[styles.task, { flex: 1, fontWeight: '500' }]}>{t.title}</Text>
                        <DifficultyBadge d={t.difficulty} coins={t.coins} />
                        <Ionicons name="add-circle-outline" size={20} color={colors.navy} />
                      </Pressable>
                    ))}
                    {!results.length && <Text style={[styles.small, { padding: 14 }]}>Sonuç yok.</Text>}
                  </View>
                </>
              )}
              {adding === 'own' && (
                <View style={{ gap: 8 }}>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <View style={{ width: 64 }}><Input value={own.emoji} onChangeText={(e) => setOwn({ ...own, emoji: e })} maxLength={4} /></View>
                    <View style={{ flex: 1 }}><Input value={own.title} onChangeText={(t) => setOwn({ ...own, title: t })} placeholder="Görevin adı" maxLength={120} /></View>
                  </View>
                  <Segmented options={[{ id: 'easy' as const, label: 'Kolay' }, { id: 'medium' as const, label: 'Orta' }, { id: 'hard' as const, label: 'Zor' }]}
                    value={own.difficulty} onChange={(d) => setOwn({ ...own, difficulty: d })} />
                  <Pressable onPress={() => { if (!own.title.trim()) return; add({ title: own.title.trim(), emoji: own.emoji || '⭐', difficulty: own.difficulty }); setOwn({ title: '', emoji: '⭐', difficulty: 'easy' }); }}
                    style={styles.addBtn} accessibilityRole="button">
                    <Ionicons name="add" size={18} color={colors.navy} />
                    <Text style={styles.addText}>Görevi ekle</Text>
                  </Pressable>
                </View>
              )}
            </>
          )}

          {teamSize > 1 && (
            <View style={styles.shareRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.task}>Ekibe açık</Text>
                <Text style={styles.small}>Kliniğindeki diğer uzmanlar bu rutini görür ve önerebilir; değiştiremez.</Text>
              </View>
              <Toggle value={shared} onChange={(v) => mine && setShared(v)} />
            </View>
          )}

          {mine && (
            <Pressable onPress={save} disabled={busy} style={[styles.cta, busy && { opacity: 0.5 }]} accessibilityRole="button">
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Rutini kaydet</Text>}
            </Pressable>
          )}
          {editing && mine && (
            <Pressable onPress={remove} hitSlop={8} style={{ alignSelf: 'center', marginTop: 8 }} accessibilityRole="button">
              <Text style={[styles.addText, { color: colors.danger }]}>Rutini sil</Text>
            </Pressable>
          )}
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
  label: { fontSize: 13, fontWeight: '600', color: colors.muted, marginTop: 6 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  icons: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  icon: { width: 42, height: 42, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  age: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  ageText: { fontSize: 13, fontWeight: '600', color: colors.navy },
  list: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  timeBtn: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, backgroundColor: '#FAFBFC' },
  time: { fontSize: 13, fontWeight: '700', color: colors.navy, fontVariant: ['tabular-nums'] },
  timeInput: { width: 62, borderWidth: 1.5, borderColor: colors.navy, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 4, fontSize: 13, fontWeight: '700', color: colors.navy },
  task: { fontSize: 14, fontWeight: '600', color: colors.navy },
  daysMini: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  dayMini: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  dayMiniText: { fontSize: 11, fontWeight: '600', color: colors.navy },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 44, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.navy, backgroundColor: '#fff' },
  addText: { fontSize: 14, fontWeight: '700', color: colors.navy },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, padding: 14, marginTop: 6 },
  cta: { height: 52, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
