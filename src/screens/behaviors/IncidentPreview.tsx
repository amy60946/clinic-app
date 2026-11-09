// "Ebeveyn deneyimini önizle" (Davranışlar ve olaylar): ebeveynin aile uygulamasında olay bildirirken göreceği ekranlar
// (rakipteki aile uygulamasına sadık). Ben › Görevlerin › "Çocuğunun davranış olayını bildir" → 1 hangi davranış → 2 kayıt türüne
// göre ayrıntı → 3 strateji ve çocuğun tepkisi → teşekkür. Yerel; kaydedilmez. Gerçek ekranlar ParentApp penceresinin işi.
import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, StyleSheet, TextInput, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { LogType, RESPONSES } from '../../lib/behaviors';

export type PreviewBehavior = { id: string; title: string; strategies: string[]; log_type: LogType; parent_logging: boolean };
type Step = 'home' | 'pick' | 'details' | 'strategy' | 'thanks';
const NONE = '__none__';

export default function IncidentPreview({ behaviors, childName, onClose }: { behaviors: PreviewBehavior[]; childName?: string; onClose: () => void }) {
  const { width, height } = useWindowDimensions();
  const framed = width >= 700 && height >= 560;
  const list = useMemo(() => behaviors.filter((b) => b.parent_logging && b.title.trim()), [behaviors]);
  const [step, setStep] = useState<Step>('home');
  const [pick, setPick] = useState<string | null>(null);
  const [f, setF] = useState({ name: '', count: '', minutes: '', before: '', after: '', tried: '' });
  const [strategy, setStrategy] = useState<string | null>(null);
  const [response, setResponse] = useState<number | null>(null);
  const now = useMemo(() => { const d = new Date(); return `Bugün, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; }, [step]); // eslint-disable-line react-hooks/exhaustive-deps
  const b = list.find((x) => x.id === pick);
  const other = pick === NONE;
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));
  const num = (v: string) => v.replace(/[^0-9]/g, '').slice(0, 4);
  const reset = () => { setPick(null); setF({ name: '', count: '', minutes: '', before: '', after: '', tried: '' }); setStrategy(null); setResponse(null); };

  // Sunucudaki kurallar (family_incident_report): sıklıkta sayı, ABC'de öncül + sonuç, sürede dakika, diğer olayda davranışın adı
  const detailsOk = other ? !!f.name.trim()
    : b?.log_type === 'frequency' ? Number(f.count) >= 1
    : b?.log_type === 'abc' ? !!f.before.trim() && !!f.after.trim()
    : b?.log_type === 'duration' ? f.minutes !== '' : false;
  const strategyOk = (other || strategy !== null) && response !== null;

  const body = (() => {
    if (step === 'home') {
      return (
        <ScrollView contentContainerStyle={s.pad}>
          <Text style={s.big}>Ben</Text>
          <Text style={s.sec}>Görevlerin</Text>
          <Pressable onPress={() => { reset(); setStep('pick'); }} style={s.row} accessibilityRole="button">
            <Ionicons name="pulse-outline" size={18} color={colors.navy} />
            <Text style={s.rowText}>Çocuğunun davranış olayını bildir</Text>
            <Ionicons name="chevron-forward" size={16} color={colors.muted} />
          </Pressable>
        </ScrollView>
      );
    }
    if (step === 'thanks') {
      return (
        <ScrollView contentContainerStyle={[s.pad, { flexGrow: 1, justifyContent: 'center' }]}>
          <View style={s.intro}>
            <Ionicons name="checkmark-circle-outline" size={34} color={colors.ok} />
            <Text style={[s.big, { textAlign: 'center' }]}>Bu olayı kaydettiğin için teşekkürler</Text>
            <Text style={[s.p, { textAlign: 'center' }]}>Düzenli kayıt, uzmanının davranışın ne zaman ve neden olduğunu görmesine ve birlikte en işe yarayan stratejiyi bulmanıza yardım eder.</Text>
          </View>
          <Pressable onPress={() => { reset(); setStep('pick'); }} style={s.primary} accessibilityRole="button"><Text style={s.primaryText}>Başka bir olay bildir</Text></Pressable>
          <Pressable onPress={() => { reset(); setStep('home'); }} style={[s.ghost, { marginTop: 4 }]} accessibilityRole="button"><Text style={s.ghostText}>Ana sayfaya dön</Text></Pressable>
        </ScrollView>
      );
    }
    const n = step === 'pick' ? 1 : step === 'details' ? 2 : 3;
    let content: React.ReactNode = null;
    let footer: React.ReactNode = null;
    if (step === 'pick') {
      content = (
        <>
          <Text style={s.h}>Hangi davranış oldu?</Text>
          {[...list.map((x) => ({ id: x.id, title: x.title })), { id: NONE, title: 'Hiçbiri' }].map((o) => (
            <Radio key={o.id} label={o.title} on={pick === o.id} onPress={() => setPick(o.id)} />
          ))}
        </>
      );
      footer = <Footer back="Vazgeç" onBack={() => setStep('home')} next="İleri" nextDisabled={!pick} onNext={() => setStep('details')} />;
    } else if (step === 'details') {
      const date = <Field label="Olay tarihi" value={now} icon="calendar-outline" />;
      const before = <Field label="Bu olaydan önce ne oldu?" value={f.before} onChange={set('before')} placeholder="ör. Televizyonu kapatması istendi" multiline />;
      const after = <Field label="Bu olaydan sonra ne oldu?" value={f.after} onChange={set('after')} placeholder="ör. Bağırdı, bir ayrıcalık kaldırıldı" multiline />;
      const minutes = <Field label="Ne kadar sürdü? (dakika)" value={f.minutes} onChange={(v) => set('minutes')(num(v))} placeholder="0" numeric />;
      const count = <Field label="Kaç kez oldu?" value={f.count} onChange={(v) => set('count')(num(v))} placeholder="0" numeric />;
      content = (
        <>
          <Text style={s.tiny}>{other ? 'Diğer olay' : b?.title}</Text>
          {other ? (
            <>
              <Field label="Ne oldu?" value={f.name} onChange={(v) => set('name')(v.slice(0, 120))} placeholder="Davranışın adı" />
              {date}{before}{after}{minutes}{count}
            </>
          ) : b?.log_type === 'frequency' ? <>{date}{count}</>
            : b?.log_type === 'abc' ? <>{date}{before}{after}</>
            : <>{date}{minutes}</>}
        </>
      );
      footer = <Footer back="Geri" onBack={() => setStep('pick')} next="İleri" nextDisabled={!detailsOk} onNext={() => setStep('strategy')} />;
    } else {
      content = (
        <>
          <Text style={s.h}>Hangi stratejiyi denedin?</Text>
          {other ? (
            <Field label="Ne denedin?" value={f.tried} onChange={(v) => set('tried')(v.slice(0, 200))} placeholder="ör. Sakin bir köşeye geçtik" multiline />
          ) : (
            [...(b?.strategies ?? []), NONE].map((x, i) => (
              <Radio key={`${i}:${x}`} label={x === NONE ? 'Hiçbiri' : x} on={strategy === x} onPress={() => setStrategy(x)} />
            ))
          )}
          <Text style={[s.h, { marginTop: 10 }]}>Çocuğun bu uygulamaya ne kadar iyi tepki verdi?</Text>
          <View style={s.scale} accessibilityRole="radiogroup">
            {RESPONSES.map((r) => {
              const on = response === r.value;
              return (
                <Pressable key={r.value} onPress={() => setResponse(r.value)} style={[s.scaleItem, on && s.scaleOn]} accessibilityRole="radio"
                  accessibilityState={{ selected: on }} accessibilityLabel={`${r.value}: ${r.label}`}>
                  <Text style={[s.scaleText, on && { color: '#fff' }]}>{r.value}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={s.scaleEnds}><Text style={s.tiny}>Kötü</Text><Text style={s.tiny}>Çok iyi</Text></View>
        </>
      );
      footer = <Footer back="Geri" onBack={() => setStep('details')} next="Gönder" nextDisabled={!strategyOk} onNext={() => setStep('thanks')} />;
    }
    return (
      <View style={{ flex: 1 }}>
        <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 6 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={[s.title, { flexShrink: 1 }]}>Davranış olayı bildir</Text>
            <View style={{ flexGrow: 1 }} />
            <Text style={[s.tiny, { flexShrink: 0 }]}>{n} / 3</Text>
          </View>
          <View style={s.bar}><View style={[s.fill, { width: `${(n / 3) * 100}%` }]} /></View>
          {!!childName && <Text style={s.tiny}>{childName}</Text>}
        </View>
        <ScrollView contentContainerStyle={[s.pad, { flexGrow: 1 }]} keyboardShouldPersistTaps="handled">{content}</ScrollView>
        {footer}
      </View>
    );
  })();

  const phone = (
    <View style={framed ? [s.phoneBase, s.framed, { height: Math.min(820, height - 110) }] : [s.phoneBase, { flex: 1, width: '100%' }]}>
      <View style={s.note}><Ionicons name="eye-outline" size={14} color="#7A5A22" /><Text style={s.noteText}>Önizleme: ebeveynin göreceği ekran. Yaptıkların kaydedilmez.</Text></View>
      <View style={{ flex: 1 }}>{body}</View>
    </View>
  );
  return (
    <Modal visible animationType="slide" presentationStyle={framed ? 'overFullScreen' : 'fullScreen'} transparent={framed} onRequestClose={onClose}>
      <SafeAreaView style={[{ flex: 1 }, framed ? s.scrim : { backgroundColor: '#fff' }]}>
        <View style={[s.topbar, framed && { backgroundColor: colors.navy }]}>
          <Text style={[s.topTitle, framed && { color: '#fff' }]}>Ebeveyn deneyimi</Text>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Önizlemeyi kapat"><Ionicons name="close" size={24} color={framed ? '#fff' : colors.navy} /></Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: framed ? 20 : 0 }}>{phone}</View>
      </SafeAreaView>
    </Modal>
  );
}

function Radio({ label, on, onPress }: { label: string; on: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[s.opt, on && s.optOn]} accessibilityRole="radio" accessibilityState={{ selected: on }}>
      <Text style={[s.p, { flex: 1 }]}>{label}</Text>
      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.navy : colors.faint} />
    </Pressable>
  );
}

function Field({ label, value, onChange, placeholder, numeric, multiline, icon }: {
  label: string; value: string; onChange?: (v: string) => void; placeholder?: string; numeric?: boolean; multiline?: boolean; icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Text style={s.label}>{label}</Text>
      {onChange ? (
        <TextInput value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={colors.muted} accessibilityLabel={label}
          keyboardType={numeric ? 'number-pad' : 'default'} multiline={multiline} style={[s.input, multiline && { minHeight: 72, textAlignVertical: 'top' }]} />
      ) : (
        <View style={[s.input, { flexDirection: 'row', alignItems: 'center', gap: 8 }]}>
          {icon && <Ionicons name={icon} size={16} color={colors.navy} />}
          <Text style={[s.p, { flexShrink: 1 }]}>{value}</Text>
        </View>
      )}
    </View>
  );
}

function Footer({ back, onBack, next, onNext, nextDisabled }: { back: string; onBack: () => void; next: string; onNext: () => void; nextDisabled?: boolean }) {
  return (
    <View style={s.footer}>
      <Pressable onPress={onBack} style={s.ghost} accessibilityRole="button"><Text style={s.ghostText}>{back}</Text></Pressable>
      <Pressable onPress={onNext} disabled={nextDisabled} style={[s.primary, { flex: 1, marginTop: 0 }, nextDisabled && { opacity: 0.4 }]}
        accessibilityRole="button" accessibilityState={{ disabled: !!nextDisabled }}><Text style={s.primaryText}>{next}</Text></Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  scrim: { backgroundColor: 'rgba(10,14,28,0.78)' },
  topbar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 10 },
  topTitle: { fontSize: 16, fontWeight: '700', color: colors.navy },
  phoneBase: { backgroundColor: '#fff', overflow: 'hidden' },
  framed: { width: 390, borderRadius: 34, borderWidth: 8, borderColor: '#0F1B3D' },
  note: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#F3E9D6', paddingHorizontal: 12, paddingVertical: 6 },
  noteText: { fontSize: 11.5, color: '#7A5A22', flexShrink: 1 },
  pad: { padding: 16, gap: 10 },
  big: { fontSize: 20, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  title: { fontSize: 16, fontWeight: '700', color: colors.navy },
  sec: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12 },
  rowText: { fontSize: 14, color: colors.navy, flex: 1, flexShrink: 1 },
  tiny: { fontSize: 11.5, color: colors.muted, fontWeight: '600' },
  h: { fontSize: 16, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  p: { fontSize: 14.5, lineHeight: 21, color: colors.text, flexShrink: 1 },
  label: { fontSize: 13, fontWeight: '600', color: colors.navy },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, minHeight: 44, fontSize: 14.5, color: colors.text },
  opt: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11 },
  optOn: { borderColor: colors.navy, backgroundColor: '#EEF1F8' },
  bar: { height: 6, borderRadius: 3, backgroundColor: '#ECEEF3', overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.navy, borderRadius: 3 },
  scale: { flexDirection: 'row', gap: 8 },
  scaleItem: { flex: 1, minWidth: 0, height: 44, borderRadius: 10, borderWidth: 1, borderColor: colors.line, alignItems: 'center', justifyContent: 'center' },
  scaleOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  scaleText: { fontSize: 15, fontWeight: '700', color: colors.navy },
  scaleEnds: { flexDirection: 'row', justifyContent: 'space-between' },
  primary: { backgroundColor: colors.navy, borderRadius: radius.pill, paddingVertical: 13, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  ghost: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingVertical: 12, paddingHorizontal: 18, alignItems: 'center' },
  ghostText: { color: colors.navy, fontWeight: '600' },
  footer: { flexDirection: 'row', gap: 10, padding: 12, borderTopWidth: 1, borderTopColor: colors.line },
  intro: { alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 1, borderColor: colors.line, borderRadius: 16, padding: 24 },
});
