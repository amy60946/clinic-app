import React, { useMemo } from 'react';
import { View, Text, ScrollView, Platform, Share, StyleSheet, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Alert } from 'react-native';
import { colors } from '../theme';
import { Bar } from '../components/ui';
import { useData, ageOf } from '../lib/data';
import { useAuth } from '../lib/auth';
import { abcSummary, gasSeries, minuteToHHMM, DECLINE_LABEL } from '../lib/metrics';
import { dateTR, shortTR, pctText } from '../lib/format';
import { useClientDetail, useSummary, LIMITS } from './ClientDetail';

// Yazdırılabilir dönem raporu (son 4 hafta + 8 haftalık eğilim). Web'de Yazdır > PDF olarak kaydet.
export default function ReportScreen({ route, navigation }: any) {
  const { clients, tasks, comps } = useData();
  const { me } = useAuth();
  const c = clients.find((x) => x.linkId === route.params.linkId);
  const { d } = useClientDetail(c);
  const sum = useSummary(c ?? ({ childId: '' } as any), tasks, comps);
  const abc = useMemo(() => (d ? abcSummary(d.abc, new Date()) : null), [d]);
  if (!c) return null;
  const { s, w, t, k } = sum;
  const goals = (d?.goals ?? []).filter((g) => !g.archived);
  const gas = gasSeries((d?.ratings ?? []).filter((r) => goals.some((g) => g.id === r.goalId)));
  const age = ageOf(c.birthday);

  const asText = () => [
    `${c.name} · ilerleme raporu (${dateTR(new Date().toISOString())})`,
    `Tamamlama (28 gün): ${pctText(s.completion)} · Zamanında: ${pctText(s.onTime)} · Düzenli gün: ${pctText(s.consistentDays)} · Seri: ${s.streak} gün`,
    ...t.map((r) => `${r.task.emoji} ${r.task.title}: ${pctText(r.pct)}`),
    ...goals.map((g) => {
      const last = (d?.ratings ?? []).filter((r) => r.goalId === g.id).sort((a, b) => a.week.localeCompare(b.week)).pop();
      return `Hedef: ${g.title} → ${last ? last.rating : '–'}`;
    }),
    '', LIMITS,
  ].join('\n');

  const print = () => {
    if (Platform.OS === 'web') (globalThis as any).print?.();
    else Share.share({ message: asText() });
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#fff' }}>
      <View style={styles.bar}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="chevron-back" size={20} color={colors.navy} /><Text style={styles.barText}>Geri</Text>
        </Pressable>
        <View style={{ flexDirection: 'row', gap: 18 }}>
        <Pressable onPress={async () => { await Clipboard.setStringAsync(asText()); Alert.alert('Rapor metni kopyalandı'); }} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name="copy-outline" size={18} color={colors.navy} />
          <Text style={styles.barText}>Metni kopyala</Text>
        </Pressable>
        <Pressable onPress={print} hitSlop={10} style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Ionicons name={Platform.OS === 'web' ? 'print-outline' : 'share-outline'} size={18} color={colors.navy} />
          <Text style={styles.barText}>{Platform.OS === 'web' ? 'Yazdır / PDF' : 'Paylaş'}</Text>
        </Pressable>
        </View>
      </View>
      <ScrollView contentContainerStyle={styles.page}>
        <Text style={styles.kicker}>{me?.clinic}</Text>
        <Text style={styles.title}>İlerleme raporu</Text>
        <Text style={styles.meta}>
          {c.name}{age !== null ? `, ${age} yaş` : ''} · Hazırlayan: {me?.name}{me?.title ? `, ${me.title}` : ''} · {dateTR(new Date().toISOString())}
        </Text>
        <Text style={styles.meta}>Dönem: son 28 gün (eğilim için 8 hafta) · Veri paylaşımına rıza: {dateTR(c.consentAt)}</Text>

        <Section title="Özet">
          <Grid items={[
            ['Tamamlama', pctText(s.completion), s.trend === null ? '' : `${s.trend > 0 ? '+' : ''}${s.trend} puan (önceki 14 güne göre)`],
            ['Zamanında', pctText(s.onTime), s.onTimeN ? `${s.onTimeN} hatırlatmalı kayıt` : 'Hatırlatmalı görev yok'],
            ['Düzenli gün', pctText(s.consistentDays), 'Görevlerin ≥ %80\'i yapılan günler'],
            ['Güncel seri', `${s.streak} gün`, ''],
          ]} />
        </Section>

        <Section title="Haftalık tamamlama">
          <View style={{ flexDirection: 'row', gap: 6 }}>
            {w.map((p) => (
              <View key={p.week} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                <Text style={styles.small}>{p.scheduled ? pctText(p.pct) : '–'}</Text>
                <View style={{ height: 70, width: '100%', justifyContent: 'flex-end', backgroundColor: '#F1F3F8' }}>
                  <View style={{ height: `${p.pct ?? 0}%`, backgroundColor: colors.navy }} />
                </View>
                <Text style={styles.small}>{shortTR(p.week)}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section title="Görevler">
          <Row cells={['Görev', 'Beceri', 'Tamamlama', 'Değişim', 'Ort. saat', 'Durum']} head />
          {t.map((r) => (
            <Row key={r.task.id} cells={[`${r.task.emoji} ${r.task.title}`, r.task.skill || '–', pctText(r.pct),
              r.trend === null ? '–' : `${r.trend > 0 ? '+' : ''}${r.trend}`, minuteToHHMM(r.avgDoneMinute), r.status]} />
          ))}
        </Section>

        <Section title="Beceri alanları">
          {k.map((x) => (
            <View key={x.skill} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Text style={[styles.cell, { width: 140 }]}>{x.skill}</Text>
              <View style={{ flex: 1 }}><Bar pct={x.pct ?? 0} /></View>
              <Text style={[styles.cell, { width: 44, textAlign: 'right' }]}>{pctText(x.pct)}</Text>
            </View>
          ))}
          {Object.keys(s.declines).length > 0 && (
            <Text style={styles.small}>
              "Yapamam" yanıtları: {Object.entries(s.declines).map(([k2, n]) => `${DECLINE_LABEL[k2] ?? k2} ${n}`).join(', ')}
            </Text>
          )}
        </Section>

        {goals.length > 0 && (
          <Section title="Hedefe ulaşma ölçeği (GAS)">
            <Row cells={['Hedef', ...gas.slice(-6).map((g) => shortTR(g.week))]} head />
            {goals.map((g) => (
              <Row key={g.id} cells={[g.title, ...gas.slice(-6).map((wk) => {
                const r = (d?.ratings ?? []).find((x) => x.goalId === g.id && x.week === wk.week);
                return r ? (r.rating > 0 ? `+${r.rating}` : String(r.rating)) : '–';
              })]} />
            ))}
            <Row cells={['T puanı', ...gas.slice(-6).map((g) => (g.t === null ? '–' : String(g.t)))]} head />
            <Text style={styles.small}>T = 50 + 10·Σx / √(0,7·n + 0,3·n²); eşit ağırlık, ρ = 0,3. 50 beklenen düzeydir.</Text>
          </Section>
        )}

        {abc && abc.total > 0 && (
          <Section title="Ebeveyn olay kayıtları (ABC)">
            <Text style={styles.cell}>
              Son 4 hafta: {abc.perWeek.slice(-4).reduce((a, x) => a + x.count, 0)} kayıt (önceki 4 hafta: {abc.perWeek.slice(0, 4).reduce((a, x) => a + x.count, 0)}).
              Ortalama şiddet: {abc.avgIntensityRecent ?? '–'} (önceki: {abc.avgIntensityPrev ?? '–'}).
            </Text>
            {abc.topAntecedents.length > 0 && <Text style={styles.cell}>En sık öncül: {abc.topAntecedents.map((x) => `${x.text} (${x.count})`).join(', ')}.</Text>}
          </Section>
        )}

        <Section title="Sınırlılıklar">
          <Text style={styles.small}>{LIMITS}</Text>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <View style={{ marginTop: 22, gap: 8 }}>
    <Text style={styles.section}>{title}</Text>
    {children}
  </View>
);

const Grid = ({ items }: { items: [string, string, string][] }) => (
  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
    {items.map(([l, v, h]) => (
      <View key={l} style={styles.gridItem}>
        <Text style={{ fontSize: 20, fontWeight: '800', color: colors.navy }}>{v}</Text>
        <Text style={styles.cell}>{l}</Text>
        {!!h && <Text style={styles.small}>{h}</Text>}
      </View>
    ))}
  </View>
);

const Row = ({ cells, head }: { cells: string[]; head?: boolean }) => (
  <View style={[styles.row, head && { borderBottomColor: colors.navy }]}>
    {cells.map((x, i) => (
      <Text key={i} style={[styles.cell, { flex: i === 0 ? 3 : 1 }, head && { fontWeight: '700' }]} numberOfLines={2}>{x}</Text>
    ))}
  </View>
);

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  barText: { fontSize: 15, color: colors.navy, fontWeight: '600' },
  page: { padding: 28, maxWidth: 820, width: '100%', alignSelf: 'center', paddingBottom: 60 },
  kicker: { fontSize: 12, color: colors.muted, fontWeight: '600', letterSpacing: 0.5 },
  title: { fontSize: 26, fontWeight: '800', color: colors.navy, marginTop: 2 },
  meta: { fontSize: 12, color: colors.muted, marginTop: 4 },
  section: { fontSize: 13, fontWeight: '800', color: colors.navy, letterSpacing: 0.4, textTransform: 'uppercase', borderBottomWidth: 1, borderBottomColor: colors.line, paddingBottom: 6 },
  gridItem: { flexGrow: 1, flexBasis: 160, borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, gap: 2 },
  row: { flexDirection: 'row', gap: 8, paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.line },
  cell: { fontSize: 12, color: colors.navy },
  small: { fontSize: 11, color: colors.muted, lineHeight: 16 },
});
