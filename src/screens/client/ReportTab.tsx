import React, { useEffect, useState } from 'react';
import { View, Text, Alert, Platform, StyleSheet } from 'react-native';
import * as Print from 'expo-print';
import { colors } from '../../theme';
import { Card, Label, Cta, Segmented } from '../../components/ui';
import { Goal, listGoals } from '../../lib/clinic';
import { buildReportHtml } from '../../lib/report';
import { Limits } from './ObservationTabs';
import { ageText, type ClientCtx } from './ClientScreen';
import { track } from '../../lib/track';

type NameMode = 'name' | 'initials' | 'label';

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((w) => `${w[0].toLocaleUpperCase('tr-TR')}.`).join(' ');
}

// Web'de rapor sayfanın üstünde bir pencerede açılır; "Yazdır / PDF" tarayıcının yazdırma penceresini getirir
// ("PDF olarak kaydet" oradan). iPad'de sistem yazdırma/paylaşma (expo-print).
function showWebReport(html: string) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(15,27,61,.45);display:flex;flex-direction:column;padding:16px;gap:10px';
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  const btn = (label: string, primary: boolean) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `border:0;border-radius:999px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer;${primary ? 'background:#0F1B3D;color:#fff' : 'background:#fff;color:#0F1B3D'}`;
    bar.appendChild(b);
    return b;
  };
  const print = btn('Yazdır / PDF', true);
  const close = btn('Kapat', false);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'flex:1;border:0;border-radius:12px;background:#fff;width:100%';
  frame.srcdoc = html;
  overlay.append(bar, frame);
  document.body.appendChild(overlay);
  close.onclick = () => overlay.remove();
  print.onclick = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      Alert.alert('Yazdırılamadı', 'Bu sayfada yazdırma kapalı. Raporu tarayıcıda ClinicApp\'in kendi adresinden aç.');
    }
  };
}

async function printHtml(html: string) {
  track('report.print');
  if (Platform.OS === 'web') return showWebReport(html);
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
        <Cta label={Platform.OS === 'web' ? 'Raporu aç' : 'Raporu yazdır / paylaş'} onPress={open} busy={busy} />
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
