// Çalışma alanı seçici ve ekibe katılma istekleri (ortak akislar.md 21): "Bireysel çalışmam" + klinikler; bireysel alanı aç,
// klinik aç. İstek kartı ana ekranda: klinik adı, gönderen, ekip sayısı → Kabul et / Reddet.
import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, Modal, ScrollView, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Card, Input, SmallButton, IconButton } from '../components/ui';
import {
  ClinicianMe, Workspace, MyRequest, listWorkspaces, openPersonalWorkspace, createClinicWorkspace, myTeamRequests, respondTeamRequest,
} from '../lib/clinic';
import { useWorkspace } from '../lib/workspace';
import { useNotifications } from '../lib/notificationsContext';
import { track } from '../lib/track';

const roleText = (w: Workspace) => (w.personal ? 'Kendi danışanların' : w.role === 'owner' ? `Sahip · ${w.members} uzman` : `Ekip üyesi · ${w.members} uzman`);

export function WorkspaceSheet({ visible, me, onClose }: { visible: boolean; me: ClinicianMe; onClose: () => void }) {
  const { switchTo } = useWorkspace();
  const [list, setList] = useState<Workspace[] | null>(null);
  const [newName, setNewName] = useState<string | null>(null);
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
  const createClinic = async () => {
    if (!newName?.trim()) return Alert.alert('Kliniğin adını yaz.');
    setBusy(true);
    try {
      const id = await createClinicWorkspace(newName);
      track('workspace.create', { kind: 'clinic' });
      setNewName(null);
      onClose();
      switchTo(id);
    } catch (e) { Alert.alert('Açılamadı', (e as Error).message); } finally { setBusy(false); }
  };
  const hasPersonal = !!list?.some((w) => w.personal);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose} transparent={false}>
      <SafeAreaView style={styles.safe}>
        <View style={[styles.head, styles.col]}>
          <Text style={styles.title}>Çalışma alanı</Text>
          <IconButton name="close" onPress={onClose} label="Kapat" />
        </View>
        <ScrollView contentContainerStyle={[{ padding: 16, gap: 10 }, styles.col]} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <Text style={styles.small}>Danışanlar, davetler, notlar ve seanslar seçili alana aittir. Alanlar birbirini görmez.</Text>
          {list === null && <ActivityIndicator color={colors.navy} />}
          {list?.map((w) => {
            const on = w.clinic_id === me.clinic_id;
            return (
              <Pressable key={w.clinic_id} onPress={() => go(w)} accessibilityRole="radio" accessibilityState={{ selected: on }}
                style={({ pressed }) => [styles.item, on && styles.itemOn, pressed && { opacity: 0.85 }]}>
                <Ionicons name={w.personal ? 'person-outline' : 'business-outline'} size={20} color={colors.navy} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemTitle} numberOfLines={1}>{w.personal ? 'Bireysel çalışmam' : w.name}</Text>
                  <Text style={styles.small}>{roleText(w)}{!w.access ? ' · üyelik etkin değil' : ''}</Text>
                </View>
                {on && <Ionicons name="checkmark-circle" size={20} color={colors.navy} />}
              </Pressable>
            );
          })}
          {list && !hasPersonal && (
            <Pressable onPress={openPersonal} disabled={busy} style={({ pressed }) => [styles.item, styles.dashed, pressed && { opacity: 0.85 }]}>
              <Ionicons name="add-circle-outline" size={20} color={colors.navy} />
              <View style={{ flex: 1 }}>
                <Text style={styles.itemTitle}>Bireysel çalışmamı aç</Text>
                <Text style={styles.small}>Kendi adına çalıştığın aileler için; kliniklerden ayrı.</Text>
              </View>
            </Pressable>
          )}
          {list && (newName === null ? (
            <Pressable onPress={() => setNewName('')} hitSlop={8} style={{ alignSelf: 'flex-start', marginTop: 6 }}>
              <Text style={styles.link}>+ Klinik aç</Text>
            </Pressable>
          ) : (
            <Card style={{ gap: 8 }}>
              <Text style={styles.itemTitle}>Yeni klinik</Text>
              <Input value={newName} onChangeText={setNewName} placeholder="Kliniğin adı" maxLength={120} />
              <Text style={styles.small}>Sahibi sen olursun; uzmanları kişisel kodlarıyla eklersin. Deneme süren diğer alanlarınla ortaktır.</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <SmallButton label="Aç" onPress={createClinic} busy={busy} />
                <SmallButton label="Vazgeç" onPress={() => setNewName(null)} />
              </View>
            </Card>
          ))}
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
          <Text style={styles.small}>Kabul edersen bu kliniğin danışanları ayrı bir çalışma alanında açılır; bireysel çalışman ayrı kalır.</Text>
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
  link: { fontSize: 14, fontWeight: '700', color: colors.navy },
  item: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, padding: 14 },
  itemOn: { borderColor: colors.navy, borderWidth: 1.5 },
  dashed: { borderStyle: 'dashed', backgroundColor: 'transparent' },
  itemTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  col: { width: '100%', maxWidth: 640, alignSelf: 'center' },
  primary: { backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 16, paddingVertical: 8, minWidth: 96, alignItems: 'center', justifyContent: 'center' },
  primaryText: { color: '#fff', fontSize: 13, fontWeight: '700' },
});
