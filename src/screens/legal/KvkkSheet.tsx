import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Card, Label, Input, Cta, IconButton, Notice, InlineLink } from '../../components/ui';
import {
  KvkkKind, KvkkRequest, KVKK_KINDS, KVKK_NEEDS_DETAIL, KVKK_STATUS, kvkkNo, myKvkkRequests, createKvkkRequest, openLegal,
} from '../../lib/legal';

const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const kindLabel = (k: string) => KVKK_KINDS.find((x) => x.kind === k)?.label ?? 'Başvuru';

// Ayarlar › KVKK başvurusu (hukuk/50-uygulama-ici-metinler.md 4): kvkk_request_create('clinic', tür, açıklama),
// "Başvurularım" my_kvkk_requests(). Başvuru hesaba bağlıdır; yanıt e-postayla gider (bildirim kvkk_answered).
export default function KvkkSheet({ visible, email, onClose }: { visible: boolean; email: string; onClose: () => void }) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {visible && <Body email={email} onClose={onClose} />}
    </Modal>
  );
}

function Body({ email, onClose }: { email: string; onClose: () => void }) {
  const [list, setList] = useState<KvkkRequest[] | null | undefined>(undefined);
  const [kind, setKind] = useState<KvkkKind | null>(null);
  const [detail, setDetail] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ id: string; due_at: string } | null>(null);

  const load = useCallback(() => { myKvkkRequests().then(setList).catch(() => setList([])); }, []);
  useEffect(load, [load]);

  const submit = async () => {
    if (!kind) return Alert.alert('Ne istediğini seç.');
    if (KVKK_NEEDS_DETAIL.includes(kind) && detail.trim().length < 5) return Alert.alert('Talebini kısaca yaz.');
    setBusy(true);
    try {
      setDone(await createKvkkRequest(kind, detail.trim()));
      setKind(null);
      setDetail('');
      load();
    } catch (e) {
      Alert.alert('Başvuru gönderilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const hint = kind ? KVKK_KINDS.find((x) => x.kind === kind)?.hint : undefined;
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <IconButton name="close" onPress={onClose} label="Kapat" />
          <Text style={styles.title}>KVKK başvurusu</Text>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60, gap: 4 }} keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive" automaticallyAdjustKeyboardInsets>
          {list === undefined ? <ActivityIndicator color={colors.navy} style={{ marginTop: 24 }} />
            : list === null ? <Notice icon="time-outline" text="Başvuru formu henüz açık değil." />
            : (
              <>
                <Text style={styles.body}>
                  Kişisel verilerinle ilgili taleplerini buradan iletebilirsin. En geç 30 gün içinde, ücretsiz yanıt veririz. Yanıt {email} adresine gelir.{' '}
                  <InlineLink onPress={() => openLegal('kvkk-basvuru')}>Başvuru usulü</InlineLink>
                </Text>

                {done && (
                  <Card style={{ ...styles.status, backgroundColor: '#E6F4EA' }}>
                    <Ionicons name="checkmark-circle" size={22} color={colors.ok} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text style={styles.statusTitle}>Başvurun alındı.</Text>
                      <Text style={styles.small}>Başvuru no: {kvkkNo(done.id)}</Text>
                      <Text style={styles.small}>
                        En geç {dateText(done.due_at)} tarihine kadar {email} adresine yanıt vereceğiz. Durumunu "Başvurularım"dan izleyebilirsin.
                      </Text>
                    </View>
                  </Card>
                )}

                <Label>Ne istiyorsun?</Label>
                <View style={{ gap: 8 }}>
                  {KVKK_KINDS.map((x) => (
                    <Pressable key={x.kind} onPress={() => setKind(x.kind)} accessibilityRole="radio" accessibilityState={{ selected: kind === x.kind }}
                      style={[styles.option, kind === x.kind && styles.optionOn]}>
                      <Ionicons name={kind === x.kind ? 'radio-button-on' : 'radio-button-off'} size={20} color={kind === x.kind ? colors.navy : colors.faint} />
                      <Text style={[styles.optionText, { flex: 1 }]}>{x.label}</Text>
                    </Pressable>
                  ))}
                </View>
                {!!hint && <Text style={[styles.small, { marginTop: 8 }]}>{hint}</Text>}

                <Label>{kind && KVKK_NEEDS_DETAIL.includes(kind) ? 'Açıklama' : 'Açıklama (isteğe bağlı)'}</Label>
                <Input value={detail} onChangeText={setDetail} multiline maxLength={2000}
                  placeholder="Talebini kısaca yaz. Gerekmedikçe sağlık bilgisi ya da başka birinin kişisel bilgisini yazma." />
                <Text style={[styles.small, { marginTop: 8 }]}>
                  Başvurun hesabına bağlıdır; kimliğini ayrıca kanıtlaman gerekmez. Bazı taleplerde e-posta adresine bir doğrulama bağlantısı gönderebiliriz.
                </Text>
                <View style={{ marginTop: 12 }}><Cta label="Başvuruyu gönder" onPress={submit} busy={busy} disabled={!kind} /></View>

                {list.length > 0 && (
                  <>
                    <Label>Başvurularım</Label>
                    <View style={styles.list}>
                      {list.map((r, i) => (
                        <View key={r.id} style={[styles.row, i > 0 && styles.rowLine]}>
                          <Text style={styles.optionText}>{kindLabel(r.kind)}</Text>
                          <Text style={styles.small}>
                            No {kvkkNo(r.id)} · {dateText(r.received_at)} · {KVKK_STATUS[r.status] ?? r.status}
                            {r.status === 'received' || r.status === 'in_progress' ? ` · son gün ${dateText(r.due_at)}` : ''}
                          </Text>
                        </View>
                      ))}
                    </View>
                  </>
                )}
              </>
            )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.text, lineHeight: 20, marginBottom: 8 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  status: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 8 },
  statusTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  option: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 11 },
  optionOn: { borderColor: colors.navy, borderWidth: 1.5 },
  optionText: { fontSize: 14, fontWeight: '600', color: colors.text },
  list: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  row: { gap: 2, paddingHorizontal: 16, paddingVertical: 12 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
});
