// Hesap seçici ve ekibe katılma istekleri (ortak akislar.md 21). Kullanıcıya görünen ad "hesap" (kullanıcı kararı 5 Kasım 2026):
// "Bireysel hesap" (kendi danışanları) + "Ekip hesabı" (kliniğin ekibine kabul edilince sistem açar; klinik adı klinikten gelir,
// altında uzmanın adı). Burada klinik kurulmaz ve ad verilmez (kendi kliniği: Ayarlar › "Kendi kliniğini kur"). Ana ekranda köşedeki küçük düğmeden açılır.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Card, SmallButton, IconButton, InfoText } from '../components/ui';
import {
  ClinicianMe, Workspace, MyRequest, listWorkspaces, openPersonalWorkspace, myTeamRequests, respondTeamRequest,
} from '../lib/clinic';
import { useWorkspace } from '../lib/workspace';
import { useNotifications } from '../lib/notificationsContext';
import { track } from '../lib/track';

export const PERSONAL_LABEL = 'Bireysel hesap';
export const TEAM_LABEL = 'Ekip hesabı';

const roleText = (w: Workspace) => (w.role === 'owner' ? `Sahip · ${w.members} uzman` : `Ekip üyesi · ${w.members} uzman`);

export function WorkspaceSheet({ visible, me, onClose }: { visible: boolean; me: ClinicianMe; onClose: () => void }) {
  const { switchTo } = useWorkspace();
  const [list, setList] = useState<Workspace[] | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (visible) listWorkspaces().then(setList).catch(() => setList([])); }, [visible]);
  const go = (w: Workspace) => {
    onClose();
    if (w.clinic_id === me.clinic_id) return;
    track('workspace.switch', { personal: w.personal });
    switchTo(w.clinic_id);
  };
  const openPersonal = async () => {
    setBusy(true);
    try {
      const id = await openPersonalWorkspace();
      track('workspace.create', { kind: 'personal' });
      onClose();
      switchTo(id);
    } catch (e) { Alert.alert('Açılamadı', (e as Error).message); } finally { setBusy(false); }
  };
  const personal = list?.filter((w) => w.personal) ?? [];
  const teams = list?.filter((w) => !w.personal) ?? [];
  const item = (w: Workspace) => {
    const on = w.clinic_id === me.clinic_id;
    return (
      <Pressable key={w.clinic_id} onPress={() => go(w)} accessibilityRole="radio" accessibilityState={{ selected: on }}
        style={({ pressed }) => [styles.item, on && styles.itemOn, pressed && { opacity: 0.85 }]}>
        <Ionicons name={w.personal ? 'person-outline' : 'business-outline'} size={20} color={colors.navy} />
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle} numberOfLines={2}>{w.personal ? PERSONAL_LABEL : w.name}</Text>
          <Text style={styles.small}>{[me.name, w.personal ? 'kendi danışanların' : roleText(w), !w.access && 'üyelik etkin değil'].filter(Boolean).join(' · ')}</Text>
        </View>
        {on && <Ionicons name="checkmark-circle" size={20} color={colors.navy} />}
      </Pressable>
    );
  };
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.head, styles.col]}>
          <Text style={styles.title}>Hesap</Text>
          <IconButton name="close" onPress={onClose} label="Kapat" />
        </View>
        <ScrollView contentContainerStyle={[{ padding: 16, gap: 10 }, styles.col]}>
          <Text style={styles.small}>Danışanlar, davetler, notlar ve seanslar seçili hesaba aittir; hesaplar birbirini görmez.</Text>
          {list === null ? <ActivityIndicator color={colors.navy} /> : (
            <>
              <Text style={styles.label}>{PERSONAL_LABEL}</Text>
              {personal.map(item)}
              {!personal.length && (
                <Pressable onPress={openPersonal} disabled={busy} style={({ pressed }) => [styles.item, styles.dashed, pressed && { opacity: 0.85 }]}>
                  <Ionicons name="add-circle-outline" size={20} color={colors.navy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemTitle}>Bireysel hesabını aç</Text>
                    <Text style={styles.small}>Kendi adına çalıştığın aileler için; kliniklerden ayrı.</Text>
                  </View>
                </Pressable>
              )}
              <Text style={[styles.label, { marginTop: 8 }]}>{TEAM_LABEL}</Text>
              {teams.map(item)}
              {!teams.length && (
                <View style={[styles.item, styles.dashed, { backgroundColor: '#fff', alignItems: 'flex-start' }]}>
                  <Ionicons name="business-outline" size={20} color={colors.muted} style={{ marginTop: -1 }} />
                  <View style={{ flex: 1 }}>
                    <InfoText small text="Henüz klinik daveti yok"
                      detail={['Bir kliniğin davetini kabul ettiğinde hesap burada görünür; o kliniğin danışanlarıyla buradan çalışırsın. Klinik seni Ayarlar\'daki kişisel kodunla davet eder.']} />
                  </View>
                </View>
              )}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

// Ana ekranda üstte: bekleyen ekibe katılma istekleri
export function TeamRequestsCard({ me, reloadKey, onAccepted }: { me: ClinicianMe; reloadKey: number; onAccepted: (r: MyRequest) => void }) {
  const [list, setList] = useState<MyRequest[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const { items, markRead } = useNotifications();
  useEffect(() => { if (me.requests) myTeamRequests().then(setList).catch(() => setList([])); else setList([]); }, [me.requests, reloadKey]);
  if (!list.length) return null;
  const answer = async (r: MyRequest, accept: boolean) => {
    setBusy(r.id);
    try {
      const out = await respondTeamRequest(r.id, accept);
      track('team.respond', { accept });
      if (out.error === 'seat_full') Alert.alert('Kliniğin koltukları dolu', 'Klinik sahibine haber ver; koltuk açılınca isteği yeniden göndersin.');
      else if (out.error) Alert.alert('İstek artık geçerli değil');
      setList((l) => l.filter((x) => x.id !== r.id));
      const seen = items.filter((n) => n.kind === 'team_request' && !n.readAt && n.data?.request_id === r.id).map((n) => n.id);
      if (seen.length) markRead(seen);
      if (accept && out.status === 'accepted') onAccepted(r);
    } catch (e) { Alert.alert('Yanıtlanamadı', (e as Error).message); } finally { setBusy(null); }
  };
  return (
    <View style={{ gap: 8, marginTop: 12 }}>
      {list.map((r) => (
        <Card key={r.id} style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
            <Ionicons name="people-outline" size={20} color={colors.navy} />
            <View style={{ flex: 1 }}>
              <Text style={styles.itemTitle}>{`${r.clinic} seni ekibine eklemek istiyor`}</Text>
              {!!r.by && <Text style={styles.small}>{`Gönderen: ${r.by}${r.by_title ? ` (${r.by_title})` : ''}`}</Text>}
              <Text style={styles.small}>{`Ekipte ${r.members} uzman`}</Text>
            </View>
          </View>
          <Text style={styles.small}>Kabul edersen bu kliniğin danışanları ayrı bir ekip hesabında açılır; bireysel hesabın ayrı kalır.</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Pressable onPress={() => answer(r, true)} disabled={busy === r.id} accessibilityRole="button"
              style={({ pressed }) => [styles.primary, (pressed || busy === r.id) && { opacity: 0.8 }]}>
              {busy === r.id ? <ActivityIndicator color="#fff" size="small" /> : <Text style={styles.primaryText}>Kabul et</Text>}
            </Pressable>
            <SmallButton label="Reddet" onPress={() => answer(r, false)} />
          </View>
        </Card>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14 },
  itemOn: { borderColor: colors.navy, borderWidth: 1.5 },
  dashed: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#6B7387' },
  col: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  primary: { backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, minWidth: 96, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
