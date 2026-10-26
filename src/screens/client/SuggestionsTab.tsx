import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Label, Empty, Notice, DifficultyBadge } from '../../components/ui';
import {
  Suggestion, SuggestionInput, SuggestionSchemaMissing, listSuggestions, addSuggestions, updateSuggestion, withdrawSuggestion,
} from '../../lib/clinic';
import { formatTR } from '../../dates';
import SuggestionEditor, { repeatSummary } from './SuggestionEditor';
import type { ClientCtx } from './ClientScreen';
import { track } from '../../lib/track';
import { skillName } from '../../skills';
import { InheritedSuggestions } from './History';

const STATUS: Record<Suggestion['status'], { label: string; fg: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Ebeveyn kararı bekleniyor', fg: colors.medium.fg, bg: colors.medium.bg, icon: 'time-outline' },
  accepted: { label: 'Ebeveyn görevlere ekledi', fg: colors.easy.fg, bg: colors.easy.bg, icon: 'checkmark-circle' },
  declined: { label: 'Ebeveyn eklemedi', fg: colors.muted, bg: '#ECEEF3', icon: 'close-circle-outline' },
};

// Uzman yalnız önerir; görevi ekleyip eklememek ebeveynin kararıdır (ParentApp › Uzmanım).
// Bekleyen öneri güncellenebilir ya da geri çekilebilir; karar verilmiş öneri değişmez.
export default function SuggestionsTab({ client, me }: ClientCtx) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; editing: Suggestion | null }>({ open: false, editing: null });
  const [schemaMissing, setSchemaMissing] = useState(false);

  const load = useCallback(() => {
    listSuggestions(client.link_id).then(setItems).catch((e) => Alert.alert('Öneriler yüklenemedi', (e as Error).message));
  }, [client.link_id]);
  useEffect(load, [load]);

  const close = () => setEditor({ open: false, editing: null });

  const submit = async (list: SuggestionInput[]) => {
    try {
      if (editor.editing) {
        await updateSuggestion(editor.editing.id, list[0]);
        track('suggestion.update');
      } else {
        await addSuggestions(client, me.id, list);
        track('suggestion.send', { n: list.length });
      }
    } catch (e) {
      if (e instanceof SuggestionSchemaMissing) setSchemaMissing(true);
      throw e;
    }
    close();
    load();
  };

  const withdraw = (s: Suggestion) => Alert.alert('Öneri geri çekilsin mi?', 'Ebeveyn bu öneriyi artık görmez.', [
    { text: 'Vazgeç', style: 'cancel' },
    {
      text: 'Geri çek', style: 'destructive',
      onPress: () => withdrawSuggestion(s.id).then(() => { close(); load(); }).catch((e) => Alert.alert('Geri çekilemedi', (e as Error).message)),
    },
  ]);

  return (
    <View>
      <Pressable style={styles.cta} onPress={() => setEditor({ open: true, editing: null })}>
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={styles.ctaText}>Aileye görev öner</Text>
      </Pressable>
      <Text style={styles.sub}>
        Ebeveyn öneriyi ParentApp'te görür; eklerse görev buradaki ayarlarla çocuğun listesine düşer. Bekleyen bir öneriye dokunarak güncelleyebilirsin.
      </Text>
      {schemaMissing && (
        <Notice icon="construct-outline" text="Öneri ayrıntıları (tekrar günleri, hatırlatma, ödül…) için veritabanı güncellemesi bekleniyor. Güncelleme uygulanınca bu özellik açılır." />
      )}

      <Label>{`Gönderilen öneriler (${items?.length ?? 0})`}</Label>
      {!items ? <ActivityIndicator color={colors.navy} /> : items.length === 0 ? <Empty text="Henüz öneri gönderilmedi." /> : (
        <View style={{ gap: 10 }}>
          {items.map((s) => {
            const st = STATUS[s.status] ?? STATUS.pending;
            const pending = s.status === 'pending';
            return (
              <Pressable key={s.id} disabled={!pending} onPress={() => setEditor({ open: true, editing: s })}
                accessibilityHint={pending ? 'Öneriyi düzenle' : undefined} style={styles.card}>
                <Text style={{ fontSize: 22 }}>{s.emoji}</Text>
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={styles.cardTitle}>{s.title}</Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <DifficultyBadge d={s.difficulty} coins={s.coins} />
                    {!!skillName(s.skill) && <Text style={styles.meta}>{skillName(s.skill)}</Text>}
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                    <Meta icon={s.recurring ? 'repeat' : 'calendar-outline'}
                      text={s.recurring ? repeatSummary(s.repeat_kind, s.repeat_days) : s.start_date ? formatTR(s.start_date) : 'Tek seferlik'} />
                    {!!s.reminder && <Meta icon="alarm-outline" text={s.reminder} />}
                    {!s.requires_review && <Meta icon="flash-outline" text="Otomatik onay" />}
                  </View>
                  {!!s.description && <Text style={styles.meta} numberOfLines={2}>{s.description}</Text>}
                  {!!s.note && <Text style={styles.meta} numberOfLines={2}>Not: {s.note}</Text>}
                  <View style={[styles.pill, { backgroundColor: st.bg }]}>
                    <Ionicons name={st.icon} size={13} color={st.fg} />
                    <Text style={{ fontSize: 12, fontWeight: '600', color: st.fg }}>
                      {st.label}{s.task_title ? ` · görev: ${s.task_title}` : ''}
                    </Text>
                  </View>
                  <Text style={styles.date}>
                    {new Date(s.created_at).toLocaleDateString('tr-TR')}
                    {s.updated_at ? ` · güncellendi ${new Date(s.updated_at).toLocaleDateString('tr-TR')}` : ''}
                  </Text>
                </View>
                {pending && <Ionicons name="create-outline" size={20} color={colors.navy} />}
              </Pressable>
            );
          })}
        </View>
      )}
      <InheritedSuggestions linkId={client.link_id} />

      <SuggestionEditor
        visible={editor.open}
        childName={client.child_name}
        editing={editor.editing}
        onClose={close}
        onSubmit={submit}
        onWithdraw={editor.editing ? () => withdraw(editor.editing!) : undefined}
      />
    </View>
  );
}

function Meta({ icon, text }: { icon: keyof typeof Ionicons.glyphMap; text: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
      <Ionicons name={icon} size={13} color={colors.muted} />
      <Text style={styles.meta}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  cta: { flexDirection: 'row', gap: 6, height: 52, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  sub: { fontSize: 12, color: colors.muted, lineHeight: 17, marginTop: 8 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, padding: 14 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: colors.navy },
  meta: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, marginTop: 2 },
  date: { fontSize: 11, color: colors.faint },
});
