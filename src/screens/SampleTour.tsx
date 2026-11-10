import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius } from '../theme';
import type { Tab } from './client/ClientScreen';
import type { CoachStep } from '../lib/coach';

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
    { done: p.sampleSeen, title: 'Örnek aileyle dene', sub: 'Deniz’le davranış hedefi aç, rutin bağla, gönder', icon: 'sparkles-outline' as const, on: onSample, needs: false },
    { done: p.invited, title: 'İlk aileni davet et', sub: p.invited && !p.hasClient ? 'Davet gitti; ebeveyn onaylayınca burada' : '"Aileyi davet et" › e-posta', icon: 'mail-outline' as const, on: onInvite, needs: false },
    { done: p.planned, title: 'İlk davranış hedefini ekle', sub: 'Takip Planı › "+ Davranış hedefi"', icon: 'flag-outline' as const, on: onPlan, needs: true },
    { done: p.published, title: 'Aileye gönder', sub: 'Takip Planı › "Aileye gönder"', icon: 'paper-plane-outline' as const, on: onPublish, needs: true },
    { done: p.report, title: 'İlk raporu aç', sub: 'Rapor › "Raporu aç"', icon: 'document-text-outline' as const, on: onReport, needs: true },
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
// Kısa (kullanıcı isteği 3 Kasım 2026: "yazıları daha kısa tut"); dokunulacak tuş tırnak içinde
export const SECTION_HINTS: Partial<Record<Tab, { title: string; text: string }>> = {
  summary: { title: 'Özet', text: 'Dönemin ev rutini: tamamlama, tam gün, kendiliğinden başlama.' },
  routine: { title: 'Ev Rutinleri', text: 'Bir maceraya dokun: gün gün ayrıntı. Öneri için "+ Aileye öner".' },
  goals: { title: 'Takip Planı', text: 'Eklediğin her şey taslak (bej), aile görmez. Göndermek için "Aileye gönder".' },
  notes: { title: 'Notlar', text: 'Yalnız sen ve yetkili ekibin görür.' },
  report: { title: 'Rapor', text: 'PDF için "Raporu aç"; not için "Notu kopyala".' },
  details: { title: 'Danışan Bilgileri', text: 'Etiket, ebeveyn adları, onay tarihi, ekip erişimi.' },
};

export function SectionHint({ userId, section }: { userId: string; section: Tab }) {
  return <OnceHint userId={userId} id={section} hint={SECTION_HINTS[section]} />;
}

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

// Yaptırarak öğreten tur (kullanıcı isteği 3 Kasım 2026): örnek aile Deniz üzerinde her adım tek bir tuşu vurgular, ekranın
// geri kalanı hafif kararır; uzman o tuşa dokununca adım ilerler. Yazılar kısa, dokunulacak tuş kalın. Yapılanlar örnekte kalır.
// Olaylar: PlanHats (goal_added, routine_added, published, evaluated), HomeRoutines (routine_row), ReportTab (report_action).
// Yazı en az, gösterim önde (kullanıcı isteği 3 Kasım 2026): kartta başlık + en çok bir kısa satır; pencerelerde de perdeyle
// sırayla gösterilir (önce "bak" → "Tamam", sonra dokunulacak tuş).
export const TOUR: (CoachStep & { tab: Tab })[] = [
  { key: 'intro', tab: 'goals', title: 'Deniz’le dene', text: 'Örnek aile. Kaydedilmez, aileye gitmez.' },
  {
    key: 'goal', tab: 'goals', target: 'plan.addGoal', until: 'goal_added', title: 'Davranış hedefi ekle', text: '**+ Davranış hedefi**',
    sheets: {
      goal: [{ target: 'sheet.goal.pick', title: 'Hazır davranış hedefi seç' }],
      goalForm: [{ target: 'sheet.goal.save', title: 'Kaydet', text: 'Alanlar hazır.' }],
    },
  },
  {
    key: 'routine', tab: 'goals', target: 'plan.newRoutine', until: 'routine_added', title: 'Rutin ekle', text: '**{label}**',
    sheets: {
      routine: [
        { target: 'sheet.routine.goal', title: 'Davranış hedefine bağlı', text: 'Rutin bu davranış hedefinin altına gelir.', info: true },
        { target: 'sheet.routine.add', title: 'Plana ekle' },
      ],
    },
  },
  {
    key: 'publish', tab: 'goals', target: 'plan.publish', until: 'published', title: 'Aileye gönder', text: 'Bej = taslak. **Aileye gönder**',
    sheets: {
      publish: [
        { target: 'sheet.publish.list', title: 'Gidecekler', text: 'İşareti kaldırılan bekler.', info: true },
        { target: 'sheet.publish.send', title: 'Gönder' },
      ],
    },
  },
  {
    key: 'evaluate', tab: 'goals', target: 'plan.evaluate', until: 'evaluated', title: 'Değerlendir', text: '**Değerlendirme zamanı**',
    sheets: {
      evaluate: [
        { target: 'sheet.eval.scale', title: 'Puan seç', until: 'rated' },
        { target: 'sheet.eval.save', title: 'Kaydet', text: 'Aile görmez.' },
      ],
    },
  },
  {
    key: 'watch', tab: 'routine', target: 'routine.row', until: 'routine_row', title: 'Ailenin kaydı', text: 'Bir **maceraya** dokun',
    sheets: {
      taskDetail: [
        { target: 'sheet.task.body', title: 'Gün gün kayıt', info: true },
        { target: 'sheet.task.close', title: 'Kapat' },
      ],
    },
  },
  { key: 'report', tab: 'report', target: 'report.open', until: 'report_action', title: 'Rapor', text: '**Raporu aç**' },
  { key: 'done', tab: 'report', title: 'Hazırsın', text: 'Sıra gerçek ailede.', final: true },
];

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
});
