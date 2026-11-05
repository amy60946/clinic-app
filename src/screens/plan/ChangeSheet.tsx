import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { IconButton, SmallButton } from '../../components/ui';
import { shiftTime, normalizeTime } from '../../lib/routines';

// Takip planında rutini ya da tek görevi düzenlemek (kullanıcı kararı 2 Kasım 2026; ortak akislar.md 12.1 adım 6–7).
// mode:
//  - 'draft'   : taslak (aileye gitmedi) → değişiklik hemen kaydedilir, "Aileye gönder" ile gider
//  - 'pending' : gönderildi, ebeveyn karar vermedi → öneri hemen güncellenir (ebeveyn yeni hâlini görür)
//  - 'change'  : ailede ekli → uzman doğrudan değiştirmez, DEĞİŞİKLİK ÖNERİR (taslak); ebeveyn "Uygula" derse görevler
//                güncellenir, yapılan adımlar ve inciler korunur, çıkarılan görev bitiş tarihi alır.
export type EditItem = { id: string; title: string; emoji: string; reminder: string | null };
export type EditResult = { id: string; reminder: string | null; remove: boolean };
export type EditMode = 'draft' | 'pending' | 'change';
export type EditTarget = {
  mode: EditMode; title: string; items: EditItem[];
  prefill?: Record<string, { reminder: string | null; remove: boolean }>;   // açık değişiklik önerisi (görev kimliğine göre)
};

export default function ChangeSheet({ target, onClose, onSubmit, onWithdraw }: {
  target: EditTarget | null; onClose: () => void; onSubmit: (list: EditResult[]) => Promise<void>; onWithdraw?: () => void;
}) {
  return (
    <Modal visible={!!target} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {target && <Body target={target} onClose={onClose} onSubmit={onSubmit} onWithdraw={onWithdraw} />}
    </Modal>
  );
}

type Row = { item: EditItem; time: string; remove: boolean };

const TEXT: Record<EditMode, { head: string; sub: string; note: string; cta: string }> = {
  draft: {
    head: 'Rutini düzenle', sub: 'Taslak · aileye gitmedi',
    note: 'Taslak: değişiklik hemen kaydedilir. Takip Planındaki "Aileye gönder" ile aileye gider.', cta: 'Kaydet',
  },
  pending: {
    head: 'Rutini düzenle', sub: 'Gönderildi · ebeveyn kararı bekleniyor',
    note: 'Ebeveyn henüz karar vermedi; değişiklik öneriye hemen yansır. Çıkardığın görev öneriden kalkar.', cta: 'Kaydet',
  },
  change: {
    head: 'Değişiklik öner', sub: 'Ailede ekli',
    note: 'Bu görevler ailede ekli. Değişikliğin öneri olarak gider; ebeveyn "Uygula" derse görevler güncellenir. Yapılan adımlar ve kazanılan inciler korunur; çıkardığın görev silinmez, o gün biter.',
    cta: 'Değişikliği plana ekle',
  },
};

function Body({ target, onClose, onSubmit, onWithdraw }: {
  target: EditTarget; onClose: () => void; onSubmit: (list: EditResult[]) => Promise<void>; onWithdraw?: () => void;
}) {
  const [rows, setRows] = useState<Row[]>(() => target.items.map((it) => {
    const p = target.prefill?.[it.id];
    return { item: it, time: (p ? p.reminder : it.reminder) ?? '', remove: p?.remove ?? false };
  }));
  const [busy, setBusy] = useState(false);
  const t = TEXT[target.mode];
  // değişiklik: kaydedilen önerideki hâlden (prefill) değil, görevin bugünkü hâlinden farkı
  const changed = useMemo(() => rows.filter((r) => r.remove || (r.time || null) !== (r.item.reminder ?? null)
    || (target.prefill?.[r.item.id] && target.mode === 'change')), [rows, target]);
  const set = (i: number, p: Partial<Row>) => setRows((x) => x.map((r, k) => (k === i ? { ...r, ...p } : r)));
  const shiftAll = (m: number) => setRows((x) => x.map((r) => (r.time ? { ...r, time: shiftTime(r.time, m) } : r)));

  const save = async () => {
    const bad = rows.find((r) => !r.remove && r.time.trim() && normalizeTime(r.time) === null);
    if (bad) return Alert.alert('Saat geçersiz', `${bad.item.title}: saati 07:30 biçiminde yaz.`);
    if (!changed.length) return Alert.alert('Değişiklik yok', 'Bir saati değiştir ya da bir görevi çıkar.');
    if (rows.every((r) => r.remove)) {
      if (target.mode !== 'change' && onWithdraw) return onWithdraw();
      return Alert.alert('En az bir görev kalmalı', 'Rutinin tamamını bırakmak için ebeveynle konuşun; ebeveyn görevleri ParentApp › Görevler\'den kaldırabilir.');
    }
    setBusy(true);
    try {
      await onSubmit(changed.map((r) => ({ id: r.item.id, reminder: r.time.trim() ? normalizeTime(r.time) : null, remove: r.remove })));
    } catch (e) {
      Alert.alert('Kaydedilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <View style={styles.column}>
        <View style={styles.header}>
          <IconButton name="close" label="Kapat" onPress={onClose} />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{t.head} · {target.title}</Text>
            <Text style={styles.small}>{t.sub} · {target.items.length} görev</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 60 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={styles.note}>
            <Ionicons name="information-circle-outline" size={18} color={colors.navy} />
            <Text style={[styles.body, { flex: 1 }]}>{t.note}</Text>
          </View>
          {target.items.length > 1 && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <Text style={styles.small}>Bütün saatleri kaydır:</Text>
              {[-30, -15, 15, 30].map((m) => <SmallButton key={m} label={`${m > 0 ? '+' : '−'}${Math.abs(m)} dk`} onPress={() => shiftAll(m)} />)}
            </View>
          )}
          <View style={styles.list}>
            {rows.map((r, i) => {
              const diff = !r.remove && (r.time || null) !== (r.item.reminder ?? null);
              return (
                <View key={r.item.id} style={[styles.row, i > 0 && styles.rowLine, r.remove && { opacity: 0.55 }]}>
                  <Text style={{ fontSize: 20 }}>{r.item.emoji}</Text>
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={[styles.body, r.remove && { textDecorationLine: 'line-through' }]}>{r.item.title}</Text>
                    {diff && <Text style={styles.small}>{r.item.reminder ?? '––:––'} → {r.time || 'saatsiz'}</Text>}
                    {r.remove && (
                      <Text style={[styles.small, { color: colors.danger }]}>
                        {target.mode === 'change' ? 'Çıkarılacak (ebeveyn uygularsa)' : 'Çıkarılacak'}
                      </Text>
                    )}
                  </View>
                  <TextInput value={r.time} onChangeText={(x) => set(i, { time: x })} maxLength={5} editable={!r.remove}
                    placeholder="07:30" keyboardType="numbers-and-punctuation" accessibilityLabel={`${r.item.title} saati`} style={styles.time} />
                  <Pressable onPress={() => set(i, { remove: !r.remove })} hitSlop={6} accessibilityRole="button"
                    accessibilityLabel={r.remove ? 'Çıkarmaktan vazgeç' : 'Görevi çıkar'} style={styles.remove}>
                    <Ionicons name={r.remove ? 'arrow-undo-outline' : 'remove-circle-outline'} size={20} color={r.remove ? colors.navy : colors.danger} />
                  </Pressable>
                </View>
              );
            })}
          </View>
          {target.mode === 'change' && (
            <Text style={styles.small}>Rutine yeni görev eklemek için davranış hedefi satırındaki "+ Rutin ya da görev bağla"yı kullan; o da öneri olarak gider.</Text>
          )}
          <Pressable onPress={save} disabled={busy} style={[styles.cta, busy && { opacity: 0.6 }]} accessibilityRole="button">
            {busy ? <ActivityIndicator color="#fff" />
              : <Text style={styles.ctaText}>{t.cta}{target.mode === 'change' && changed.length ? ` (${changed.length} görev)` : ''}</Text>}
          </Pressable>
          {target.mode === 'change' && <Text style={[styles.small, { textAlign: 'center' }]}>Takip Planındaki "Aileye gönder" ile aileye gider.</Text>}
          {target.mode !== 'change' && onWithdraw && (
            <Pressable onPress={onWithdraw} style={{ alignItems: 'center', padding: 12 }} accessibilityRole="button">
              <Text style={{ color: colors.danger, fontWeight: '600' }}>{target.mode === 'draft' ? 'Taslağı sil' : 'Öneriyi geri çek'}</Text>
            </Pressable>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 640, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  note: { flexDirection: 'row', gap: 8, backgroundColor: '#EEF3FC', borderRadius: radius.sm, padding: 12 },
  list: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  time: { width: 64, borderWidth: 1, borderColor: colors.line, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 6, fontSize: 14, color: colors.navy, textAlign: 'center' },
  remove: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  cta: { height: 50, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
