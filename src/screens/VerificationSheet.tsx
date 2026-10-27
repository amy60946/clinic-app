import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Card, Label, Input, Cta, IconButton, Notice, InlineLink } from '../components/ui';
import { useLegalOn, openLegal } from '../lib/legal';
import { pickPdf, PickedPdf } from '../lib/pickPdf';
import { track } from '../lib/track';
import {
  PROFESSIONS, REASONS, MAX_PDF, VerificationState, CheckResult, loadVerification, submitDocument, checkWarnings, professionLabel,
} from '../lib/verification';

// Belge incelemesi (ortak akislar.md 14): meslek + e-Devlet mezun belgesi (BCBA: sicil no) → ön kontrol → ekip inceler.
// Onayda ailelere "Belgesi incelendi: <meslek>" rozeti görünür. Belge karar sonrası silinir.
export default function VerificationSheet({ visible, onClose }: { visible: boolean; onClose: (changed: boolean) => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => onClose(false)}>
      {visible && <Body onClose={onClose} />}
    </Modal>
  );
}

function Body({ onClose }: { onClose: (changed: boolean) => void }) {
  const [state, setState] = useState<VerificationState | null | undefined>(undefined);
  const [form, setForm] = useState(false);
  const [profession, setProfession] = useState('');
  const [bacb, setBacb] = useState('');
  const [pdf, setPdf] = useState<PickedPdf | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<CheckResult | 'sent' | null>(null);
  const legalOn = useLegalOn();

  useEffect(() => {
    loadVerification().then((s) => {
      setState(s);
      if (s && s.enabled !== false && !s.verified_at && (!s.last || ['rejected', 'auto_rejected', 'suspended'].includes(s.last.status))) setForm(true);
    }).catch((e) => { setState(null); Alert.alert('Yüklenemedi', (e as Error).message); });
  }, []);

  const p = PROFESSIONS.find((x) => x.key === profession);
  const ready = !!p && (p.bacb ? bacb.trim().length >= 4 : !!pdf);

  const choose = async () => {
    try {
      const f = await pickPdf();
      if (!f) return;
      if (f.size > MAX_PDF) return Alert.alert('Dosya çok büyük', 'En çok 10 MB. e-Devlet belgesi genellikle çok daha küçüktür.');
      // yalnız gerçek PDF (dosya başı "%PDF"): başka dosya ön kontrolde reddedilip günlük hakkı harcar
      const head = new Uint8Array(f.body.slice(0, 4));
      if (!(head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46)) {
        return Alert.alert('PDF değil', 'e-Devlet\'ten indirdiğin PDF dosyasını değiştirmeden seç.');
      }
      setPdf(f);
    } catch (e) {
      Alert.alert('Dosya seçilemedi', (e as Error).message);
    }
  };

  const send = async () => {
    if (!p) return;
    setBusy(true);
    try {
      const r = await submitDocument(p.key, p.bacb ? bacb : '', pdf);   // başka meslekte kalan sicil no gönderilmez
      setResult(r ?? 'sent');
      setForm(false);
      track('verification.submit', { profession: p.key, check: r?.status ?? 'none' });
      setState(await loadVerification());
    } catch (e) {
      Alert.alert('Gönderilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const last = state?.last;
  const rejected = last && ['rejected', 'auto_rejected', 'suspended'].includes(last.status);
  const hardReject = result && result !== 'sent' && ['unreadable', 'student_doc', 'duplicate'].includes(result.status);
  const warnings = result && result !== 'sent' ? checkWarnings(result.checks) : [];
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <IconButton name="close" onPress={() => onClose(!!result)} label="Kapat" />
          <Text style={styles.title}>Belge incelemesi</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 4 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          {state === undefined && <ActivityIndicator color={colors.navy} style={{ marginTop: 24 }} />}
          {state === null && <Notice icon="construct-outline" text="Belge incelemesi için veritabanı güncellemesi bekleniyor." />}
          {!!state && state.enabled === false && <Notice icon="time-outline" text="Belge incelemesi şu an kapalı." />}
          {!!state && state.enabled !== false && (
            <>
              <Text style={styles.body}>
                Mezuniyet belgeni yükle; ekibimiz inceleyince ailelerin davet ekranında "Belgesi incelendi" rozeti görünür. Rozet, belgenin incelendiğini gösterir; aileler seni gerçek hayatta tanıdıklarını yine kendileri onaylar.
              </Text>
              {/* ortak hukuk/50-uygulama-ici-metinler.md 12 */}
              <Text style={styles.small}>
                Belgen yalnız inceleme için okunur, karar verilince silinir; kimlik numaran saklanmaz. Ailelere yalnız "Belgesi incelendi" ve meslek adın görünür; bu bir yetki onayı değildir.
                {legalOn && <>{' '}<InlineLink onPress={() => openLegal('aydinlatma-uzman')}>Uzman Aydınlatma Metni</InlineLink></>}
              </Text>

              {!!state.verified_at && (
                <Card style={{ ...styles.status, backgroundColor: '#E6F4EA' }}>
                  <Ionicons name="shield-checkmark" size={22} color={colors.ok} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>Belgesi incelendi: {state.verified_label}</Text>
                    <Text style={styles.small}>{new Date(state.verified_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · ailelere görünür</Text>
                  </View>
                </Card>
              )}
              {!state.verified_at && last?.status === 'pending' && last.submitted && !result && (
                <Card style={{ ...styles.status, backgroundColor: '#EEF0F5' }}>
                  <Ionicons name="hourglass-outline" size={22} color={colors.navy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>İncelemede: {professionLabel(last.profession)}</Text>
                    <Text style={styles.small}>Ekibimiz inceleyince bildirim gelir.</Text>
                  </View>
                </Card>
              )}
              {rejected && !result && (
                <Card style={{ ...styles.status, backgroundColor: '#FDECEC' }}>
                  <Ionicons name="alert-circle-outline" size={22} color={colors.danger} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.statusTitle}>{last!.status === 'suspended' ? 'Rozet askıya alındı' : 'Belge kabul edilmedi'}</Text>
                    <Text style={styles.small}>{REASONS[last!.reason ?? 'other'] ?? REASONS.other}</Text>
                    {!!last!.note && <Text style={styles.small}>Ekip notu: {last!.note}</Text>}
                  </View>
                </Card>
              )}
              {!!result && (
                <Card style={{ ...styles.status, backgroundColor: hardReject ? '#FDECEC' : '#EEF0F5' }}>
                  <Ionicons name={hardReject ? 'alert-circle-outline' : 'paper-plane-outline'} size={22} color={hardReject ? colors.danger : colors.navy} />
                  <View style={{ flex: 1, gap: 4 }}>
                    <Text style={styles.statusTitle}>{hardReject ? 'Belge kabul edilmedi' : 'Gönderildi, incelemede'}</Text>
                    <Text style={styles.small}>{hardReject ? REASONS[(result as CheckResult).status] : 'Ekibimiz inceleyince bildirim gelir.'}</Text>
                    {warnings.map((w) => <Text key={w} style={[styles.small, { color: '#7A5600' }]}>• {w}</Text>)}
                  </View>
                </Card>
              )}

              {!form ? (
                <Pressable onPress={() => { setForm(true); setResult(null); }} hitSlop={8} style={{ marginTop: 12, alignSelf: 'flex-start' }} accessibilityRole="button">
                  <Text style={styles.link}>{state.verified_at ? 'Başka bir belge yükle' : last?.status === 'pending' ? 'Yerine yeni belge yükle' : 'Belge yükle'}</Text>
                </Pressable>
              ) : (
                <>
                  <Label>Mesleğin</Label>
                  <View style={{ gap: 6 }}>
                    {PROFESSIONS.map((x) => (
                      <Pressable key={x.key} onPress={() => setProfession(x.key)} accessibilityRole="radio" accessibilityState={{ checked: profession === x.key }}
                        style={[styles.option, profession === x.key && styles.optionOn]}>
                        <Ionicons name={profession === x.key ? 'radio-button-on' : 'radio-button-off'} size={18} color={colors.navy} />
                        <Text style={styles.optionText}>{x.label}</Text>
                      </Pressable>
                    ))}
                  </View>
                  {!!p?.manual && <Text style={styles.small}>{p.manual}; ekip ek belge isteyebilir.</Text>}

                  {p?.bacb && (
                    <>
                      <Label>BACB sicil numarası</Label>
                      <Input value={bacb} onChangeText={setBacb} placeholder="Ör. 1-23-45678" autoCapitalize="characters" maxLength={20} />
                      <Text style={styles.small}>Ekip BACB'nin herkese açık sicilinde ad ve numarayla bakar. Mezuniyet belgesi isteğe bağlı.</Text>
                    </>
                  )}

                  <Label>{p?.bacb ? 'Mezuniyet belgesi (isteğe bağlı)' : 'Mezuniyet belgesi'}</Label>
                  <Card style={{ gap: 6 }}>
                    <Text style={styles.small}>1. turkiye.gov.tr'ye gir, "Yükseköğretim Mezun Belgesi Sorgulama"yı aç.</Text>
                    <Text style={styles.small}>2. Mezuniyetini seç, "Belge Oluştur" de ve PDF'i indir.</Text>
                    <Text style={styles.small}>3. PDF'i değiştirmeden burada seç. Fotoğraf ya da tarama kabul edilmez.</Text>
                    <Text style={styles.small}>Klinik psikologsan yüksek lisans ya da doktora derecen belgede görünmeli. Yurt dışı mezunsan YÖK denklik belgeni yükle.</Text>
                    <Pressable onPress={choose} style={styles.pick} accessibilityRole="button">
                      <Ionicons name="document-attach-outline" size={20} color={colors.navy} />
                      <Text style={[styles.optionText, { flex: 1 }]} numberOfLines={1}>{pdf ? pdf.name : 'PDF seç'}</Text>
                      {pdf && <Text style={styles.small}>{Math.max(1, Math.round(pdf.size / 1024))} KB</Text>}
                    </Pressable>
                  </Card>
                  <Text style={[styles.small, { marginTop: 8 }]}>
                    Belgeni yalnız yetkili ekip üyesi görür, her görüntüleme kayda geçer. Karar verilince dosya silinir; yalnız üniversite, bölüm, derece ve mezuniyet yılı kalır. Hesap adın belgedeki adla aynı olmalı.
                  </Text>
                  <View style={{ marginTop: 16 }}><Cta label="İncelemeye gönder" onPress={() => (ready ? send() : Alert.alert(p ? (p.bacb ? 'BACB sicil numarasını yaz' : 'PDF seç') : 'Mesleğini seç'))} busy={busy} /></View>
                </>
              )}
            </>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 8 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  link: { fontSize: 14, fontWeight: '700', color: colors.navy },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8 },
  statusTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 11 },
  optionOn: { borderColor: colors.navy, borderWidth: 1.5 },
  optionText: { fontSize: 14, fontWeight: '600', color: colors.text },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: radius.md, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.navy, paddingHorizontal: 12, paddingVertical: 12, marginTop: 6 },
});
