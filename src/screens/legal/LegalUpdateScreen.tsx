import React, { useState } from 'react';
import { View, Text, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors, radius } from '../../theme';
import { Cta, CheckRow, InlineLink, InfoText } from '../../components/ui';
import { LegalDoc, acceptLegal, openLegal, isNotice } from '../../lib/legal';

// Yeniden onay (akislar.md 17 adım 2): açılışta legal_pending('clinic') boş değilse panel yerine bu küçük kart.
// Kullanıcı kararı 28 Ekim 2026: büyük sayfa yok — tek kısa satır, metin adları bağlantı (ayrıntı orada), sözleşmeler için
// tek kutu (önceden işaretli değil); aydınlatma bilgilendirmedir, "Devam et" ile gösterildiği kaydedilir. Güncellemede
// "Neler değişti?" açılır kutuda. Kabul etmeyen için hesap silme, yasal metinler ve KVKK başvurusu açık (footer).
export default function LegalUpdateScreen({ docs, onDone, footer }: {
  docs: LegalDoc[]; onDone: (left: LegalDoc[]) => void; footer: React.ReactNode;
}) {
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const contracts = docs.filter((d) => !isNotice(d.key));
  const notices = docs.filter((d) => isNotice(d.key));
  const ready = !contracts.length || agree;
  const changes = docs.filter((d) => !!d.summary).map((d) => `${d.title}: ${d.summary}`);

  const accept = async () => {
    if (!ready) return;
    setBusy(true);
    try {
      onDone(await acceptLegal(docs));
    } catch (e) {
      Alert.alert('Onay kaydedilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const links = (list: LegalDoc[]) => list.map((d, i) => (
    <React.Fragment key={d.key}>
      {i > 0 && (i === list.length - 1 ? ' ve ' : ', ')}
      <InlineLink onPress={() => openLegal(d.key, d.version)}>{d.title}</InlineLink>
    </React.Fragment>
  ));

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.card}>
          <Text style={styles.brand}>ClinicApp</Text>
          <Text style={styles.title}>{changes.length ? 'Metinlerimiz güncellendi' : 'Devam etmeden önce'}</Text>
          {!!changes.length && <InfoText small text="Kısaca neler değişti?" detail={changes} />}
          {contracts.length > 0 ? (
            <CheckRow small checked={agree} onToggle={() => setAgree((a) => !a)}>
              {links(contracts)}
              {'\'ni kabul ediyorum.'}
              {notices.length > 0 && ' Bilgilendirme: '}
              {notices.length > 0 && links(notices)}
            </CheckRow>
          ) : (
            <Text style={styles.small}>{links(notices)}{' güncellendi.'}</Text>
          )}
          <Cta label="Devam et" onPress={accept} busy={busy} disabled={!ready} />
        </View>
        <View style={styles.footer}>{footer}</View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  card: { width: '100%', maxWidth: 440, alignSelf: 'center', backgroundColor: '#fff', borderRadius: radius.lg, padding: 22, gap: 14 },
  brand: { fontSize: 12, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy, marginTop: -6 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  footer: { width: '100%', maxWidth: 440, alignSelf: 'center' },
});
