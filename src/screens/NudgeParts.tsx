import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Card, Toggle, SmallButton } from '../components/ui';
import { nudgeDeviceOn, nudgesEnabled, setNudgesEnabled, devicePermission, enableNotifications, primerAnswered, type NudgePermission } from '../lib/nudges';

// Hatırlatmaların iki arayüz parçası (uzaktan ayar bayrağı `lifecycle_nudges`; docs/arastirma/bildirim-benchmark.md M3, 5.9):
// izin açıklaması (ilk davetten sonra, iOS izin penceresinden önce) ve Ayarlar › Bildirimler.

export const PRIMER_TEXT = 'Aile daveti kabul ettiğinde ve ebeveyn bir kaydı tamamladığında haber verelim mi? Gece ve hafta sonu hatırlatma göndermeyiz.';
export const QUIET_TEXT = 'Hafta içi 08:30–19:00 dışında hatırlatma göndermeyiz. Deneme bitmeden 3 gün önce bir kez haber veririz.';
const DENIED = () => Alert.alert('İzin gerekli', 'Cihazın Ayarlar › Moyo Mercek › Bildirimler bölümünden izin ver, sonra tekrar dene.');

// İzin, yerinde: ne gönderileceğini söyler; "Bildirimleri aç" iOS izin penceresini açar, "Şimdi değil" kapatır
// (yeniden yalnız Ayarlar'dan sorulur). İki yanıt da kaydedilir, açıklama bir daha kendiliğinden çıkmaz.
export function NudgePrimer({ visible, userId, onClose }: { visible: boolean; userId: string; onClose: () => void }) {
  const answer = (allow: boolean) => {
    primerAnswered(userId);
    onClose();
    if (allow) enableNotifications();
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={() => answer(false)}>
      <View style={styles.scrim}>
        <View style={styles.dialog} accessibilityRole="alert">
          <View style={styles.icon}><Ionicons name="notifications-outline" size={24} color={colors.navy} /></View>
          <Text style={styles.title}>Bildirimler</Text>
          <Text style={styles.text}>{PRIMER_TEXT}</Text>
          <Pressable onPress={() => answer(true)} accessibilityRole="button" style={({ pressed }) => [styles.primary, pressed && { opacity: 0.85 }]}>
            <Text style={styles.primaryText}>Bildirimleri aç</Text>
          </Pressable>
          <Pressable onPress={() => answer(false)} accessibilityRole="button" style={({ pressed }) => [styles.later, pressed && { opacity: 0.7 }]}>
            <Text style={styles.laterText}>Şimdi değil</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

// Ayarlar › Bildirimler: tek anahtar (kullanıcı başına bu cihazda, varsayılan açık) + sessiz saat satırı. Hatırlatma yalnız
// iPhone / iPad'de planlandığı için blok web'de görünmez. Cihaz izni yoksa buradan istenir.
export function NudgeSettings({ userId }: { userId: string }) {
  const [on, setOn] = useState(true);
  const [perm, setPerm] = useState<NudgePermission | null>(null);
  useEffect(() => {
    let live = true;
    nudgesEnabled(userId).then((v) => { if (live) setOn(v); });
    devicePermission().then((v) => { if (live) setPerm(v); });
    return () => { live = false; };
  }, [userId]);
  if (!nudgeDeviceOn) return null;
  const toggle = (v: boolean) => { setOn(v); setNudgesEnabled(userId, v); };
  const allow = async () => {
    if (perm === 'denied') return DENIED();
    primerAnswered(userId);
    const r = await enableNotifications();
    setPerm(r);
    if (r === 'denied') DENIED();
  };
  return (
    <>
      <Text style={styles.section}>Bildirimler</Text>
      <Card style={{ gap: 10 }}>
        <View style={styles.row}>
          <Text style={styles.label}>Hatırlatmalar ve ipuçları</Text>
          <Toggle value={on} onChange={toggle} />
        </View>
        <Text style={styles.small}>{QUIET_TEXT}</Text>
        {perm !== null && perm !== 'granted' && (
          <View style={styles.perm}>
            <Text style={[styles.small, { flex: 1 }]}>Bu cihazda bildirim izni yok; hatırlatmalar gelmez.</Text>
            <SmallButton label="Bildirimleri aç" onPress={allow} />
          </View>
        )}
      </Card>
    </>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(10,14,28,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  dialog: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: radius.md, padding: 20, alignItems: 'stretch' },
  icon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.today, alignItems: 'center', justifyContent: 'center', alignSelf: 'center' },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy, textAlign: 'center', marginTop: 12 },
  text: { fontSize: 14.5, lineHeight: 21, color: colors.text, textAlign: 'center', marginTop: 8 },
  primary: { height: 50, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  later: { height: 46, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  laterText: { fontSize: 15, fontWeight: '600', color: colors.navy },
  section: { fontSize: 16, fontWeight: '700', color: colors.navy, marginTop: 28, marginBottom: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  label: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.navy },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  perm: { flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, paddingTop: 10 },
});
