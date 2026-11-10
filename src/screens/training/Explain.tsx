// İlk kullanıcıya anlatım (kullanıcı isteği 11 Kasım 2026: "Uygulama görevleri ve Hızlı yapılacaklar'ı örneklerle, açık, temiz, sade anlat").
// Sekmenin başında kısa bir kart: ne olduğu tek cümle, üç adımda nasıl işlediği, dokununca formu dolduran üç örnek.
// "Anladım" ile tek satıra iner (bu cihazda hatırlanır); satıra dokununca yeniden açılır. Liste boşken hep açıktır.
// Örnekler özgün; tanı, tedavi iddiası ya da ceza içermez.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Measure, measureLabel } from '../../lib/training';

export type TaskExample = { title: string; description: string; measure: Measure; entry: string };
export const TASK_EXAMPLES: TaskExample[] = [
  { title: 'Geçişten önce iki uyarı ver', measure: 'accuracy', entry: '5 geçişin 4\'ünde uyardım',
    description: 'Ekranı kapatma ya da sofraya gelme gibi zor bir geçişte 5 dakika ve 2 dakika kala haber ver. Kaç geçişte uyardığını ve kaçında çocuğun sakin geçtiğini gir.' },
  { title: 'Günde 5 kez adıyla öv', measure: 'frequency', entry: 'Bugün 6 kez övdüm',
    description: 'Beğendiğin davranışı hemen ve ne yaptığını söyleyerek öv ("Ayakkabılarını yerine koydun, teşekkürler"). Gün sonunda kaç kez övdüğünü gir.' },
  { title: '10 dakika özel oyun zamanı', measure: 'duration', entry: 'Bugün 12 dakika oynadık',
    description: 'Her gün çocuğunun seçtiği oyunu, telefonu uzağa koyarak birlikte oyna. Kaç dakika sürdüğünü gir.' },
];
export type TodoExample = { title: string; description: string };
export const TODO_EXAMPLES: TodoExample[] = [
  { title: 'Görünür bir zamanlayıcı hazırla', description: 'Geçiş uyarılarında kullanmak için çocuğunun görebileceği bir kum saati ya da zamanlayıcı.' },
  { title: 'Ödül listesini birlikte yazın', description: 'Çocuğunun isteyeceği beş küçük ödülü birlikte belirleyin ve görünür bir yere asın.' },
  { title: 'Akşam rutinini buzdolabına as', description: 'Akşam yemeğinden yatağa kadarki adımları resimli bir listeye dök.' },
];

const KEY = (kind: string) => `clinic.explain.v1.${kind}`;
const COPY = {
  tasks: {
    title: 'Uygulama görevi nedir?',
    lead: 'Ebeveynin evde tekrar tekrar uyguladığı beceri. Her uyguladığında kısa bir kayıt girer.',
    steps: ['Sen görevi ve ölçümü yazarsın', 'Ebeveyn evde uygular, kayıt girer', 'Kayıtlar burada tablo ve grafik olur'],
    other: 'Bir kez yapılacak iş mi? Onu Hızlı yapılacaklar\'a ekle.',
  },
  todos: {
    title: 'Hızlı yapılacak nedir?',
    lead: 'Ebeveynin bir kez yapıp işaretlediği küçük iş. Tekrarlanmaz, ölçüm yoktur.',
    steps: ['Sen işi yazarsın', 'Ebeveyn yapınca işaretler', 'Nasıl geçtiğini 1–5 ile söyler; burada görürsün'],
    other: 'Tekrarlanan bir beceri mi? Onu Uygulama görevleri\'ne ekle.',
  },
} as const;

export function ExplainCard<K extends 'tasks' | 'todos'>({ kind, empty, onExample }: {
  kind: K; empty: boolean; onExample: (e: K extends 'tasks' ? TaskExample : TodoExample) => void;
}) {
  const c = COPY[kind];
  const [seen, setSeen] = useState(false);
  const [open, setOpen] = useState(true);
  useEffect(() => { AsyncStorage.getItem(KEY(kind)).then((v) => { if (v === '1') { setSeen(true); setOpen(false); } }).catch(() => {}); }, [kind]);
  const close = () => { setOpen(false); setSeen(true); AsyncStorage.setItem(KEY(kind), '1').catch(() => {}); };
  const shown = open || empty;
  if (!shown) {
    return (
      <Pressable onPress={() => setOpen(true)} accessibilityRole="button" style={({ pressed }) => [s.closed, pressed && { opacity: 0.8 }]}>
        <Ionicons name="bulb-outline" size={16} color={colors.navy} />
        <Text style={s.closedText}>{c.title} Örnekleri gör</Text>
        <Ionicons name="chevron-down" size={15} color={colors.navy} />
      </Pressable>
    );
  }
  const examples = (kind === 'tasks' ? TASK_EXAMPLES : TODO_EXAMPLES) as (TaskExample | TodoExample)[];
  return (
    <View style={s.card}>
      <View style={s.head}>
        <Ionicons name="bulb-outline" size={18} color={colors.navy} />
        <Text style={s.title}>{c.title}</Text>
        {!empty && (
          <Pressable onPress={close} hitSlop={8} accessibilityRole="button" style={s.gotIt}><Text style={s.gotItText}>{seen ? 'Kapat' : 'Anladım'}</Text></Pressable>
        )}
      </View>
      <Text style={s.lead}>{c.lead}</Text>
      <View style={s.steps}>
        {c.steps.map((t, i) => (
          <View key={t} style={s.step}>
            <View style={s.num}><Text style={s.numText}>{i + 1}</Text></View>
            <Text style={s.stepText}>{t}</Text>
          </View>
        ))}
      </View>
      <Text style={s.sec}>Örnekler · dokun, form dolu açılsın</Text>
      {examples.map((e) => (
        <Pressable key={e.title} onPress={() => onExample(e as any)} accessibilityRole="button" accessibilityLabel={`Örnek: ${e.title}`}
          style={({ pressed }) => [s.ex, pressed && { opacity: 0.8 }]}>
          <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 0, gap: 3 }}>
            <View style={s.exTop}>
              <Text style={s.exTitle}>{e.title}</Text>
              {'measure' in e && <Text style={s.chip}>{measureLabel(e.measure)}</Text>}
            </View>
            <Text style={s.exSub}>{'entry' in e ? `Ebeveyn şunu girer: ${e.entry}` : e.description}</Text>
          </View>
          <Ionicons name="add-circle-outline" size={20} color={colors.navy} />
        </Pressable>
      ))}
      <Text style={s.other}>{c.other}</Text>
    </View>
  );
}

// Ekleme penceresinde: "Örnekten doldur" çipleri (yalnız yeni eklerken)
export function ExampleChips<T extends { title: string }>({ items, onPick }: { items: T[]; onPick: (e: T) => void }) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={s.sec}>Örnekten doldur</Text>
      <View style={s.chips}>
        {items.map((e) => (
          <Pressable key={e.title} onPress={() => onPick(e)} accessibilityRole="button" style={({ pressed }) => [s.pick, pressed && { opacity: 0.8 }]}>
            <Text style={s.pickText}>{e.title}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#F4F6FB', borderWidth: 1, borderColor: '#DCE2F0', borderRadius: 12, padding: 14, gap: 10 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 15, fontWeight: '700', color: colors.navy, flexGrow: 1, flexShrink: 1 },
  gotIt: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  gotItText: { fontSize: 12.5, fontWeight: '700', color: colors.navy },
  lead: { fontSize: 14, color: colors.text, lineHeight: 20 },
  steps: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  step: { flexDirection: 'row', alignItems: 'center', gap: 8, flexGrow: 1, flexBasis: 190, minWidth: 0, backgroundColor: '#fff', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 10 },
  num: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  numText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  stepText: { fontSize: 13, color: colors.text, flexShrink: 1, lineHeight: 18 },
  sec: { fontSize: 11.5, fontWeight: '700', color: colors.muted, letterSpacing: 0.4, textTransform: 'uppercase' },
  ex: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  exTop: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 8, rowGap: 4 },
  exTitle: { fontSize: 14, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  chip: { fontSize: 11.5, fontWeight: '700', color: colors.navy, backgroundColor: '#E6EAF5', borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden' },
  exSub: { fontSize: 12.5, color: colors.muted, lineHeight: 17, flexShrink: 1 },
  other: { fontSize: 12.5, color: colors.muted },
  closed: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', maxWidth: '100%', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: '#F4F6FB', borderWidth: 1, borderColor: '#DCE2F0' },
  closedText: { fontSize: 13, fontWeight: '600', color: colors.navy, flexShrink: 1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pick: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, backgroundColor: '#F4F6FB', borderWidth: 1, borderColor: '#DCE2F0' },
  pickText: { fontSize: 12.5, fontWeight: '600', color: colors.navy },
});
