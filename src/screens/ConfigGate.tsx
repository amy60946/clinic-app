import React, { useState } from 'react';
import { View, Text, Pressable, Platform, Linking, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Cta, LinkText } from '../components/ui';
import { useClientConfig, appVersion } from '../lib/clientConfig';

// Yönetim panelinin uygulama ayarı (client_config): bakım modu ve zorunlu güncelleme paneli kapatır.
// App Store bağlantısı uygulama mağazada yayınlanınca EXPO_PUBLIC_APP_STORE_URL ile verilir.
const STORE_URL = process.env.EXPO_PUBLIC_APP_STORE_URL;

export default function ConfigGate({ children, onSignOut }: { children: React.ReactNode; onSignOut: () => void }) {
  const { maintenance, needsUpdate, minVersion, reload } = useClientConfig();
  const [busy, setBusy] = useState(false);
  const retry = async () => { setBusy(true); await reload(); setBusy(false); };

  if (maintenance) {
    return (
      <Blocker icon="construct-outline" title="Kısa bir bakım yapıyoruz"
        text="ClinicApp birazdan yeniden açılacak. Danışanlarının verisi güvende; ailelerin kayıtları bu sırada da toplanmaya devam eder.">
        <Cta label="Tekrar dene" onPress={retry} busy={busy} />
        <LinkText onPress={onSignOut}>Çıkış yap</LinkText>
      </Blocker>
    );
  }
  if (needsUpdate) {
    const web = Platform.OS === 'web';
    return (
      <Blocker icon="arrow-up-circle-outline" title="Güncelleme gerekli"
        text={web
          ? 'ClinicApp\'in yeni bir sürümü var. Devam etmek için sayfayı yenile.'
          : `Bu sürüm (${appVersion}) artık desteklenmiyor; en az ${minVersion} gerekli. ${STORE_URL ? 'App Store\'dan güncelle.' : 'App Store ya da TestFlight\'tan güncelle.'}`}>
        {web ? (
          <Cta label="Sayfayı yenile" onPress={() => window.location.reload()} />
        ) : STORE_URL ? (
          <Cta label="App Store'da aç" onPress={() => Linking.openURL(STORE_URL)} />
        ) : null}
        <LinkText onPress={retry}>Tekrar kontrol et</LinkText>
      </Blocker>
    );
  }
  return <>{children}</>;
}

function Blocker({ icon, title, text, children }: {
  icon: keyof typeof Ionicons.glyphMap; title: string; text: string; children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.column}>
        <Text style={styles.brand}>ClinicApp</Text>
        <View style={styles.icon}><Ionicons name={icon} size={30} color={colors.navy} /></View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.text}>{text}</Text>
        <View style={{ gap: 8, marginTop: 20, alignSelf: 'stretch' }}>{children}</View>
      </View>
    </SafeAreaView>
  );
}

// Ana ekranın üstünde kapatılabilir duyuru; aynı metin bu oturumda bir kez kapatılınca bir daha gösterilmez
let dismissed: string | null = null;
export function ConfigBanner() {
  const { banner } = useClientConfig();
  const [, force] = useState(0);
  if (!banner || dismissed === banner) return null;
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <Ionicons name="megaphone-outline" size={18} color={colors.navy} />
      <Text style={styles.bannerText}>{banner}</Text>
      <Pressable onPress={() => { dismissed = banner; force((n) => n + 1); }} hitSlop={8} accessibilityLabel="Duyuruyu kapat">
        <Ionicons name="close" size={18} color={colors.muted} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 420, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', padding: 24 },
  brand: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 1, marginBottom: 24 },
  icon: { width: 64, height: 64, borderRadius: 32, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: colors.navy, textAlign: 'center' },
  text: { fontSize: 14, color: colors.muted, textAlign: 'center', lineHeight: 21, marginTop: 8 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, marginBottom: 12 },
  bannerText: { flex: 1, fontSize: 13, color: colors.navy, lineHeight: 19 },
});
