import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, Share, Alert, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, radius } from '../theme';
import { Avatar, Card, Bar, Trend, Button, Field, IconButton, Pill } from '../components/ui';
import Sheet from '../components/Sheet';
import { useData, ageOf } from '../lib/data';
import { useWide } from '../lib/layout';
import { summarize } from '../lib/metrics';
import { createInvite, Client } from '../lib/api';
import { daysAgo, dateTR } from '../lib/format';
import ClientDetail from './ClientDetail';

export default function ClientsScreen({ navigation }: any) {
  const { clients, tasks, comps, ready, refresh } = useData();
  const wide = useWide();
  const [selected, setSelected] = useState<string | null>(null);
  const [invite, setInvite] = useState(false);
  const [q, setQ] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  const rows = useMemo(() => {
    const today = new Date();
    return clients
      .filter((c) => !q.trim() || `${c.name} ${c.label}`.toLocaleLowerCase('tr').includes(q.trim().toLocaleLowerCase('tr')))
      .map((c) => ({ c, s: summarize(c.childId, tasks, comps, today, 7), t: summarize(c.childId, tasks, comps, today, 28) }));
  }, [clients, tasks, comps, q]);

  const current = clients.find((c) => c.linkId === selected) ?? (wide ? clients[0] : undefined);
  const open = (c: Client) => (wide ? setSelected(c.linkId) : navigation.navigate('Client', { linkId: c.linkId }));

  const list = (
    <ScrollView
      contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await refresh(); setRefreshing(false); }} />}
    >
      <View style={styles.header}>
        <Text style={styles.title}>Danışanlar</Text>
        <Pressable onPress={() => setInvite(true)} style={styles.add} accessibilityLabel="Aile davet et">
          <Ionicons name="person-add-outline" size={16} color="#fff" />
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>Aile davet et</Text>
        </Pressable>
      </View>

      {clients.length > 3 && (
        <View style={styles.search}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput value={q} onChangeText={setQ} placeholder="Ara" placeholderTextColor={colors.faint} style={{ flex: 1, fontSize: 15, color: colors.navy }} />
        </View>
      )}

      {ready && clients.length === 0 && (
        <Card style={{ gap: 10, alignItems: 'flex-start' }}>
          <Text style={styles.h}>Henüz danışan yok</Text>
          <Text style={styles.body}>
            "Aile davet et" ile bir kod üret. Ebeveyn ParentApp'te Aile {'>'} Hesap {'>'} Uzmanım bölümüne kodu yazıp onay verince
            çocuğun görev ilerlemesi burada görünür.
          </Text>
          <Button title="Aile davet et" onPress={() => setInvite(true)} icon="person-add-outline" />
        </Card>
      )}

      {rows.map(({ c, s, t }) => {
        const age = ageOf(c.birthday);
        const active = wide && current?.linkId === c.linkId;
        return (
          <Pressable key={c.linkId} onPress={() => open(c)}>
            <Card style={[styles.row, active ? { borderColor: colors.navy } : {}]}>
              <Avatar id={c.avatar} size={44} />
              <View style={{ flex: 1, gap: 4 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={styles.h}>{c.name}</Text>
                  {age !== null && <Text style={styles.cap}>{age} yaş</Text>}
                </View>
                {!!c.label && <Text style={styles.cap} numberOfLines={1}>{c.label}</Text>}
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={{ flex: 1 }}><Bar pct={s.completion ?? 0} /></View>
                  <Text style={styles.pct}>{s.completion === null ? '–' : `%${s.completion}`}</Text>
                  <Trend delta={t.trend} />
                </View>
                <Text style={styles.cap}>Son 7 gün · {daysAgo(s.lastActivity ?? t.lastActivity)}</Text>
              </View>
              {!wide && <Ionicons name="chevron-forward" size={16} color={colors.faint} />}
            </Card>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      {wide ? (
        <View style={{ flex: 1, flexDirection: 'row' }}>
          <View style={{ width: 380, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: colors.line }}>{list}</View>
          <View style={{ flex: 1 }}>
            {current ? <ClientDetail key={current.linkId} linkId={current.linkId} onReport={() => navigation.navigate('Report', { linkId: current.linkId })} />
              : <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={styles.cap}>Bir danışan seç</Text></View>}
          </View>
        </View>
      ) : list}
      <InviteSheet visible={invite} onClose={() => { setInvite(false); refresh(); }} />
    </SafeAreaView>
  );
}

/* ---------- Aile daveti ---------- */

export function InviteSheet({ visible, onClose, kind = 'family' }: { visible: boolean; onClose: () => void; kind?: 'family' | 'clinician' }) {
  const [label, setLabel] = useState('');
  const [code, setCode] = useState<{ code: string; expiresAt: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const close = () => { setCode(null); setLabel(''); onClose(); };
  const family = kind === 'family';

  const make = async () => {
    setBusy(true);
    try { setCode(await createInvite(kind, label)); }
    catch (e) { Alert.alert('Kod üretilemedi', (e as Error).message); }
    finally { setBusy(false); }
  };

  const shareText = code && (family
    ? `Merhaba, çocuğunuzun görev ilerlemesini benimle paylaşmak için ParentApp'te Aile > Hesap > Uzmanım bölümüne bu kodu yazın: ${code.code}\nKod 7 gün geçerli. Paylaşımı istediğiniz zaman durdurabilirsiniz.`
    : `ClinicApp ekibimize katılmak için hesap oluştururken "Ekibe katıl" seçip bu kodu yaz: ${code.code}`);

  return (
    <Sheet visible={visible} title={family ? 'Aile davet et' : 'Ekibe uzman davet et'} onClose={close}>
      {!code ? (
        <View style={{ gap: 14 }}>
          <Text style={styles.body}>
            {family
              ? 'Tek kullanımlık bir kod üretilir. Ebeveyn kodu ParentApp\'e girip hangi çocuk için paylaşacağını seçer ve onay verir.'
              : 'Tek kullanımlık bir kod üretilir. Uzman ClinicApp\'te "Ekibe katıl" ile hesap açarken bu kodu yazar.'}
          </Text>
          {family && <Field label="Kendi notun (isteğe bağlı, aileye gösterilmez)" value={label} onChangeText={setLabel} placeholder="Ör. Salı 15:00 · dikkat" maxLength={60} />}
          <Button title="Kod üret" onPress={make} busy={busy} />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <View style={styles.codeBox}>
            <Text style={{ flex: 1, fontSize: 30, fontWeight: '800', letterSpacing: 7, color: colors.navy }}>{code.code}</Text>
            <IconButton name="copy-outline" label="Kopyala" onPress={async () => { await Clipboard.setStringAsync(code.code); Alert.alert('Kod kopyalandı'); }} />
            <IconButton name="share-outline" label="Paylaş" onPress={() => Share.share({ message: shareText! })} />
          </View>
          <Text style={styles.cap}>Tek kullanımlık · {dateTR(code.expiresAt)} tarihine kadar geçerli</Text>
          {family && (
            <View style={{ gap: 6 }}>
              <Pill text="Ebeveynin göreceği" />
              <Text style={styles.body}>Senin adın, unvanın ve klinik adı. Onay verirse görevler, tamamlanma saatleri, "yapamam" nedenleri ve kaydettiği zor anlar sana açılır. Posta ve coin bilgisi paylaşılmaz.</Text>
            </View>
          )}
          <Button title="Tamam" kind="ghost" onPress={close} />
        </View>
      )}
    </Sheet>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '800', color: colors.navy },
  add: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 9 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#ECEEF3', borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 9 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderColor: 'transparent' },
  h: { fontSize: 15, fontWeight: '700', color: colors.navy },
  cap: { fontSize: 12, color: colors.muted },
  body: { fontSize: 13, color: colors.navy, lineHeight: 19 },
  pct: { fontSize: 13, fontWeight: '700', color: colors.navy, minWidth: 36, textAlign: 'right' },
  codeBox: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3F4F8', borderRadius: radius.md, padding: 14 },
});
