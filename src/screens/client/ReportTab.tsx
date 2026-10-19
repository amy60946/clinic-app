import React, { useEffect, useState } from 'react';
import { View, Text, Alert, Platform, StyleSheet } from 'react-native';
import * as Print from 'expo-print';
import { colors } from '../../theme';
import { Card, Label, Cta, Segmented } from '../../components/ui';
import { Goal, listGoals } from '../../lib/clinic';
import { buildReportHtml } from '../../lib/report';
import { Limits } from './ObservationTabs';
import { ageText, type ClientCtx } from './ClientScreen';

type NameMode = 'name' | 'initials' | 'label';

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => `${w[0].toLocaleUpperCase('tr-TR')}.`).join(' ');
}

// Web'de raporu yeni pencerede açıp yazdırma penceresini getirir ("PDF olarak kaydet" oradan); iPad'de sistem yazdırma/paylaşma.
async function printHtml(html: string) {
  if (Platform.OS === 'web') {
    const w = window.open('', '_blank');
    if (!w) throw new Error('Tarayıcı yeni pencereyi engelledi. Açılır pencerelere izin ver.');
    w.document.open();
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 300);
    return;
  }
  await Print.printAsync({ html });
}

export default function ReportTab({ client, me, data, today, weeks }: ClientCtx) {
  const [mode, setMode] = useState<NameMode>('initials');
  const [goals, setGoals] = useState<Goal[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => { listGoals(client.link_id).then(setGoals).catch(() => setGoals([])); }, [client.link_id]);

  const name = data.child?.name ?? client.child_name;
  const childLabel = mode === 'name' ? name : mode === 'initials' ? initials(name) : client.label || initials(name);

  const open = async () => {
    setBusy(true);
    try {
      await printHtml(buildReportHtml({
        clinic: me.clinic,
        clinician: [me.name, me.title].filter(Boolean).join(', '),
        childLabel,
        age: ageText(data.child?.birthday ?? null),
        tasks: data.tasks,
        completions: data.completions,
        abc: data.abc,
        goals,
        today,
        weeks,
      }));
    } catch (e) {
      Alert.alert('Rapor açılamadı', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Label>{`Ev rutini gözlem raporu (${weeks} hafta)`}</Label>
      <Card style={{ gap: 12 }}>
        <Text style={styles.body}>
          Rapor şunları içerir: haftalık rutin kartı, yürütücü işlev gözlem özeti (başlatma, tutarlılık, "Yapamam"), görev ve beceri alanı tabloları, GAS hedef puanları ve zor an özeti. Uzman notları rapora girmez.
        </Text>
        <Text style={styles.small}>Raporda çocuk nasıl görünsün?</Text>
        <Segmented<NameMode>
          options={[{ id: 'initials', label: 'Baş harfler' }, { id: 'label', label: 'Etiket' }, { id: 'name', label: 'Tam ad' }]}
          value={mode} onChange={setMode}
        />
        <Text style={styles.small}>Görünecek: {childLabel || '—'}</Text>
        <Cta label={Platform.OS === 'web' ? 'Raporu aç / PDF olarak kaydet' : 'Raporu yazdır / paylaş'} onPress={open} busy={busy} />
        <Text style={styles.small}>
          Rapor kişisel sağlık verisi içerir. Yalnız tedavi amacıyla, güvenli kanaldan ve ebeveynin bilgisiyle paylaş.
        </Text>
      </Card>
      <Limits />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
});
