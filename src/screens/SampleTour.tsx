import React from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius } from '../theme';
import type { Tab } from './client/ClientScreen';

// "Başlarken" (ana ekran) ve örnek aile turu. Joon'un "Get started" + "sample patient" işlevinin karşılığı; metinler özgün.
// Örnek aile gerçek danışan listesine karışmaz (Joon'da karışıyor): yalnız bu karttan ve boş listeden açılır.

const SAMPLE_KEY = (id: string) => `clinic.sample.seen.v1.${id}`;
const HIDE_KEY = (id: string) => `clinic.start.hidden.v1.${id}`;

export async function startFlags(userId: string): Promise<{ sampleSeen: boolean; hidden: boolean }> {
  try {
    const [s, h] = await Promise.all([AsyncStorage.getItem(SAMPLE_KEY(userId)), AsyncStorage.getItem(HIDE_KEY(userId))]);
    return { sampleSeen: s === '1', hidden: h === '1' };
  } catch {
    return { sampleSeen: false, hidden: false };
  }
}
export const markSampleSeen = (userId: string) => AsyncStorage.setItem(SAMPLE_KEY(userId), '1').catch(() => {});
export const hideStart = (userId: string) => AsyncStorage.setItem(HIDE_KEY(userId), '1').catch(() => {});

// Ana ekrandaki kart: iki adım, tamamlanan işaretli. İkisi de bitince ya da kapatılınca görünmez.
export function StartCard({ sampleSeen, invited, onSample, onInvite, onHide }: {
  sampleSeen: boolean; invited: boolean; onSample: () => void; onInvite: () => void; onHide: () => void;
}) {
  const items = [
    { done: sampleSeen, title: 'Örnek aileyi incele', sub: 'Uydurma bir ailenin 8 haftalık verisiyle ekranları gez', icon: 'sparkles-outline' as const, on: onSample },
    { done: invited, title: 'İlk aileni davet et', sub: 'Ebeveyn onaylayınca çocuk danışanların arasında görünür', icon: 'mail-outline' as const, on: onInvite },
  ];
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Text style={[styles.cardTitle, { flex: 1 }]}>Başlarken</Text>
        <Pressable onPress={onHide} hitSlop={8} accessibilityLabel="Başlarken kartını kapat">
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </View>
      {items.map((x, i) => (
        <Pressable key={x.title} onPress={x.on} accessibilityRole="button"
          style={({ pressed }) => [styles.item, i > 0 && styles.line, pressed && { opacity: 0.8 }]}>
          <Ionicons name={x.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={x.done ? colors.ok : colors.faint} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.itemTitle, x.done && { color: colors.muted }]}>{x.title}</Text>
            <Text style={styles.small}>{x.sub}</Text>
          </View>
          <Ionicons name={x.icon} size={18} color={colors.navy} />
        </Pressable>
      ))}
    </View>
  );
}

// Boş danışan listesinin altındaki satır
export function SampleRow({ onOpen }: { onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" style={({ pressed }) => [styles.sampleRow, pressed && { opacity: 0.85 }]}>
      <View style={styles.initial}><Text style={{ fontSize: 16, fontWeight: '700', color: colors.navy }}>D</Text></View>
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.itemTitle}>Deniz</Text>
          <Text style={styles.tag}>Örnek aile</Text>
        </View>
        <Text style={styles.small}>Gerçek değil; ekranların nasıl görüneceğini gösterir</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

type Step = { tab: Tab; title: string; text: string };
export const TOUR: Step[] = [
  { tab: 'summary', title: 'Örnek aileye hoş geldin', text: 'Deniz ve ailesi uydurma bir örnek. Gerçek bir aile bağlandığında göreceğin ekranlar bunlar; kısa bir tur atalım.' },
  { tab: 'summary', title: 'Özet', text: 'Seçtiğin dönemin ev rutini özeti: tamamlama, tam gün, hatırlatmadan önce başlama. Oranlar gözlemdir, puan değildir.' },
  { tab: 'routine', title: 'Ev rutinleri', text: 'Haftalık tabloda her görevin günleri. Bir göreve dokun, gün gün ayrıntısı açılır; "Zaman içinde" görevleri haftadan haftaya karşılaştırır.' },
  { tab: 'abc', title: 'Davranış kayıtları', text: 'Ebeveynin girdiği davranış kayıtları: öncesi, davranış, sonrası (ABC). Tablo görünümünü dosya olarak indirebilirsin.' },
  { tab: 'goals', title: 'Takip planı', text: 'Hedefler, ölçütler ve aile programı. "Planı aileye gönder" deyince aile ParentApp\'te görür.' },
  { tab: 'report', title: 'Rapor', text: 'Dönemin yazdırılabilir gözlem raporu ve kopyalanabilir ilerleme notu.' },
  { tab: 'details', title: 'Sıra gerçek ailede', text: 'Aileyi e-postayla davet et; ebeveyn onaylayınca çocuk danışanların arasında görünür.' },
];

// Danışan ekranının altında duran tur kartı
export function TourBar({ step, onStep, onClose, onInvite }: {
  step: number; onStep: (n: number) => void; onClose: () => void; onInvite: () => void;
}) {
  const { width } = useWindowDimensions();
  const s = TOUR[step];
  const last = step === TOUR.length - 1;
  return (
    <View pointerEvents="box-none" style={styles.tourWrap}>
      <View style={[styles.tour, width >= 720 && { maxWidth: 520, alignSelf: 'center' }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.tourStep}>{`${step + 1} / ${TOUR.length}`}</Text>
          <Text style={[styles.tourTitle, { flex: 1 }]}>{s.title}</Text>
          <Pressable onPress={onClose} hitSlop={8} accessibilityLabel="Turu kapat">
            <Ionicons name="close" size={18} color="#C9CFE0" />
          </Pressable>
        </View>
        <Text style={styles.tourText}>{s.text}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
          <View style={{ flexDirection: 'row', gap: 4, flex: 1 }}>
            {TOUR.map((_, i) => <View key={i} style={[styles.dot, i === step && { backgroundColor: colors.gold, width: 14 }]} />)}
          </View>
          {step > 0 && (
            <Pressable onPress={() => onStep(step - 1)} hitSlop={6} style={styles.ghost} accessibilityRole="button">
              <Text style={styles.ghostText}>Geri</Text>
            </Pressable>
          )}
          <Pressable onPress={last ? onInvite : () => onStep(step + 1)} style={styles.next} accessibilityRole="button">
            <Text style={styles.nextText}>{last ? 'İlk aileni davet et' : step === 0 ? 'Başla' : 'İleri'}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: radius.md, padding: 16, paddingBottom: 6, marginTop: 12, borderWidth: 1, borderColor: colors.today },
  cardTitle: { fontSize: 16, fontWeight: '700', color: colors.navy },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  sampleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12, marginTop: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint },
  initial: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.today, alignItems: 'center', justifyContent: 'center' },
  tag: { fontSize: 11, fontWeight: '700', color: colors.navy, backgroundColor: colors.today, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  tourWrap: { paddingHorizontal: 12, paddingBottom: 12 },
  tour: { width: '100%', backgroundColor: colors.navy, borderRadius: radius.md, padding: 16, gap: 8 },
  tourStep: { fontSize: 11, fontWeight: '700', color: colors.gold },
  tourTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  tourText: { fontSize: 13, color: '#DDE2EE', lineHeight: 19 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#3A4566' },
  ghost: { paddingHorizontal: 10, paddingVertical: 8 },
  ghostText: { fontSize: 13, fontWeight: '600', color: '#C9CFE0' },
  next: { backgroundColor: colors.gold, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 9 },
  nextText: { fontSize: 13, fontWeight: '700', color: colors.navy },
});
