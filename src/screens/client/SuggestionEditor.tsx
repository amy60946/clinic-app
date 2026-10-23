import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, Modal, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, Difficulty, difficultyMeta, MAX_TASK_COINS } from '../../theme';
import { DifficultyBadge, IconButton, Segmented, Toggle, Label, ChipBar } from '../../components/ui';
import DateField from '../../components/DateField';
import { categories, templates, Template, ageGroups, AgeGroup } from '../../templates';
import { SKILL_LABEL, skillOf, normalizeCategory } from '../../skills';
import { DAY_SHORT, fromISO, todayISO } from '../../dates';
import type { Suggestion, SuggestionInput, RepeatKind, Category } from '../../lib/clinic';

// Uzmanın görev önerisi: ParentApp "Görev Oluştur" (şablon seçimi) + "Görev ayrıntıları" ekranlarının birebir aynısı.
// Ebeveyn kabul edince ParentApp görevi bu alanlarla açar (ortak/sozlesme/akislar.md 5.4).
// Farklar yalnız uzmana özgü: tek çocuk (danışan), "Ebeveyne not" alanı, "Görevi ata" yerine "Öneriyi gönder".

type Filter = 'all' | Category;

export default function SuggestionEditor({ visible, childName, editing, onClose, onSubmit, onWithdraw }: {
  visible: boolean;
  childName: string;
  editing?: Suggestion | null;
  onClose: () => void;
  onSubmit: (list: SuggestionInput[]) => Promise<void>;
  onWithdraw?: () => void;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible && <Editor childName={childName} editing={editing ?? undefined} onClose={onClose} onSubmit={onSubmit} onWithdraw={onWithdraw} />}
    </Modal>
  );
}

function Editor({ childName, editing, onClose, onSubmit, onWithdraw }: {
  childName: string; editing?: Suggestion; onClose: () => void;
  onSubmit: (list: SuggestionInput[]) => Promise<void>; onWithdraw?: () => void;
}) {
  const [step, setStep] = useState<'pick' | 'details'>(editing ? 'details' : 'pick');
  const [picked, setPicked] = useState<Template[]>([]);
  const [custom, setCustom] = useState(false);

  if (step === 'pick') {
    return (
      <TemplatePicker
        onClose={onClose}
        onNext={(t) => { setPicked(t); setCustom(false); setStep('details'); }}
        onCustom={() => { setPicked([]); setCustom(true); setStep('details'); }}
      />
    );
  }
  return (
    <Details
      childName={childName} editing={editing} picked={picked} custom={custom}
      onBack={editing ? onClose : () => setStep('pick')} onClose={onClose} onSubmit={onSubmit} onWithdraw={onWithdraw}
    />
  );
}

/* ---------- 1. Görev Oluştur: şablon seçimi (ParentApp CreateTaskScreen) ---------- */

function TemplatePicker({ onClose, onNext, onCustom }: {
  onClose: () => void; onNext: (t: Template[]) => void; onCustom: () => void;
}) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [age, setAge] = useState<'all' | AgeGroup>('all');
  const [picked, setPicked] = useState<string[]>([]);

  const list = useMemo(() => {
    const q = query.trim().toLocaleLowerCase('tr');
    return templates.filter((t) => (filter === 'all' || t.categories.includes(filter))
      && (age === 'all' || t.ages.includes(age))
      && (!q || t.title.toLocaleLowerCase('tr').includes(q)))
      // seçili kategori ana kategorisi olan şablonlar önce (öbürleri yalnız süzgeç etiketiyle gelir)
      .sort((a, b) => (filter === 'all' ? 0 : Number(b.category === filter) - Number(a.category === filter)));
  }, [filter, age, query]);

  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <IconButton name="chevron-back" label="Geri" onPress={onClose} />
        <Text style={styles.topTitle}>Görev Öner</Text>
        <IconButton name="close" label="Kapat" onPress={onClose} />
      </View>

      <View style={styles.search}>
        <Ionicons name="search" size={18} color={colors.muted} />
        <TextInput value={query} onChangeText={setQuery} placeholder="Şablon ara" placeholderTextColor={colors.muted}
          style={{ flex: 1, fontSize: 15, color: colors.navy }} />
      </View>

      <View style={{ height: 64, justifyContent: 'center' }}>
        <ChipBar<Filter>
          options={[{ id: 'all', label: 'Tümü', icon: 'apps-outline' }, ...categories.map((c) => ({ id: c.id as Filter, label: `${c.emoji}  ${c.label}` }))]}
          value={filter} onChange={setFilter} inset={20}
        />
      </View>
      <View style={{ height: 52, justifyContent: 'center' }}>
        <ChipBar<'all' | AgeGroup>
          options={[{ id: 'all', label: 'Tüm yaşlar' }, ...ageGroups.map((a) => ({ id: a.id as 'all' | AgeGroup, label: a.label }))]}
          value={age} onChange={setAge} inset={20}
        />
      </View>

      <Text style={styles.hint}>Birden fazla görev seçip tek seferde önerebilirsiniz.</Text>

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 220, gap: 10 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
        {list.length === 0 && <Text style={{ color: colors.muted, textAlign: 'center', marginTop: 40 }}>Sonuç bulunamadı.</Text>}
        {list.map((t) => {
          const on = picked.includes(t.id);
          return (
            <Pressable key={t.id} onPress={() => toggle(t.id)} style={[styles.card, on && { borderColor: colors.navy }]}>
              <View style={[styles.radio, on && { backgroundColor: colors.navy, borderColor: colors.navy }]}>
                {on && <Ionicons name="checkmark" size={14} color="#fff" />}
              </View>
              <Text style={{ fontSize: 22 }}>{t.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.cardTitle}>{t.title}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
                  <DifficultyBadge d={t.difficulty} coins={t.coins} />
                  <Text style={{ fontSize: 12, color: colors.muted }}>{SKILL_LABEL[t.skill]}</Text>
                </View>
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={styles.bottomPick}>
        {picked.length > 0 && (
          <Pressable style={[styles.cta, { marginBottom: 12 }]} onPress={() => onNext(templates.filter((t) => picked.includes(t.id)))}>
            <Text style={styles.ctaText}>Devam · {picked.length} görev</Text>
          </Pressable>
        )}
        <Text style={{ fontSize: 12, color: colors.muted, textAlign: 'center', marginBottom: 8 }}>Aradığını bulamadın mı?</Text>
        <Pressable style={[styles.cta, picked.length > 0 && { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line }]} onPress={onCustom}>
          <Text style={[styles.ctaText, picked.length > 0 && { color: colors.navy }]}>
            <Text style={{ fontSize: 22, lineHeight: 22 }}>+ </Text>Yeni bir görev oluştur
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

/* ---------- 2. Görev ayrıntıları (ParentApp TaskDetailsScreen) ---------- */

function Details({ childName, editing, picked, custom, onBack, onClose, onSubmit, onWithdraw }: {
  childName: string; editing?: Suggestion; picked: Template[]; custom: boolean;
  onBack: () => void; onClose: () => void; onSubmit: (list: SuggestionInput[]) => Promise<void>; onWithdraw?: () => void;
}) {
  const initialDifficulty: Difficulty = editing?.difficulty ?? picked[0]?.difficulty ?? 'easy';
  const [title, setTitle] = useState(editing?.title ?? '');
  const [description, setDescription] = useState(editing?.description ?? '');
  const [difficulty, setDifficulty] = useState<Difficulty>(initialDifficulty);
  const [coins, setCoins] = useState(String(editing?.coins ?? picked[0]?.coins ?? difficultyMeta[initialDifficulty].coins));
  // Kendi yazdığı görevde kategori seçilir; beceri kategoriden gelir (ortak ekonomi.md 5B)
  const [category, setCategory] = useState(normalizeCategory(editing?.category));
  const [startDate, setStartDate] = useState<string>(editing?.start_date || todayISO());
  const [recurring, setRecurring] = useState(editing?.recurring ?? false);
  const [repeatKind, setRepeatKind] = useState<RepeatKind>(editing?.repeat_kind ?? 'daily');
  const [repeatDays, setRepeatDays] = useState<number[]>(editing?.repeat_days ?? []);
  const [endDate, setEndDate] = useState<string | undefined>(editing?.end_date ?? undefined);
  const [reminder, setReminder] = useState<string | undefined>(editing?.reminder ?? undefined);
  const [requiresReview, setRequiresReview] = useState(editing?.requires_review ?? true);
  const [note, setNote] = useState(editing?.note ?? '');
  const [busy, setBusy] = useState(false);

  const isPast = startDate < todayISO();
  const canTitle = !!editing || custom;

  // Haftalık/aylık seçilince gün seçili değilse başlangıç tarihinin gününü öner
  const chooseKind = (k: RepeatKind) => {
    setRepeatKind(k);
    const d = fromISO(startDate);
    if (k === 'weekly') setRepeatDays(repeatKind === 'weekly' && repeatDays.length ? repeatDays : [((d.getDay() + 6) % 7) + 1]);
    else if (k === 'monthly') setRepeatDays(repeatKind === 'monthly' && repeatDays.length ? repeatDays : [d.getDate()]);
    else setRepeatDays([]);
  };
  const toggleDay = (n: number) =>
    setRepeatDays((p) => (p.includes(n) ? p.filter((x) => x !== n) : [...p, n].sort((a, b) => a - b)));

  const submit = async () => {
    if (canTitle && !title.trim()) return Alert.alert('Görev adı gerekli');
    if (canTitle && !category) return Alert.alert('Kategori seç', 'Görevin becerisi kategoriden gelir.');
    if (recurring && endDate && endDate < startDate) return Alert.alert('Son tarih başlangıçtan önce olamaz');
    if (recurring && repeatKind !== 'daily' && repeatDays.length === 0) {
      return Alert.alert(repeatKind === 'weekly' ? 'Haftanın en az bir gününü seç' : 'Ayın en az bir gününü seç');
    }
    const common = {
      description: description.trim(),
      difficulty,
      coins: Math.min(MAX_TASK_COINS, Math.max(0, parseInt(coins || '0', 10) || 0)),
      start_date: startDate,
      recurring,
      repeat_kind: recurring ? repeatKind : ('daily' as RepeatKind),
      repeat_days: recurring && repeatKind !== 'daily' ? repeatDays : [],
      end_date: recurring ? endDate ?? null : null,
      reminder: reminder ?? null,
      requires_review: requiresReview,
      note: note.trim(),
    };
    const list: SuggestionInput[] = editing
      ? [{ ...common, title: title.trim(), emoji: editing.emoji, skill: skillOf(category!), category, template_key: editing.template_key }]
      : custom
        ? [{ ...common, title: title.trim(), emoji: '⭐', skill: skillOf(category!), category, template_key: null }]
        : picked.map((t) => ({ ...common, title: t.title, emoji: t.emoji, skill: t.skill, category: t.category, template_key: t.id }));
    setBusy(true);
    try {
      await onSubmit(list);
    } catch (e) {
      Alert.alert(editing ? 'Öneri güncellenemedi' : 'Öneri gönderilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.top}>
        <IconButton name="chevron-back" label="Geri" onPress={onBack} />
        <Text style={styles.topTitle}>{editing ? 'Öneriyi düzenle' : 'Görev ayrıntıları'}</Text>
        <IconButton name="close" label="Kapat" onPress={onClose} />
      </View>

      {isPast && (
        <View style={styles.banner}>
          <Ionicons name="information-circle" size={18} color={colors.medium.fg} />
          <Text style={{ flex: 1, fontSize: 13, color: colors.medium.fg }}>Geçmiş bir gün seçtiniz; ebeveyn kabul ederse görev o gün başlar.</Text>
        </View>
      )}

      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 140 }} keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
        {canTitle ? (
          <>
            <Label>Görev adı</Label>
            <TextInput value={title} onChangeText={setTitle} placeholder="Örn. Çantanı hazırla" placeholderTextColor={colors.muted}
              style={styles.input} maxLength={120} />
            <Label>Kategori</Label>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {categories.map((c) => {
                const on = category === c.id;
                return (
                  <Pressable key={c.id} onPress={() => setCategory(c.id)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    style={[styles.catChip, on && { borderColor: colors.navy, backgroundColor: '#fff' }]}>
                    <Text style={{ fontSize: 13, color: colors.navy, fontWeight: on ? '700' : '500' }}>{c.emoji}  {c.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.skillHint}>
              {category ? `Bu görev çocuğun oyundaki ${SKILL_LABEL[skillOf(category)]} becerisine yıldız kazandırır.` : 'Kategoriyi seç; görevin becerisi kategoriden gelir.'}
            </Text>
          </>
        ) : (
          <>
            <Label>Seçilen görevler</Label>
            {picked.map((t) => (
              <Text key={t.id} style={{ fontSize: 15, color: colors.navy, marginBottom: 4 }}>{t.emoji}  {t.title}</Text>
            ))}
          </>
        )}

        <Label>Açıklama (isteğe bağlı)</Label>
        <TextInput value={description} onChangeText={setDescription} multiline maxLength={1000}
          placeholder="Çocuğa kısa bir ipucu yazın" placeholderTextColor={colors.muted}
          style={[styles.input, { minHeight: 76, textAlignVertical: 'top' }]} />

        <Label>Çocuk ve ödül</Label>
        <View style={{ backgroundColor: '#fff', borderRadius: radius.md, padding: 14, gap: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <View style={styles.initial}>
              <Text style={{ fontWeight: '700', color: colors.navy }}>{(childName || '?').slice(0, 1).toLocaleUpperCase('tr-TR')}</Text>
            </View>
            <Text style={{ flex: 1, fontSize: 15, fontWeight: '600', color: colors.navy }}>{childName}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
            <View style={{ flex: 1 }}>
              <Segmented<Difficulty>
                options={(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => ({ id: d, label: difficultyMeta[d].label }))}
                value={difficulty}
                onChange={(d) => { setDifficulty(d); setCoins(String(difficultyMeta[d].coins)); }}
              />
            </View>
            <View style={styles.coinBox}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} />
              <TextInput value={coins} keyboardType="number-pad" maxLength={2} accessibilityLabel="Ödül (coin)"
                onChangeText={(v) => {
                  const digits = v.replace(/[^0-9]/g, '');
                  setCoins(digits && Number(digits) > MAX_TASK_COINS ? String(MAX_TASK_COINS) : digits);
                }}
                style={{ width: 36, fontSize: 14, fontWeight: '700', color: colors.navy, padding: 0 }} />
            </View>
          </View>
        </View>

        <Label>Başlangıç tarihi</Label>
        <DateField mode="date" value={startDate} onChange={(v) => v && setStartDate(v)} placeholder="Tarih seç" />

        <Label>Program</Label>
        <Segmented
          options={[{ id: 'once', label: 'Tek seferlik' }, { id: 'repeat', label: 'Tekrarlayan' }]}
          value={recurring ? 'repeat' : 'once'}
          onChange={(v) => setRecurring(v === 'repeat')}
        />
        {recurring && (
          <View style={styles.repeatBox}>
            <Segmented<RepeatKind>
              options={[{ id: 'daily', label: 'Her gün' }, { id: 'weekly', label: 'Haftalık' }, { id: 'monthly', label: 'Aylık' }]}
              value={repeatKind}
              onChange={chooseKind}
            />
            {repeatKind === 'weekly' && (
              <>
                <Text style={styles.repeatHint}>Hangi günler? (birden fazla seçebilirsin)</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  {DAY_SHORT.map((d, i) => <DayDot key={d} label={d} on={repeatDays.includes(i + 1)} onPress={() => toggleDay(i + 1)} size={40} />)}
                </View>
              </>
            )}
            {repeatKind === 'monthly' && (
              <>
                <Text style={styles.repeatHint}>Ayın hangi günleri? (birden fazla seçebilirsin)</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                  {Array.from({ length: 31 }, (_, i) => (
                    <DayDot key={i} label={String(i + 1)} on={repeatDays.includes(i + 1)} onPress={() => toggleDay(i + 1)} size={38} />
                  ))}
                </View>
                {repeatDays.some((x) => x > 28) && <Text style={styles.sub}>29, 30 ve 31 olmayan aylarda görev ayın son gününe atanır.</Text>}
              </>
            )}
            <View style={styles.summary}>
              <Ionicons name="repeat" size={16} color={colors.navy} />
              <Text style={{ flex: 1, fontSize: 13, fontWeight: '600', color: colors.navy }}>{repeatSummary(repeatKind, repeatDays)}</Text>
            </View>
            <Text style={[styles.sub, { marginTop: 4 }]}>Son tarih (isteğe bağlı · boş bırakırsan sürekli tekrar eder)</Text>
            <DateField mode="date" value={endDate} onChange={setEndDate} placeholder="Son tarih seç" clearable />
          </View>
        )}

        <Label>Hatırlatma saati (isteğe bağlı)</Label>
        <Text style={[styles.sub, { marginTop: -2, marginBottom: 8 }]}>
          Bir saat seçersen görev günü o saatte çocuğa hatırlatma gider. Boş bırakırsan hatırlatma gönderilmez.
        </Text>
        <DateField mode="time" value={reminder} onChange={setReminder} placeholder="Saat seç (ör. 19:00)" clearable />

        <View style={[styles.switchRow, { marginTop: 20 }]}>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 15, fontWeight: '600', color: colors.navy }}>İnceleme gerekli</Text>
            <Text style={styles.sub}>Kapalıysa tamamlanınca otomatik onaylanır</Text>
          </View>
          <Toggle value={requiresReview} onChange={setRequiresReview} />
        </View>

        <Label>Ebeveyne not (isteğe bağlı)</Label>
        <TextInput value={note} onChangeText={setNote} multiline maxLength={300}
          placeholder="Neden bu görev, ebeveyn nasıl desteklesin?" placeholderTextColor={colors.muted}
          style={[styles.input, { minHeight: 64, textAlignVertical: 'top' }]} />
        <Text style={styles.sub}>Ebeveyn öneriyi ParentApp'te görür; ekleyip eklememek ve ayarları değiştirmek ebeveynin kararıdır.</Text>

        {editing && onWithdraw && (
          <Pressable onPress={onWithdraw} style={{ marginTop: 32, alignItems: 'center', padding: 12 }}>
            <Text style={{ color: colors.danger, fontWeight: '600' }}>Öneriyi geri çek</Text>
          </Pressable>
        )}
      </ScrollView>

      <View style={styles.bottom}>
        <Pressable style={[styles.cta, busy && { opacity: 0.7 }]} onPress={submit} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : (
            <Text style={styles.ctaText}>{editing ? 'Kaydet' : picked.length > 1 ? `Önerileri gönder · ${picked.length}` : 'Öneriyi gönder'}</Text>
          )}
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function DayDot({ label, on, onPress, size }: { label: string; on: boolean; onPress: () => void; size: number }) {
  return (
    <Pressable onPress={onPress} accessibilityLabel={label} accessibilityState={{ selected: on }}
      style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? colors.navy : '#F1F2F6' }}>
      <Text style={{ fontSize: label.length > 2 ? 11 : 13, fontWeight: '700', color: on ? '#fff' : colors.navy }}>{label}</Text>
    </Pressable>
  );
}

export function repeatSummary(kind: RepeatKind, days: number[]) {
  if (kind === 'daily') return 'Her gün tekrar eder';
  if (!days.length) return 'Gün seçilmedi';
  if (kind === 'weekly') {
    if (days.length === 7) return 'Haftada 7 gün (her gün)';
    return `Haftada ${days.length} gün: ${days.map((d) => DAY_SHORT[d - 1]).join(', ')}`;
  }
  return `Ayda ${days.length} kez: her ayın ${days.join(', ')}. günü`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 8 },
  topTitle: { fontSize: 16, fontWeight: '700', color: colors.navy },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, marginHorizontal: 20, marginTop: 14, paddingHorizontal: 14, height: 46 },
  hint: { fontSize: 12, color: colors.muted, paddingHorizontal: 20, marginBottom: 2 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, padding: 14, borderWidth: 1.5, borderColor: 'transparent' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.navy },
  catChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.bg },
  skillHint: { fontSize: 12, color: colors.muted, marginTop: 8 },
  bottomPick: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: '#fff', paddingHorizontal: 20, paddingTop: 14, paddingBottom: 28 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.medium.bg, marginHorizontal: 20, marginTop: 12, padding: 12, borderRadius: radius.sm },
  input: { backgroundColor: '#fff', borderRadius: radius.md, padding: 14, fontSize: 15, color: colors.navy },
  initial: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.today, alignItems: 'center', justifyContent: 'center' },
  coinBox: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECEEF3', borderRadius: radius.sm, paddingHorizontal: 12, height: 40 },
  repeatBox: { backgroundColor: '#fff', borderRadius: radius.md, padding: 14, marginTop: 10, gap: 10 },
  repeatHint: { fontSize: 12, color: colors.muted },
  summary: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: colors.today, borderRadius: radius.sm, padding: 10 },
  sub: { fontSize: 12, color: colors.muted, marginTop: 6, marginBottom: 6 },
  switchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: radius.md, padding: 14 },
  bottom: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: colors.bg, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 28 },
  cta: { height: 52, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
