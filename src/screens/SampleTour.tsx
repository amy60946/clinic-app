import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius } from '../theme';
import type { Tab } from './client/ClientScreen';

// "Başlarken" (ana ekran) ve örnek aile turu. Joon'un "Get started" + "sample patient" işlevinin karşılığı; metinler özgün.
// Örnek aile gerçek danışan listesine karışmaz (Joon'da karışıyor): kendi satırında, listenin altında durur.
// Kullanıcı kararı 28 Ekim 2026: bir kez görülünce hemen gitmez — ilk açılıştan sonra 30 gün (ya da × ile kaldırılana dek)
// kalır; gerçek danışanda her bölüm ilk açıldığında kısa ipucu kartı (SectionHint) çıkar.

const SAMPLE_KEY = (id: string) => `clinic.sample.seen.v1.${id}`;        // ilk açılış günü (eski kayıt '1')
const HIDE_KEY = (id: string) => `clinic.start.hidden.v1.${id}`;
const SAMPLE_HIDE_KEY = (id: string) => `clinic.sample.hidden.v1.${id}`;
const HINT_KEY = (id: string, section: string) => `clinic.hint.v1.${id}.${section}`;
const REPORT_KEY = (id: string) => `clinic.start.report.v1.${id}`;      // gerçek bir danışanın raporu açıldı (Başlarken 5. madde)
export const SAMPLE_DAYS = 30;

export type StartFlags = { sampleSeen: boolean; hidden: boolean; sampleRow: boolean; report: boolean };
export async function startFlags(userId: string): Promise<StartFlags> {
  try {
    const [s, h, sh, rp] = await Promise.all([AsyncStorage.getItem(SAMPLE_KEY(userId)), AsyncStorage.getItem(HIDE_KEY(userId)),
      AsyncStorage.getItem(SAMPLE_HIDE_KEY(userId)), AsyncStorage.getItem(REPORT_KEY(userId))]);
    const first = s && s !== '1' ? Date.parse(s) : NaN;
    if (s === '1') AsyncStorage.setItem(SAMPLE_KEY(userId), new Date().toISOString()).catch(() => {});
    const fresh = !s || s === '1' || !(Date.now() - first > SAMPLE_DAYS * 864e5);
    return { sampleSeen: !!s, hidden: h === '1', sampleRow: sh !== '1' && fresh, report: !!rp };
  } catch {
    return { sampleSeen: false, hidden: false, sampleRow: true, report: false };
  }
}
export const markSampleSeen = async (userId: string) => {
  try { if (!(await AsyncStorage.getItem(SAMPLE_KEY(userId)))) await AsyncStorage.setItem(SAMPLE_KEY(userId), new Date().toISOString()); } catch { /* yok */ }
};
export const hideStart = (userId: string) => AsyncStorage.setItem(HIDE_KEY(userId), '1').catch(() => {});
export const markReportSeen = (userId: string) => AsyncStorage.setItem(REPORT_KEY(userId), '1').catch(() => {});
export const hideSample = (userId: string) => AsyncStorage.setItem(SAMPLE_HIDE_KEY(userId), '1').catch(() => {});

// Ana ekrandaki kart (ilk kullanım "B1", 3 Kasım 2026): ilk haftanın beş adımı, ilerlemeyle. Maddeler gerçek duruma göre işaretlenir:
// örnek aile açıldı · davet ya da danışan var · bir danışanda hedef var · plan aileye gönderildi (clinic_attention_summary
// plan_published_at) · gerçek bir danışanın raporu açıldı (bu cihazda). Aile bağlanmadan son üçü soluk ve "Aile bağlanınca" der.
// Beşi bitince ya da × ile kapanınca görünmez.
export type StartProgress = { sampleSeen: boolean; invited: boolean; hasClient: boolean; planned: boolean; published: boolean; report: boolean };
export const startDone = (p: StartProgress) => [p.sampleSeen, p.invited, p.planned, p.published, p.report].filter(Boolean).length;

export function StartCard({ progress: p, onSample, onInvite, onPlan, onPublish, onReport, onHide }: {
  progress: StartProgress; onSample: () => void; onInvite: () => void; onPlan: () => void; onPublish: () => void; onReport: () => void; onHide: () => void;
}) {
  const items = [
    { done: p.sampleSeen, title: 'Örnek aileyi incele', sub: 'Uydurma bir ailenin verisiyle ekranları gez', icon: 'sparkles-outline' as const, on: onSample, needs: false },
    { done: p.invited, title: 'İlk aileni davet et', sub: p.invited && !p.hasClient ? 'Davet gönderildi · ebeveyn onaylayınca çocuk burada görünür' : 'Ebeveynin e-postasını yaz; davet senin adınla gider', icon: 'mail-outline' as const, on: onInvite, needs: false },
    { done: p.planned, title: 'İlk hedefi ekle', sub: 'Danışan › Takip Planı › + Hedef ya da hazır paket', icon: 'flag-outline' as const, on: onPlan, needs: true },
    { done: p.published, title: 'Aileye gönder', sub: 'Eklediklerin taslaktır; aile "Aileye gönder" deyince tek bildirimle görür', icon: 'paper-plane-outline' as const, on: onPublish, needs: true },
    { done: p.report, title: 'İlk raporu aç', sub: 'Danışan › Rapor › PDF ya da ilerleme notu', icon: 'document-text-outline' as const, on: onReport, needs: true },
  ];
  const done = startDone(p);
  return (
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Text style={[styles.cardTitle, { flex: 1 }]}>Başlarken</Text>
        <Text style={styles.count}>{`${done} / ${items.length}`}</Text>
        <Pressable onPress={onHide} hitSlop={8} accessibilityLabel="Başlarken kartını kapat">
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      </View>
      <View style={styles.progress} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: items.length, now: done }}>
        <View style={[styles.progressFill, { width: `${(done / items.length) * 100}%` }]} />
      </View>
      {items.map((x, i) => {
        const locked = x.needs && !p.hasClient && !x.done;
        return (
          <Pressable key={x.title} onPress={x.on} disabled={locked} accessibilityRole="button" accessibilityState={{ disabled: locked, checked: x.done }}
            style={({ pressed }) => [styles.item, i > 0 && styles.line, pressed && { opacity: 0.8 }]}>
            <Ionicons name={x.done ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={x.done ? colors.ok : colors.faint} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.itemTitle, (x.done || locked) && { color: colors.muted }]}>{x.title}</Text>
              <Text style={styles.small}>{x.sub}</Text>
            </View>
            {locked ? <Text style={styles.wait}>Aile bağlanınca</Text> : <Ionicons name={x.icon} size={18} color={x.done ? colors.faint : colors.navy} />}
          </Pressable>
        );
      })}
    </View>
  );
}

// Danışan listesinin altındaki örnek aile satırı (gerçek listeye karışmaz); × ile kaldırılır
export function SampleRow({ onOpen, onHide }: { onOpen: () => void; onHide?: () => void }) {
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
      {onHide ? (
        <Pressable onPress={onHide} hitSlop={10} accessibilityLabel="Örnek aileyi listeden kaldır">
          <Ionicons name="close" size={18} color={colors.muted} />
        </Pressable>
      ) : <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
    </Pressable>
  );
}

// Gerçek danışanda bölüm ilk açıldığında bir kez: kısa ipucu (örnek aile turunun bölüm metinleri, gerçek veriye göre)
export const SECTION_HINTS: Partial<Record<Tab, { title: string; text: string }>> = {
  summary: { title: 'Özet', text: 'Seçtiğin dönemin ev rutini özeti: tamamlama, tam gün, hatırlatmadan önce başlama. Oranlar dünkü güne kadar hesaplanır; puan değildir.' },
  routine: { title: 'Ev Rutinleri', text: 'Haftalık tabloda her görevin günleri; bir göreve dokun, gün gün ayrıntısı açılır. "Zaman İçinde" görevleri haftadan haftaya karşılaştırır. "+ Aileye öner" ile rutin ya da görev önerirsin; gönderdiklerin "Gönderilenler"de.' },
  abc: { title: 'Davranış Kayıtları', text: 'Ebeveynin girdiği kayıtlar: öncesi, davranış, sonrası (ABC). Tablo görünümünü dosya olarak indirebilirsin.' },
  goals: { title: 'Takip Planı', text: 'Her hedef bir satır: hedef, ailenin evdeki programı, çocuğun rutini. Eklediğin her şey önce taslaktır; bej olanları aile görmez, "Aileye gönder" deyince aile tek bildirimle görür. Kitaplık\'tan paket, hazır hedef ya da kendi şablonunu ekleyebilirsin. Aile neyi görür: üstteki (i).' },
  notes: { title: 'Notlar', text: 'Klinik notların yalnız sende ve yetkili ekibinde; aile görmez.' },
  report: { title: 'Rapor', text: 'Dönemin yazdırılabilir gözlem raporu ve kopyalanabilir ilerleme notu.' },
  details: { title: 'Danışan Bilgileri', text: 'Klinik etiketin, ebeveyn adları, onay tarihi ve ekip erişimi.' },
};

export function SectionHint({ userId, section }: { userId: string; section: Tab }) {
  return <OnceHint userId={userId} id={section} hint={SECTION_HINTS[section]} />;
}

// Ana ekran: danışan bölümleri ilk göründüğünde bir kez (ilk kullanım "İ", 3 Kasım 2026)
export const BOARD_HINT = {
  title: 'Danışanlar bölümlere ayrılır',
  text: 'Senin sıran: gönderilmemiş değişikliğin ya da değerlendirme zamanı. Aileden yeni: son 7 günün kayıtları. Sessiz kalanlar: ailenin 7 gündür kaydı yok. Sıralama puan değildir; ayrıntı başlıklardaki (i) içinde.',
};

// Bir kez gösterilen ipucu kartı ("Anladım" ile kapanır, bu cihazda hatırlanır)
export function OnceHint({ userId, id, hint }: { userId: string; id: string; hint?: { title: string; text: string } }) {
  const section = id;
  const [show, setShow] = useState(false);
  useEffect(() => {
    let live = true;
    setShow(false);
    if (!hint) return;
    AsyncStorage.getItem(HINT_KEY(userId, section)).then((v) => { if (live) setShow(v !== '1'); }).catch(() => {});
    return () => { live = false; };
  }, [userId, section, hint]);
  if (!hint || !show) return null;
  const close = () => { setShow(false); AsyncStorage.setItem(HINT_KEY(userId, section), '1').catch(() => {}); };
  return (
    <View style={styles.hint}>
      <Ionicons name="bulb-outline" size={18} color={colors.gold} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.hintTitle}>{hint.title}</Text>
        <Text style={styles.hintText}>{hint.text}</Text>
      </View>
      <Pressable onPress={close} hitSlop={8} accessibilityRole="button" style={styles.hintBtn}>
        <Text style={styles.hintBtnText}>Anladım</Text>
      </Pressable>
    </View>
  );
}

type Step = { tab: Tab; title: string; text: string };
// 5 adım (ilk kullanım "Ö1", 3 Kasım 2026: 3–4 adımlı turlar en çok bitiriliyor; hoş geldin Özet'le birleşti, Danışan Bilgileri çıktı)
export const TOUR: Step[] = [
  { tab: 'summary', title: 'Örnek aile: Deniz', text: 'Uydurma bir aile; gerçek bir aile bağlandığında göreceğin ekranlar bunlar. Özet, seçtiğin dönemin ev rutinini gösterir: tamamlama, tam gün, hatırlatmadan önce başlama. Oranlar gözlemdir, puan değildir.' },
  { tab: 'routine', title: 'Ev Rutinleri', text: 'Haftalık tabloda her görevin günleri. Bir göreve dokun, gün gün ayrıntısı açılır; "Zaman İçinde" görevleri haftadan haftaya karşılaştırır. "+ Aileye öner" ile rutin ya da görev önerirsin.' },
  { tab: 'abc', title: 'Davranış Kayıtları', text: 'Ebeveynin girdiği kayıtlar: öncesi, davranış, sonrası (ABC). Haftalık sayı grafiği ve tablo; tabloyu dosya olarak indirebilirsin.' },
  { tab: 'goals', title: 'Takip Planı: önce taslak, sonra gönder', text: 'Her hedef bir satır: hedef, ailenin programı, çocuğun rutini. Eklediğin her şey önce taslaktır; bej olanları aile görmez. "Aileye gönder" deyince aile tek bildirimle görür. Değerlendirme dört haftada bir sorulur.' },
  { tab: 'report', title: 'Rapor ve ilerleme notu', text: 'Dönemin yazdırılabilir gözlem raporu ve kopyalanabilir ilerleme notu. Sıra gerçek ailede: aileyi e-postayla davet et, ebeveyn onaylayınca çocuk danışanların arasında görünür.' },
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
  count: { fontSize: 13, fontWeight: '700', color: colors.muted },
  progress: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginTop: 10, marginBottom: 2 },
  progressFill: { height: '100%', borderRadius: 3, backgroundColor: colors.ok },
  wait: { fontSize: 11, fontWeight: '700', color: '#7A5A1E', backgroundColor: '#F7F1E6', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, overflow: 'hidden' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  itemTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  sampleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 16, paddingVertical: 12, marginTop: 8, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint },
  initial: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.today, alignItems: 'center', justifyContent: 'center' },
  tag: { fontSize: 11, fontWeight: '700', color: colors.navy, backgroundColor: colors.today, paddingHorizontal: 8, paddingVertical: 2, borderRadius: radius.pill, overflow: 'hidden' },
  hint: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FFF8E6', borderRadius: radius.md, padding: 14, marginBottom: 10,
    borderWidth: 1, borderColor: '#F3DFA6' },
  hintTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  hintText: { fontSize: 13, color: colors.text, lineHeight: 19 },
  hintBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#fff' },
  hintBtnText: { fontSize: 12, fontWeight: '700', color: colors.navy },
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
