import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { colors } from '../../theme';
import { Card, Cta, CheckRow } from '../../components/ui';
import { LegalDoc, acceptLegal, openLegal, isNotice } from '../../lib/legal';

// Yeniden onay (hukuk/50-uygulama-ici-metinler.md 2; akislar.md 17 adım 2): açılışta legal_pending('clinic') boş değilse
// panel yerine bu ekran. Her sözleşme metni ayrı kutu, önceden işaretli değil; aydınlatmada kutu yok (bilgilendirme,
// "Devam et" ile gösterildiği kaydedilir). Kabul etmeyen için hesap silme, yasal metinler ve KVKK başvurusu açık (footer).
export default function LegalUpdateScreen({ docs, onDone, footer }: {
  docs: LegalDoc[]; onDone: (left: LegalDoc[]) => void; footer: React.ReactNode;
}) {
  const [checked, setChecked] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const ready = docs.every((d) => isNotice(d.key) || checked.includes(d.key));
  // Özet yalnız güncellenmiş sürümde yazılır; ilk sürümde (hiç onaylanmamış) ekran "devam etmeden önce" der
  const updated = docs.some((d) => !!d.summary);
  const toggle = (key: string) => setChecked((c) => (c.includes(key) ? c.filter((x) => x !== key) : [...c, key]));

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

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <Text style={styles.brand}>ClinicApp</Text>
          <Text style={styles.title}>{updated ? 'Koşullarımız güncellendi' : 'Devam etmeden önce'}</Text>
          <Text style={styles.subtitle}>
            {updated
              ? 'Aşağıdaki metinleri güncelledik. Kısaca ne değiştiğini yazdık; tam metni de okuyabilirsin.'
              : 'ClinicApp\'i kullanmaya devam etmek için aşağıdaki metinleri okuyup onaylaman gerekiyor.'}
          </Text>
          <View style={{ gap: 12, marginTop: 20 }}>
            {docs.map((d) => (
              <Card key={d.key} style={{ gap: 8 }}>
                <Text style={styles.docTitle}>{d.title}</Text>
                <Text style={styles.small}>{d.version}{d.status === 'draft' ? ' · taslak' : ''}</Text>
                {!!d.summary && <Text style={styles.body}>{d.summary}</Text>}
                <Pressable onPress={() => openLegal(d.key, d.version)} hitSlop={8} style={{ alignSelf: 'flex-start' }} accessibilityRole="link">
                  <Text style={styles.link}>Tam metni oku</Text>
                </Pressable>
                {isNotice(d.key)
                  ? <Text style={styles.small}>Kişisel verilerinin nasıl işlendiğini bu metinde anlatıyoruz. Bilgilendirmedir; onay kutusu yoktur.</Text>
                  : (
                    <CheckRow checked={checked.includes(d.key)} onToggle={() => toggle(d.key)}>
                      {`${d.title} metnini okudum, kabul ediyorum.`}
                    </CheckRow>
                  )}
              </Card>
            ))}
            <Cta label="Devam et" onPress={accept} busy={busy} disabled={!ready} />
            <Text style={styles.small}>Kabul etmek istemiyorsan hesabını silebilirsin.</Text>
          </View>
          {footer}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 16, flexGrow: 1 },
  column: { width: '100%', maxWidth: 560, alignSelf: 'center' },
  brand: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 1, marginTop: 20 },
  title: { fontSize: 24, fontWeight: '700', color: colors.navy, marginTop: 6 },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
  docTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  link: { fontSize: 13, fontWeight: '700', color: colors.navy, textDecorationLine: 'underline' },
});
