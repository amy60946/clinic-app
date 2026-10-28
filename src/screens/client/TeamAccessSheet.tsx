import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Switch, Alert, StyleSheet, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, radius } from '../../theme';
import { IconButton } from '../../components/ui';
import { Client, ClinicianMe, Member, assignClient, setResponsible } from '../../lib/clinic';
import { track } from '../../lib/track';

// Klinik sahibi: bu danışanı hangi ekip üyelerinin göreceğini seçer, sorumlu uzmanı değiştirir.
// Ekip üyesi yalnız kendi davet ettiği ve kendisine atanan danışanları görür (ortak 20261022100000).
export default function TeamAccessSheet({ visible, onClose, client, me, team, onChanged }: {
  visible: boolean;
  onClose: () => void;
  client: Client;
  me: ClinicianMe;
  team: Member[];
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const assigned = new Set(client.assigned ?? []);
  const others = team.filter((m) => m.id !== me.id);

  const toggle = async (m: Member, on: boolean) => {
    setBusy(m.id);
    try {
      await assignClient(client.link_id, m.id, on);
      track('client.assign', { on });
      onChanged();
    } catch (e) {
      Alert.alert('Kaydedilemedi', (e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  const makeResponsible = (m: Member) => Alert.alert(`${m.name || 'Bu uzman'} sorumlu olsun mu?`,
    'Aileden gelen bildirimler (davranış kaydı, paylaşım, öneri kararı) ona gider. Sen bu danışanı görmeye devam edersin.',
    [{ text: 'Vazgeç', style: 'cancel' }, {
      text: 'Sorumlu yap', onPress: async () => {
        setBusy(m.id);
        try {
          await setResponsible(client.link_id, m.id);
          track('client.responsible');
          onChanged();
        } catch (e) {
          Alert.alert('Kaydedilemedi', (e as Error).message);
        } finally {
          setBusy(null);
        }
      },
    }]);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.column}>
          <View style={styles.header}>
            <IconButton name="close" onPress={onClose} label="Kapat" />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Ekip erişimi</Text>
              <Text style={styles.cap}>{client.child_name || 'Bu danışan'}</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10 }}>
            <Text style={styles.body}>
              Bu danışanı hangi ekip üyelerinin göreceğini seç. Açtığın uzman çocuğun kayıtlarını, notlarını ve hedeflerini görür; kapatınca erişimi hemen biter.
            </Text>
            {client.clinician_id === me.id && (
              <Text style={styles.cap}>Sorumlu uzman sensin.</Text>
            )}
            {others.length === 0 && <Text style={styles.cap}>Ekipte başka uzman yok. Ana ekrandaki Ekip bölümünden davet et.</Text>}
            {others.map((m) => {
              const responsible = client.clinician_id === m.id;
              const on = responsible || assigned.has(m.id);
              return (
                <View key={m.id} style={styles.row}>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={styles.h}>{m.name || 'Adsız'}{m.title ? ` · ${m.title}` : ''}</Text>
                    {responsible ? (
                      <Text style={styles.badge}>Sorumlu uzman</Text>
                    ) : on ? (
                      <Pressable onPress={() => makeResponsible(m)} hitSlop={6}><Text style={styles.link}>Sorumlu yap</Text></Pressable>
                    ) : (
                      <Text style={styles.cap}>Bu danışanı görmüyor</Text>
                    )}
                  </View>
                  <Switch value={on} disabled={responsible || busy === m.id} onValueChange={(v) => toggle(m, v)}
                    trackColor={{ true: colors.navy }} accessibilityLabel={`${m.name} bu danışanı görsün`} />
                </View>
              );
            })}
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: '#fff' },
  h: { fontSize: 14, fontWeight: '600', color: colors.navy },
  cap: { fontSize: 12, color: colors.muted },
  badge: { fontSize: 12, color: colors.ok, fontWeight: '600' },
  link: { fontSize: 12, fontWeight: '700', color: colors.navy },
});
