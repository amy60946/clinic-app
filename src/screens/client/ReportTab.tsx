import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { markReportSeen } from '../SampleTour';
import { CoachTarget, useCoachEmit } from '../../lib/coach';
import { View, Text, TextInput, Alert, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Clipboard from 'expo-clipboard';
import { colors, radius } from '../../theme';
import { Card, Label, Cta, SmallButton, Empty } from '../../components/ui';
import { ConfirmDialog } from '../training/parts';
import { progressNote } from '../../lib/progressNote';
import { Goal, listGoals } from '../../lib/clinic';
import { buildReportHtml, reportContent, contentBytes, REPORT_TITLE, type ReportInput } from '../../lib/report';
import { loadSentReports, shareReport, type SentReport } from '../../lib/reportShare';
import { windowStarts, lastFullDay, parseDate } from '../../lib/metrics';
import { ageText, type ClientCtx } from './ClientScreen';
import { track } from '../../lib/track';
import { useClientConfig, CARE_PLAN_FLAG } from '../../lib/clientConfig';
import { errorText } from '../../lib/errors';

// Web'de rapor sayfanın üstünde bir pencerede açılır; "Yazdır / PDF" tarayıcının yazdırma penceresini getirir
// ("PDF olarak kaydet" oradan). iPad'de sistem yazdırma/paylaşma (expo-print).
// Kapat'a basılınca biter (yaptırarak öğreten tur son kartı rapor kapanınca gösterir). share: "Aileye gönder" düğmesi de çıkar,
// basılınca pencere kapanır ve 'share' döner (onay penceresi uygulamada açılır).
type Closed = 'close' | 'share';
function showWebReport(html: string, share: boolean): Promise<Closed> {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(15,27,61,.45);display:flex;flex-direction:column;padding:16px;gap:10px';
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  const btn = (label: string, primary: boolean) => {
    const b = document.createElement('button');
    b.textContent = label;
    b.style.cssText = `border:0;border-radius:999px;padding:10px 18px;font-size:14px;font-weight:700;cursor:pointer;${primary ? 'background:#0F1B3D;color:#fff' : 'background:#fff;color:#0F1B3D'}`;
    bar.appendChild(b);
    return b;
  };
  const send = share ? btn('Aileye gönder', true) : null;
  const print = btn('Yazdır / PDF', !share);
  const close = btn('Kapat', false);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'flex:1;border:0;border-radius:12px;background:#fff;width:100%';
  // Rapor içinde betik çalışmaz (kaçış hatası olsa bile oturum anahtarına erişemez); yazdırma çalışır
  frame.setAttribute('sandbox', 'allow-same-origin allow-modals');
  frame.srcdoc = html;
  overlay.append(bar, frame);
  document.body.appendChild(overlay);
  const closed = new Promise<Closed>((done) => {
    close.onclick = () => { overlay.remove(); done('close'); };
    if (send) send.onclick = () => { overlay.remove(); done('share'); };
  });
  print.onclick = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      Alert.alert('Yazdırılamadı', 'Bu sayfada yazdırma kapalı. Raporu tarayıcıda Moyo Mercek\'in kendi adresinden aç.');
    }
  };
  return closed;
}

async function printHtml(html: string, share: boolean): Promise<Closed> {
  track('report.print');
  if (Platform.OS === 'web') return showWebReport(html, share);
  await Print.printAsync({ html });
  return 'close';
}

const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const dayText = (iso: string, year = true) => {
  const d = iso.length <= 10 ? parseDate(iso) : new Date(iso);
  return `${d.getDate()} ${MONTHS[d.getMonth()]}${year ? ` ${d.getFullYear()}` : ''}`;
};
const periodText = (a: string, b: string) => `${dayText(a, a.slice(0, 4) !== b.slice(0, 4))} – ${dayText(b)}`;
const sentAt = (iso: string) => {
  const d = new Date(iso);
  return `${dayText(iso, d.getFullYear() !== new Date().getFullYear())}, ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

// Gönderilen raporlar: sunucuda işlev yoksa 'missing' (eski sunucu: gönderme ve liste görünmez)
type Sent = { state: 'loading' } | { state: 'missing' } | { state: 'ok'; rows: SentReport[] } | { state: 'error'; text: string };

export default function ReportTab({ client, me, data, today, weeks }: ClientCtx) {
  const planOn = useClientConfig().flag(CARE_PLAN_FLAG);   // Takip Planı kapalıyken rapor tarifinde GAS geçmez
  const [goals, setGoals] = useState<Goal[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // örnek ailede hedefler hazır veriden (sunucuya gidilmez)
    if (!data.sample) markReportSeen(me.id);
    if (data.sample) { setGoals((data.samplePlan?.goals ?? []).map(({ id, title, description, archived, created_at, ratings }) => ({ id, title, description, archived, created_at, ratings }))); return; }
    listGoals(client.link_id).then(setGoals).catch(() => setGoals([]));
  }, [client.link_id, data]);

  // Raporda çocuğun ebeveynin Moyo'da girdiği adı (kullanıcı kararı 23 Kasım 2026; baş harf / etiket seçimi kalktı)
  const childLabel = data.child?.name ?? client.child_name;
  const note = useMemo(() => progressNote({
    childLabel, tasks: data.tasks, completions: data.completions, abc: data.abc, goals, today, weeks,
  }), [childLabel, data, goals, today, weeks]);
  const [copied, setCopied] = useState(false);
  const copyNote = async () => {
    await Clipboard.setStringAsync(note);
    track('report.note_copy');
    emit('report_action');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Yazdırılan rapor ve aileye giden içerik aynı girdiden (report.ts reportData)
  const input = useMemo<ReportInput>(() => ({
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
  }), [me.clinic, me.name, me.title, childLabel, data, goals, today, weeks]);
  const period = { start: windowStarts(today, weeks)[0], end: lastFullDay(today) };

  // Raporu aileye gönder (ortak akislar.md 27.2): önce rapor açılır (uzman göndermeden önce görür), sonra "Aileye gönder"
  const [sent, setSent] = useState<Sent>(data.sample ? { state: 'missing' } : { state: 'loading' });
  const [title, setTitle] = useState(REPORT_TITLE);
  const [seenKey, setSeenKey] = useState<string | null>(null);   // hangi dönemin raporu açıldı
  const [confirm, setConfirm] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; text: string } | null>(null);
  const viewKey = `${client.link_id}|${weeks}|${today}`;
  const previewed = seenKey === viewKey;
  const canShare = !data.sample && (sent.state === 'ok' || sent.state === 'error');
  const hasGas = goals.some((g) => !g.archived);

  const loadSent = useCallback(async (log = false) => {
    if (data.sample) return;
    try {
      const rows = await loadSentReports(client.link_id);
      if (!rows) { setSent({ state: 'missing' }); return; }
      setSent({ state: 'ok', rows });
      if (log) track('report.sent_list', { n: rows.length });
    } catch (e) {
      setSent({ state: 'error', text: errorText(e) });
    }
  }, [client.link_id, data.sample]);
  useEffect(() => { loadSent(true); }, [loadSent]);
  useEffect(() => { setResult(null); }, [viewKey]);

  const emit = useCoachEmit();
  const open = async () => {
    setBusy(true);
    try {
      const closed = await printHtml(buildReportHtml(input), canShare);
      setSeenKey(viewKey);
      emit('report_action');
      if (closed === 'share') { setResult(null); setConfirm(true); }
    } catch (e) {
      Alert.alert('Rapor açılamadı', errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setConfirm(false);
    setSending(true);
    setResult(null);
    try {
      const content = reportContent(input);
      await shareReport(client.link_id, title.trim() || REPORT_TITLE, period, content);
      track('report.share', { sections: content.sections.length, bytes: contentBytes(content) });
      setResult({ ok: true, text: 'Rapor gönderildi' });
      await loadSent();
    } catch (e) {
      setResult({ ok: false, text: errorText(e) });
    } finally {
      setSending(false);
    }
  };

  return (
    <View>
      <Label>{`Ev rutini gözlem raporu (${weeks} hafta)`}</Label>
      <Card style={{ gap: 12 }}>
        <Text style={styles.body}>
          Rapor şunları içerir: haftalık rutin kartı, yürütücü işlev gözlem özeti (başlatma, tutarlılık, "Yapamam"), adım ve beceri alanı tabloları{planOn || hasGas ? ', GAS davranış hedefi puanları' : ''} ve davranış kaydı özeti. Uzman notları rapora girmez.
        </Text>
        <CoachTarget id="report.open"><Cta label={Platform.OS === 'web' ? 'Raporu aç' : 'Raporu yazdır / paylaş'} onPress={open} busy={busy} /></CoachTarget>
      </Card>

      {(data.sample || canShare) && (
        <>
          <Label>Raporu aileye gönder</Label>
          <Card style={{ gap: 12 }}>
            <Text style={styles.body}>
              Rapor ailenin Moyo uygulamasına gider, ebeveynlere bildirim düşer.{hasGas ? ' GAS davranış hedefi puanları aileye gitmez.' : ''}
            </Text>
            <View style={{ gap: 6 }}>
              <Text style={styles.field}>Başlık</Text>
              <TextInput value={title} onChangeText={setTitle} placeholder={REPORT_TITLE} placeholderTextColor={colors.muted} maxLength={120}
                editable={!data.sample && !sending} accessibilityLabel="Rapor başlığı" style={[styles.input, data.sample && { color: colors.muted }]} />
            </View>
            <Text style={styles.body}><Text style={styles.field}>Dönem: </Text>{`${periodText(period.start, period.end)} (${weeks} hafta)`}</Text>
            <Cta label="Aileye gönder" onPress={() => { setResult(null); setConfirm(true); }} busy={sending} disabled={!!data.sample || !previewed} />
            {data.sample ? <Text style={styles.small}>Örnek ailede rapor gönderilmez.</Text>
              : !previewed ? <Text style={styles.small}>Göndermeden önce raporu aç ve gözden geçir.</Text> : null}
            {result && (
              <View style={styles.result} accessibilityLiveRegion="polite">
                <Ionicons name={result.ok ? 'checkmark-circle' : 'alert-circle'} size={18} color={result.ok ? colors.ok : colors.danger} />
                <Text style={[styles.resultText, { color: result.ok ? colors.ok : colors.danger }]}>{result.text}</Text>
              </View>
            )}
          </Card>
        </>
      )}

      {canShare && (
        <>
          <Label>Gönderilen raporlar</Label>
          <Card style={{ gap: 0 }}>
            {sent.state === 'error' ? <Empty text={sent.text} />
              : sent.state === 'ok' && !sent.rows.length ? <Empty text="Henüz rapor göndermedin." />
              : sent.state === 'ok' && sent.rows.map((r, i) => (
                <View key={r.id} style={[styles.sentRow, i > 0 && styles.sentLine]}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.sentTitle}>{r.title}</Text>
                    <Text style={styles.small}>
                      {[r.period_start && r.period_end ? periodText(r.period_start, r.period_end) : null, `gönderildi ${sentAt(r.created_at)}`,
                        r.mine ? null : r.clinician_name || null].filter(Boolean).join(' · ')}
                    </Text>
                  </View>
                  {!!r.seen_at && <View style={styles.seen}><Text style={styles.seenText}>Açıldı</Text></View>}
                </View>
              ))}
          </Card>
        </>
      )}

      <Label>{`İlerleme notu (${weeks} hafta)`}</Label>
      <Card style={{ gap: 10 }}>
        <View style={styles.note}>
          <Text selectable style={styles.noteText}>{note}</Text>
        </View>
        <View style={{ alignItems: 'flex-start' }}>
          <SmallButton label={copied ? 'Kopyalandı' : 'Notu kopyala'} onPress={copyNote} />
        </View>
      </Card>

      {confirm && (
        <ConfirmDialog title="Rapor aileye gönderilsin mi?" confirm="Gönder" onCancel={() => setConfirm(false)} onConfirm={send}
          body="Rapor ailenin Moyo uygulamasına gider. Gönderilen rapor düzeltilemez ve geri çekilemez." />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12.5, color: colors.muted, lineHeight: 18, flexShrink: 1 },
  field: { fontSize: 13, fontWeight: '600', color: colors.navy },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: radius.sm, backgroundColor: '#FAFBFC', paddingHorizontal: 12, paddingVertical: 11, fontSize: 15, color: colors.navy },
  result: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  resultText: { fontSize: 13.5, fontWeight: '600', flexShrink: 1 },
  sentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10 },
  sentLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  sentTitle: { fontSize: 14, fontWeight: '600', color: colors.text, flexShrink: 1 },
  seen: { backgroundColor: colors.easy.bg, borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 3 },
  seenText: { fontSize: 12, fontWeight: '700', color: colors.easy.fg },
  note: { backgroundColor: '#F7F8FA', borderRadius: radius.sm, padding: 14, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.line },
  noteText: { fontSize: 13, color: colors.text, lineHeight: 20 },
});
