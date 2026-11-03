import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../theme';
import { Card, Label, Input, Cta, Empty, SmallButton } from '../../components/ui';
import { Note, listNotes, addNote, deleteNote, listGoals } from '../../lib/clinic';
import { PRIVATE } from '../plan/tones';
import type { ClientCtx } from './ClientScreen';
import { InheritedNotes } from './History';

// Uzman notları: yalnız klinik ekibi görür; aile görmez. Paylaşım biterse de klinikte kalır.
export default function NotesTab({ client, me, data }: ClientCtx) {
  if (data.sample) {
    return (
      <View>
        <Text style={[styles.small, { marginTop: 8 }]}>Notlarını aile görmez. Örnek ailede not eklenmez.</Text>
        <View style={{ gap: 8, marginTop: 12 }}>
          {(data.sampleNotes ?? []).map((n) => (
            <Card key={n.id} style={{ gap: 6 }}>
              <Text style={styles.small}>{new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })} · {n.author}</Text>
              <Text style={styles.body}>{n.body}</Text>
            </Card>
          ))}
        </View>
      </View>
    );
  }
  return <LiveNotes client={client} me={me} />;
}

function LiveNotes({ client, me }: Pick<ClientCtx, 'client' | 'me'>) {
  const [notes, setNotes] = useState<Note[] | null>(null);
  const [goalTitle, setGoalTitle] = useState<Record<string, string>>({});   // hedefe bağlı notun etiketi (N3)
  useEffect(() => {
    listGoals(client.link_id).then((gs) => setGoalTitle(Object.fromEntries(gs.map((g) => [g.id, g.title])))).catch(() => {});
  }, [client.link_id]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listNotes(client.link_id).then(setNotes).catch((e) => Alert.alert('Notlar yüklenemedi', (e as Error).message));
  }, [client.link_id]);
  useEffect(load, [load]);

  const save = async () => {
    if (!body.trim()) return;
    setBusy(true);
    try {
      await addNote(client, me.id, body);
      setBody('');
      load();
    } catch (e) {
      Alert.alert('Not kaydedilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = (n: Note) => Alert.alert('Not silinsin mi?', 'Bu işlem geri alınamaz.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'Sil', style: 'destructive', onPress: () => deleteNote(n.id).then(load).catch((e) => Alert.alert('Silinemedi', (e as Error).message)) },
  ]);

  return (
    <View>
      <Label>Yeni not</Label>
      <Card style={{ gap: 10 }}>
        <Input value={body} onChangeText={setBody} placeholder="Seans notu, gözlem, müdahale değişikliği (ör. ödül değişti)…" multiline maxLength={4000} />
        <Cta label="Notu kaydet" onPress={save} busy={busy} />
        <Text style={styles.small}>Notlarını aile görmez; yalnız kliniğindeki uzmanlar okur. Ebeveyn izin verirse notların, adın gizlenerek çocuğun sonraki uzmanına okunur olarak açılabilir. Nota kimlik bilgisi yazma.</Text>
      </Card>
      <Label>{`Notlar (${notes?.length ?? 0})`}</Label>
      {!notes ? <ActivityIndicator color={colors.navy} /> : notes.length === 0 ? <Empty text="Henüz not yok." /> : (
        <View style={{ gap: 8 }}>
          {notes.map((n) => (
            <Card key={n.id} style={{ gap: 6 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={[styles.small, { flex: 1 }]}>
                  {new Date(n.created_at).toLocaleString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {n.author ? ` · ${n.author}` : ''}
                </Text>
                {n.author_id === me.id && <SmallButton label="Sil" danger onPress={() => remove(n)} />}
              </View>
              {!!n.goal_id && (
                <Text style={styles.goalTag} numberOfLines={1}>Hedef: {goalTitle[n.goal_id] ?? 'silinmiş hedef'}</Text>
              )}
              <Text style={styles.body}>{n.body}</Text>
            </Card>
          ))}
        </View>
      )}
      <InheritedNotes linkId={client.link_id} />
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted },
  goalTag: { alignSelf: 'flex-start', fontSize: 11.5, fontWeight: '700', color: PRIVATE.fg, backgroundColor: PRIVATE.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2, overflow: 'hidden', maxWidth: '100%' },
});
