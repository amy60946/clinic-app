import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Input } from '../components/ui';
import { ClinicianMe, joinTeam } from '../lib/clinic';
import { SURVEY, SurveyQuestion, Intent, saveSurvey } from '../lib/survey';
import { track } from '../lib/track';

// Uzman karşılama anketi (kullanıcı isteği 27 Ekim 2026; ortak sozlesme/akislar.md 15): kayıttan sonraki ilk girişte bir kez
// meslek → zorluklar (çoklu) → işine yarayacaklar (çoklu) → buraya getiren (tek; ekip üyesine sorulmaz) → "Hazırsın".
// Son ekran seçilen nedene göre ilk adımı önerir: aile daveti, ekip koduyla katılma ya da paketler.
export type SurveyAction = 'invite' | 'plans' | 'joined' | null;
type Step = 'profession' | 'challenges' | 'features' | 'intent';

const firstName = (name: string) => name.split(/\s+/).find((w) => w && !w.endsWith('.')) ?? '';

export default function WelcomeSurvey({ me, onFinish }: { me: ClinicianMe; onFinish: (action: SurveyAction) => void }) {
  const { width } = useWindowDimensions();
  const owner = me.role === 'owner';
  const steps: Step[] = owner ? ['profession', 'challenges', 'features', 'intent'] : ['profession', 'challenges', 'features'];
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [profession, setProfession] = useState<string | null>(null);
  const [challenges, setChallenges] = useState<string[]>([]);
  const [features, setFeatures] = useState<string[]>([]);
  const [intent, setIntent] = useState<Intent | null>(null);
  const step = steps[i];
  const q: SurveyQuestion = SURVEY[step];
  const cols = width >= 720 ? 3 : 2;
  const name = firstName(me.name);

  const valid = step === 'profession' ? !!profession : step === 'challenges' ? challenges.length > 0
    : step === 'features' ? features.length > 0 : !!intent;
  const toggle = (list: string[], set: (v: string[]) => void, key: string) =>
    set(list.includes(key) ? list.filter((k) => k !== key) : [...list, key]);

  const skip = async () => {
    setBusy(true);
    await saveSurvey(null).catch(() => {});
    track('survey.skip', { step: i + 1 });
    setBusy(false);
    onFinish(null);
  };
  const next = async () => {
    if (!valid) return;
    if (i < steps.length - 1) { setI(i + 1); return; }
    setBusy(true);
    try {
      await saveSurvey({ profession, challenges, features, intent });
    } catch {
      // kaydedilemese de uzman beklemez; bir sonraki girişte yeniden sorulur
    }
    track('survey.done', { intent: intent ?? '', profession: profession ?? '' });
    setBusy(false);
    setDone(true);
  };

  if (done) return <Ready me={me} name={name} intent={owner ? intent : null} onFinish={onFinish} />;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <View style={styles.column}>
        <View style={styles.top}>
          <Text style={styles.brand}>ClinicApp</Text>
          <Pressable onPress={skip} hitSlop={8} accessibilityRole="button" disabled={busy}>
            <Text style={styles.skip}>Şimdilik geç</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          {i === 0 && (
            <View style={{ marginBottom: 18 }}>
              <Text style={styles.hello}>{name ? `Hoş geldin, ${name}` : 'Hoş geldin'}</Text>
              <Text style={styles.lead}>{steps.length} kısa soruyla ClinicApp'i sana göre hazırlayalım. Cevapların ailelere görünmez.</Text>
            </View>
          )}
          <View style={styles.progressRow} accessibilityLabel={`Soru ${i + 1} / ${steps.length}`}>
            {steps.map((s, n) => <View key={s} style={[styles.seg, n <= i && styles.segOn]} />)}
            <Text style={styles.count}>{i + 1} / {steps.length}</Text>
          </View>
          <Text style={styles.title}>{q.title}</Text>
          <Text style={styles.hint}>{q.hint}</Text>

          {step === 'profession' ? (
            <View style={styles.pills}>
              {q.options.map((o) => {
                const on = profession === o.key;
                return (
                  <Pressable key={o.key} onPress={() => setProfession(o.key)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                    style={({ pressed }) => [styles.pill, on && styles.pillOn, pressed && { opacity: 0.8 }]}>
                    {on && <Ionicons name="checkmark" size={16} color={colors.navy} />}
                    <Text style={[styles.pillText, on && { fontWeight: '700' }]}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={styles.grid}>
              {q.options.map((o) => {
                const multi = step !== 'intent';
                const on = step === 'challenges' ? challenges.includes(o.key) : step === 'features' ? features.includes(o.key) : intent === o.key;
                const press = () => (step === 'challenges' ? toggle(challenges, setChallenges, o.key)
                  : step === 'features' ? toggle(features, setFeatures, o.key) : setIntent(o.key as Intent));
                return (
                  <Pressable key={o.key} onPress={press} accessibilityRole={multi ? 'checkbox' : 'radio'}
                    accessibilityState={multi ? { checked: on } : { selected: on }}
                    style={({ pressed }) => [styles.card, { width: `${100 / cols - 2}%` }, on && styles.cardOn, pressed && { opacity: 0.85 }]}>
                    <View style={styles.cardTop}>
                      <View style={[styles.iconWrap, on && { backgroundColor: '#fff' }]}>
                        <Ionicons name={(o.icon ?? 'ellipse-outline') as keyof typeof Ionicons.glyphMap} size={22} color={colors.navy} />
                      </View>
                      <Ionicons name={on ? (multi ? 'checkbox' : 'radio-button-on') : (multi ? 'square-outline' : 'radio-button-off')}
                        size={20} color={on ? colors.navy : colors.faint} />
                    </View>
                    <Text style={styles.cardText}>{o.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          )}
        </ScrollView>
        <View style={styles.footer}>
          {i > 0 ? (
            <Pressable onPress={() => setI(i - 1)} hitSlop={8} style={styles.back} accessibilityRole="button">
              <Ionicons name="arrow-back" size={18} color={colors.navy} />
              <Text style={styles.backText}>Geri</Text>
            </Pressable>
          ) : <View />}
          <Pressable onPress={next} disabled={!valid || busy} accessibilityRole="button" accessibilityState={{ disabled: !valid }}
            style={[styles.next, (!valid || busy) && { opacity: 0.4 }]}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextText}>{i === steps.length - 1 ? 'Bitir' : 'İleri'}</Text>}
          </Pressable>
        </View>
      </View>
    </SafeAreaView>
  );
}

// Son ekran: seçilen nedene göre ilk adım
function Ready({ me, name, intent, onFinish }: { me: ClinicianMe; name: string; intent: Intent | null; onFinish: (a: SurveyAction) => void }) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const join = async () => {
    if (![6, 8].includes(code.trim().length)) return Alert.alert('Ekip kodu 8 karakterdir.');
    setBusy(true);
    try {
      await joinTeam(code);
      track('team.join');
      onFinish('joined');
    } catch (e) {
      Alert.alert('Ekibe katılınamadı', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const text = intent === 'trial' ? 'En hızlı başlangıç: ilk aileni davet et. Davet e-postası senin adınla gider; ebeveyn onaylayınca çocuk panelinde görünür.'
    : intent === 'family' ? 'Çalıştığın aileyi davet et. Ebeveyn e-postadaki kodla bağlanıp onay verince çocuk panelinde görünür.'
    : intent === 'team' ? 'Klinik sahibinden aldığın 8 karakterlik ekip kodunu yaz; kliniğin danışanları ve ekibin profiline gelir.'
    : intent === 'org' ? 'Klinik paketinde 10 uzmana kadar ekip kurar, aile çalışmasını tek düzende yürütürsün. 7 günlük deneme sürüyor.'
    : 'Panelin hazır. Ailelerin paylaştığı çocuklar burada görünür.';
  const primary: { label: string; onPress: () => void } | null =
    intent === 'trial' || intent === 'family' ? { label: 'İlk aileni davet et', onPress: () => onFinish('invite') }
    : intent === 'org' && me.role === 'owner' ? { label: 'Paketleri gör', onPress: () => onFinish('plans') }
    : null;
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={[styles.scroll, styles.readyWrap]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <View style={styles.readyCard}>
          <View style={styles.ring}><Ionicons name="checkmark" size={44} color={colors.navy} /></View>
          <Text style={[styles.hello, { textAlign: 'center' }]}>{name ? `Hazırsın, ${name}!` : 'Hazırsın!'}</Text>
          <Text style={[styles.lead, { textAlign: 'center' }]}>{text}</Text>
          {intent === 'team' && (
            <View style={{ alignSelf: 'stretch', gap: 10, marginTop: 6 }}>
              <Input value={code} onChangeText={(t) => setCode(t.toUpperCase())} placeholder="Ekip kodu" autoCapitalize="characters" maxLength={8} />
              <Pressable onPress={join} disabled={busy} style={[styles.next, styles.wide, busy && { opacity: 0.6 }]} accessibilityRole="button">
                {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.nextText}>Ekibe katıl</Text>}
              </Pressable>
            </View>
          )}
          {primary && (
            <Pressable onPress={primary.onPress} style={[styles.next, styles.wide]} accessibilityRole="button">
              <Text style={styles.nextText}>{primary.label}</Text>
            </Pressable>
          )}
          <Pressable onPress={() => onFinish(null)} hitSlop={8} accessibilityRole="button"
            style={primary || intent === 'team' ? styles.plain : [styles.next, styles.wide]}>
            <Text style={primary || intent === 'team' ? styles.backText : styles.nextText}>Panele geç</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingTop: 12 },
  brand: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  skip: { fontSize: 13, fontWeight: '600', color: colors.muted },
  scroll: { padding: 24, paddingBottom: 32 },
  hello: { fontSize: 26, fontWeight: '800', color: colors.navy },
  lead: { fontSize: 15, color: colors.text, lineHeight: 22, marginTop: 8 },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 16 },
  seg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: colors.line },
  segOn: { backgroundColor: colors.navy },
  count: { fontSize: 12, fontWeight: '700', color: colors.muted, marginLeft: 6 },
  title: { fontSize: 20, fontWeight: '800', color: colors.navy, lineHeight: 27 },
  hint: { fontSize: 13, color: colors.muted, marginTop: 4, marginBottom: 16 },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill,
    backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  pillOn: { borderColor: colors.navy, borderWidth: 2, backgroundColor: colors.today, paddingHorizontal: 13, paddingVertical: 9 },
  pillText: { fontSize: 14, color: colors.navy },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 12 },
  card: { minHeight: 128, backgroundColor: '#fff', borderRadius: radius.md, padding: 14, borderWidth: 1, borderColor: colors.line, gap: 12 },
  cardOn: { borderColor: colors.navy, borderWidth: 2, backgroundColor: colors.today, padding: 13 },
  cardTop: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  iconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: colors.today, alignItems: 'center', justifyContent: 'center' },
  cardText: { fontSize: 14, fontWeight: '600', color: colors.navy, lineHeight: 20 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 24, paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8 },
  backText: { fontSize: 15, fontWeight: '600', color: colors.navy },
  next: { minWidth: 140, height: 50, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  nextText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  wide: { alignSelf: 'stretch', marginTop: 8 },
  plain: { alignSelf: 'center', paddingVertical: 12, marginTop: 4 },
  readyWrap: { flexGrow: 1, justifyContent: 'center' },
  readyCard: { width: '100%', maxWidth: 480, alignSelf: 'center', alignItems: 'center', backgroundColor: '#fff', borderRadius: 22, padding: 28, gap: 10 },
  ring: { width: 96, height: 96, borderRadius: 48, borderWidth: 6, borderColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
});
