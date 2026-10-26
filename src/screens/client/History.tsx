import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';
import { Card, Label } from '../../components/ui';
import { InheritedRecord, loadInherited } from '../../lib/plan';
import { skillName } from '../../skills';

// Önceki uzman(lar)dan devralınan kayıtlar (ortak akislar.md 11): ebeveyn rızasıyla, salt okunur.
// Önceki uzman adsızdır: "Önceki uzman 1" + dönem; sunucu ad, unvan, klinik ve kimlik döndürmez.
export function useHistory(linkId: string) {
  const [records, setRecords] = useState<InheritedRecord[]>([]);
  useEffect(() => { loadInherited(linkId).then(setRecords); }, [linkId]);
  return records;
}

const month = (ym: string | null) => {
  if (!ym) return 'devam ediyor';
  const [y, m] = ym.split('-').map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });
};

export function HistoryHeader({ h }: { h: InheritedRecord }) {
  return (
    <View style={styles.head}>
      <Text style={styles.headTitle}>{h.label}</Text>
      <Text style={styles.small}>{month(h.from)} – {month(h.to)} · ebeveynin izniyle, yalnız okuma</Text>
    </View>
  );
}

export function InheritedNotes({ linkId }: { linkId: string }) {
  const records = useHistory(linkId);
  if (!records.length) return null;
  return (
    <View>
      <Label>Önceki uzmanın notları</Label>
      {records.map((h) => (
        <View key={h.key} style={{ gap: 8, marginBottom: 10 }}>
          <HistoryHeader h={h} />
          {h.notes.length === 0 && <Text style={styles.small}>Not yok.</Text>}
          {h.notes.map((n, i) => (
            <Card key={i} style={{ gap: 4, backgroundColor: '#FAFAFB' }}>
              <Text style={styles.small}>{new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}</Text>
              <Text style={styles.body}>{n.body}</Text>
            </Card>
          ))}
        </View>
      ))}
    </View>
  );
}

const STATUS: Record<string, string> = { pending: 'Bekliyor', accepted: 'Eklendi', declined: 'Eklenmedi' };

export function InheritedSuggestions({ linkId }: { linkId: string }) {
  const records = useHistory(linkId);
  if (!records.length) return null;
  return (
    <View>
      <Label>Önceki uzmanın önerileri</Label>
      {records.map((h) => (
        <View key={h.key} style={{ gap: 6, marginBottom: 10 }}>
          <HistoryHeader h={h} />
          {h.suggestions.length === 0 && <Text style={styles.small}>Öneri yok.</Text>}
          {h.suggestions.map((s, i) => (
            <Card key={i} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#FAFAFB' }}>
              <Text style={{ fontSize: 18 }}>{s.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.body}>{s.title}</Text>
                <Text style={styles.small}>{[skillName(s.skill), STATUS[s.status] ?? s.status].filter(Boolean).join(' · ')}</Text>
              </View>
            </Card>
          ))}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  head: { backgroundColor: '#EEF0F5', borderRadius: radius.sm, padding: 10, gap: 2 },
  headTitle: { fontSize: 13, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted },
});
