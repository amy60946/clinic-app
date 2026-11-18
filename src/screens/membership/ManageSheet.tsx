import React, { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Platform, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { IconButton, Cta } from '../../components/ui';
import { track } from '../../lib/track';
import { MANAGE_URL } from '../../lib/store';
import type { Period } from '../../lib/billing';
import { CancelAction, CancelPlan, CancelReason, SUPPORT_URL, alternativeFor, reasonsFor } from '../../lib/cancelFlow';

// "Aboneliği yönet" (uzaktan ayar bayrağı `cancel_flow`; docs/arastirma/iptal-benchmark.md 4.1, 4.3; kurallar src/lib/cancelFlow.ts).
// Yalnız klinik sahibi görür. İptali Apple yapar: bu pencere Apple'ın abonelik sayfasından ÖNCE açılır.
//   1 Üyeliğin (plan, dönem, mağazadan gelen fiyat, yenileme) → 2 Ayrılmadan önce bir soru (yanıtlamak zorunlu değil)
//   → 3 nedene uyan tek seçenek ekranı (indirim yok) → Apple'ın abonelik sayfası.
// DEĞİŞMEZ KURALLAR (Türkiye'de iptali zorlaştıran arayüz kuralları + Apple 5.6): iptal çıkışı her ekranda durur ve o ekrandaki
// öteki ikincil düğmeyle AYNI bileşendir (`Second`: aynı boy, renk, çerçeve; küçültme, soldurma yok). Soru atlanınca pencereden
// Apple'ın sayfasına iki dokunuş. Geri sayım, "emin misin" döngüsü, suçluluk metni, uydurma sayı yok; hiçbir adım çıkışı bekletmez.
// Bir açılışta en çok bir seçenek ekranı: geri dönüp başka neden seçilirse "Devam" doğrudan çıkışa gider.
export type ManageSummary = {
  name: string;                    // Bireysel / Klinik
  period: Period | null;
  seats: number | null;
  price: string | null;            // mağazadaki (web'de sunucudaki) fiyat; yoksa satır yazılmaz, fiyat sabit yazılmaz
  until: string | null;            // dönem sonu
  willRenew: boolean | null;       // null: bilinmiyor → satır yazılmaz (tahmin edilmez)
};
type Step = 'summary' | 'reason' | 'alt' | 'web';

const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const PERIOD = { monthly: 'Aylık', yearly: 'Yıllık' } as const;
export const CANCEL_LABEL = 'Aboneliği iptal et';
export const SKIP_LABEL = 'Yanıtlamadan iptale git';
export const WEB_CANCEL_TEXT = 'Aboneliği iPhone ya da iPad\'de App Store aboneliklerinden iptal edebilirsin.';

type Props = {
  visible: boolean;
  summary: ManageSummary;
  plan: CancelPlan;
  web: boolean;                                // mağaza yok: çıkışta Apple'ın sayfası yerine açıklama + bağlantı
  onClose: () => void;
  onPackages: (period?: Period) => void;       // pencere kapanır, üyelik ekranındaki paket listesi gösterilir
  onRestore?: () => void;                      // "Satın alımları geri yükle" (mağaza olan yerde)
  onHelp?: () => void;                         // "Nasıl kullanılır?" (bu ekrandan açılabiliyorsa)
  onExit: () => void;                          // Apple'ın abonelik sayfası
};

export default function ManageSheet(p: Props) {
  // iOS'ta bir pencere kapanmadan başka pencere (ya da Apple'ın sayfası) açılamaz: işlem pencere kapanınca (onDismiss) çalışır.
  // Web'de pencere kapanırken odak eski düğmeye döner ve sayfayı oraya kaydırır: işlem bundan hemen sonra çalışır
  // (yoksa "Planı değiştir"in paket listesine kaydırması geri alınıyordu). onDismiss gelmezse 700 ms sonra yedek çağrı.
  const after = useRef<(() => void) | null>(null);
  const run = () => { const f = after.current; after.current = null; f?.(); };
  const closeThen = (f: () => void) => {
    after.current = f;
    p.onClose();
    setTimeout(run, 700);
  };
  const dismissed = () => { if (Platform.OS === 'web') setTimeout(run, 60); else run(); };
  return (
    <Modal visible={p.visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={p.onClose} onDismiss={dismissed}>
      {p.visible && <Body {...p} closeThen={closeThen} />}
    </Modal>
  );
}

function Body({ summary, plan, web, onClose, onPackages, onRestore, onHelp, onExit, closeThen }: Props & { closeThen: (f: () => void) => void }) {
  const [step, setStep] = useState<Step>('summary');
  const [reason, setReason] = useState<CancelReason | null>(null);
  const altSeen = useRef(false);
  useEffect(() => { track('membership.cancel_open'); }, []);
  const alt = reason ? alternativeFor(reason, { ...plan, help: plan.help && !!onHelp }) : null;

  // Çıkış: Apple'ın abonelik sayfası (web'de açıklama). `r` soru atlandıysa null.
  const exit = (from: 'reason' | 'alt', r: CancelReason | null) => {
    track('membership.cancel_exit', { step: from, reason: r });
    if (web) return setStep('web');
    closeThen(onExit);
  };
  const next = () => {
    if (!reason) return;
    track('membership.cancel_reason', { reason });
    if (!alt || altSeen.current) return exit('reason', reason);
    altSeen.current = true;
    setStep('alt');
  };
  const act = (a: CancelAction) => {
    track('membership.cancel_alt', { reason, action: a });
    if (a === 'support') return void Linking.openURL(SUPPORT_URL).catch(() => {});
    if (a === 'help') return closeThen(() => onHelp?.());
    closeThen(() => onPackages(a === 'solo' ? undefined : a));
  };

  const title = step === 'summary' ? 'Üyeliğin' : step === 'reason' ? 'Ayrılmadan önce bir soru' : step === 'alt' ? alt?.title ?? '' : CANCEL_LABEL;
  const back = step === 'reason' ? () => setStep('summary') : step === 'alt' ? () => setStep('reason') : step === 'web' ? () => setStep('reason') : null;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          {back && <IconButton name="chevron-back" onPress={back} label="Geri" />}
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          <IconButton name="close" onPress={onClose} label="Kapat" />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          {step === 'summary' && (
            <>
              <View style={styles.card}>
                <Text style={styles.plan}>{[summary.name, summary.period && PERIOD[summary.period]].filter(Boolean).join(' · ')}</Text>
                {!!summary.seats && summary.seats > 1 && <Text style={styles.body}>{`${summary.seats} uzmana kadar`}</Text>}
                {!!summary.price && <Text style={styles.body}>{`${summary.price}${summary.period ? (summary.period === 'yearly' ? ' / yıl' : ' / ay') : ''}`}</Text>}
                {!!summary.until && summary.willRenew !== null && (
                  <Text style={styles.body}>
                    {summary.willRenew ? `${dateText(summary.until)} tarihinde kendiliğinden yenilenir` : `${dateText(summary.until)} tarihine kadar açık; yenilenmeyecek`}
                  </Text>
                )}
              </View>
              <View style={styles.actions}>
                <Second label="Planı değiştir" onPress={() => closeThen(() => onPackages())} />
                {onRestore && <Second label="Satın alımları geri yükle" onPress={() => closeThen(onRestore)} />}
                <Second label={CANCEL_LABEL} onPress={() => setStep('reason')} />
              </View>
            </>
          )}

          {step === 'reason' && (
            <>
              <Text style={styles.lead}>Nedenini söylersen Moyo Mercek'i ona göre düzeltiriz. Yanıtlamak zorunda değilsin.</Text>
              <View style={styles.list} accessibilityRole="radiogroup">
                {reasonsFor(plan.pkg).map((r, i) => {
                  const on = reason === r.id;
                  return (
                    <Pressable key={r.id} onPress={() => setReason(r.id)} accessibilityRole="radio" accessibilityState={{ checked: on }} aria-checked={on}
                      style={({ pressed }) => [styles.row, i > 0 && styles.line, pressed && { backgroundColor: '#F7F8FA' }]}>
                      <Ionicons name={on ? 'radio-button-on' : 'radio-button-off'} size={20} color={on ? colors.navy : colors.muted} />
                      <Text style={[styles.rowText, on && { fontWeight: '700' }]}>{r.label}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}

          {step === 'alt' && alt && (
            <>
              {alt.lines.map((t) => <Text key={t} style={styles.lead}>{t}</Text>)}
              <View style={styles.actions}>
                {alt.actions.map((a) => <Second key={a.id} label={a.label} onPress={() => act(a.id)} />)}
                <Second label={CANCEL_LABEL} onPress={() => exit('alt', reason)} />
              </View>
            </>
          )}

          {step === 'web' && (
            <>
              <Text style={styles.lead}>{WEB_CANCEL_TEXT}</Text>
              <View style={styles.actions}>
                <Second label="App Store aboneliklerini aç" icon="open-outline" link onPress={() => Linking.openURL(MANAGE_URL).catch(() => {})} />
              </View>
              <Text style={styles.small}>{MANAGE_URL.replace('https://', '')}</Text>
            </>
          )}
        </ScrollView>
        {/* Soru ekranında liste uzun: düğmeler kaydırmanın dışında, altta sabit (küçük telefonda da iptal çıkışı hep görünür).
            Soruyu atlayıp iptale gitmek öteki ekranlardaki "Aboneliği iptal et" ile aynı düğmedir (daha soluk ya da küçük değil). */}
        {step === 'reason' && (
          <View style={styles.footer}>
            <Cta label="Devam" onPress={next} disabled={!reason} style={{ marginTop: 0 }} />
            <Second label={SKIP_LABEL} onPress={() => exit('reason', null)} />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

// Pencerenin bütün ikincil düğmeleri: seçenek de, "Aboneliği iptal et" de aynı bileşen (aynı boy, yazı, renk, dokunma alanı)
function Second({ label, onPress, icon, link }: { label: string; onPress: () => void; icon?: keyof typeof Ionicons.glyphMap; link?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole={link ? 'link' : 'button'} style={({ pressed }) => [styles.second, pressed && { backgroundColor: '#F1F3F8' }]}>
      {icon && <Ionicons name={icon} size={17} color={colors.navy} />}
      <Text style={styles.secondText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { flex: 1, fontSize: 17, fontWeight: '700', color: colors.navy, paddingHorizontal: 4 },
  scroll: { padding: 16, paddingBottom: 24, gap: 14 },
  card: { backgroundColor: '#fff', borderRadius: radius.md, padding: 16, gap: 4 },
  plan: { fontSize: 18, fontWeight: '700', color: colors.navy, marginBottom: 2 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  lead: { fontSize: 15, color: colors.text, lineHeight: 22 },
  small: { fontSize: 12, color: colors.muted, textAlign: 'center' },
  list: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, minHeight: 48, paddingVertical: 10 },
  line: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  rowText: { flex: 1, fontSize: 15, color: colors.text, lineHeight: 20 },
  actions: { gap: 10 },
  footer: { gap: 10, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, backgroundColor: colors.bg },
  second: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 50, paddingHorizontal: 16, paddingVertical: 12,
    borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.navy, backgroundColor: '#fff',
  },
  secondText: { fontSize: 15, fontWeight: '700', color: colors.navy, textAlign: 'center', flexShrink: 1 },
});
