import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { colors } from '../../theme';
import { Card, Label, Input, Cta, Empty, Segmented, SmallButton } from '../../components/ui';
import { Suggestion, SuggestionInput, Difficulty, listSuggestions, addSuggestion, withdrawSuggestion } from '../../lib/clinic';
import type { ClientCtx } from './ClientScreen';

const STATUS: Record<Suggestion['status'], { label: string; color: string }> = {
  pending: { label: 'Ebeveyn kararı bekleniyor', color: colors.medium.fg },
  accepted: { label: 'Ebeveyn görevlere ekledi', color: colors.ok },
  declined: { label: 'Ebeveyn eklemedi', color: colors.muted },
};

const EMPTY: SuggestionInput = { title: '', emoji: '⭐', skill: '', difficulty: 'easy', recurring: true, note: '' };

// Uzman yalnız önerir; görevi ekleyip eklememek ebeveynin kararıdır (ParentApp › Uzmanım).
export default function SuggestionsTab({ client, me }: ClientCtx) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [f, setF] = useState<SuggestionInput>(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    listSuggestions(client.link_id).then(setItems).catch((e) => Alert.alert('Öneriler yüklenemedi', (e as Error).message));
  }, [client.link_id]);
  useEffect(load, [load]);

  const send = async () => {
    if (!f.title.trim()) return Alert.alert('Görevin adını yaz.');
    setBusy(true);
    try {
      await addSuggestion(client, me.id, f);
      setF(EMPTY);
      load();
    } catch (e) {
      Alert.alert('Öneri gönderilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const withdraw = (s: Suggestion) =>
    withdrawSuggestion(s.id).then(load).catch((e) => Alert.alert('Geri çekilemedi', (e as Error).message));

  return (
    <View>
      <Label>Aileye görev öner</Label>
      <Card style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <View style={{ width: 72 }}>
            <Input value={f.emoji} onChangeText={(emoji) => setF({ ...f, emoji })} placeholder="⭐" maxLength={4} />
          </View>
          <View style={{ flex: 1 }}>
            <Input value={f.title} onChangeText={(title) => setF({ ...f, title })} placeholder="Görev (ör. Okul çantasını akşamdan hazırla)" maxLength={120} />
          </View>
        </View>
        <Input value={f.skill} onChangeText={(skill) => setF({ ...f, skill })} placeholder="Beceri alanı (ör. Planlama, Öz bakım) — isteğe bağlı" maxLength={40} />
        <Segmented<Difficulty>
          options={[{ id: 'easy', label: 'Kolay' }, { id: 'medium', label: 'Orta' }, { id: 'hard', label: 'Zor' }]}
          value={f.difficulty} onChange={(difficulty) => setF({ ...f, difficulty })}
        />
        <Segmented<'yes' | 'no'>
          options={[{ id: 'yes', label: 'Her gün' }, { id: 'no', label: 'Bir kez' }]}
          value={f.recurring ? 'yes' : 'no'} onChange={(v) => setF({ ...f, recurring: v === 'yes' })}
        />
        <Input value={f.note} onChangeText={(note) => setF({ ...f, note })} placeholder="Ebeveyne not (neden bu görev, nasıl desteklesin) — isteğe bağlı" multiline maxLength={300} />
        <Cta label="Öneriyi gönder" onPress={send} busy={busy} />
        <Text style={styles.small}>Ebeveyn öneriyi ParentApp'te görür; eklerse görev çocuğun listesine düşer. Coin ve ayrıntıları ebeveyn belirler.</Text>
      </Card>

      <Label>{`Gönderilen öneriler (${items?.length ?? 0})`}</Label>
      {!items ? <ActivityIndicator color={colors.navy} /> : items.length === 0 ? <Empty text="Henüz öneri gönderilmedi." /> : (
        <View style={{ gap: 8 }}>
          {items.map((s) => (
            <Card key={s.id} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 16 }}>{s.emoji}</Text>
                <Text style={[styles.body, { flex: 1, fontWeight: '600' }]}>{s.title}</Text>
                {s.status === 'pending' && <SmallButton label="Geri çek" onPress={() => withdraw(s)} />}
              </View>
              <Text style={[styles.small, { color: STATUS[s.status].color, fontWeight: '600' }]}>
                {STATUS[s.status].label}{s.task_title ? ` · görev: ${s.task_title}` : ''}
              </Text>
              <Text style={styles.small}>
                {new Date(s.created_at).toLocaleDateString('tr-TR')} · {s.recurring ? 'her gün' : 'bir kez'}{s.skill ? ` · ${s.skill}` : ''}
              </Text>
              {s.note ? <Text style={styles.small}>Not: {s.note}</Text> : null}
            </Card>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
});
