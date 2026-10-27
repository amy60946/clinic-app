import React, { useEffect, useState } from 'react';
import { View, Text, Platform, StyleSheet } from 'react-native';
import { colors } from '../theme';
import { SmallButton, InlineLink } from './ui';
import { publicLegal, openLegal } from '../lib/legal';

// ClinicApp web çerez bandı (ortak hukuk/40-cerez-politikasi.md, 50 bölüm 11): yalnız zorunlu depolama olduğu için onay değil
// bilgilendirme; içeriği kapatmayan alt bant, "Anladım" sonrası bu tarayıcıda bir daha görünmez. Politika yayında değilse çıkmaz.
// Tarayıcıda tutulanlar (politikanın 3. bölümü): Supabase oturumu (sb-<proje>-auth-token, e-posta bağlantısında geçici
// sb-<proje>-auth-token-code-verifier), ilk kullanım rehberi görüldü (clinic.onboarding.v1.<kimlik>), bu bant (KEY).
const KEY = 'clinicapp.cookie-notice.v1';

export default function CookieNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    try { if (window.localStorage.getItem(KEY) === '1') return; } catch { /* depolama kapalı: bant gösterilir */ }
    let live = true;
    publicLegal().then((l) => { if (live && l?.some((d) => d.key === 'cerez-clinicapp-web')) setShow(true); });
    return () => { live = false; };
  }, []);
  if (!show) return null;
  const ok = () => {
    try { window.localStorage.setItem(KEY, '1'); } catch { /* yok say */ }
    setShow(false);
  };
  return (
    <View style={styles.bar} accessibilityRole="summary">
      <View style={styles.inner}>
        <Text style={styles.text}>
          ClinicApp web yalnız oturumunu açık tutmak ve seçimlerini hatırlamak için zorunlu tarayıcı depolaması kullanır. Analiz ya da reklam çerezi yok.{' '}
          <InlineLink onPress={() => openLegal('cerez-clinicapp-web')}>Çerez Politikası</InlineLink>
        </Text>
        <SmallButton label="Anladım" onPress={ok} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingHorizontal: 16, paddingVertical: 10 },
  inner: { width: '100%', maxWidth: 760, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 12 },
  text: { flex: 1, minWidth: 220, fontSize: 12, color: colors.text, lineHeight: 18 },
});
