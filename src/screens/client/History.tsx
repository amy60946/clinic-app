import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';
import { Card, Label } from '../../components/ui';
import { HistoryLink, loadHistory } from '../../lib/plan';
import { listNotes, listSuggestions, Note, Suggestion } from '../../lib/clinic';
import { skillName } from '../../skills';

// Önceki uzman(lar)dan devralınan kayıtlar (ortak akislar.md 11): ebeveyn rızasıyla, salt okunur, kimden geldiği yazılı.
export function useHistory(linkId: string) {
  const [links, setLinks] = useState<HistoryLink[]>([]);
  useEffect(() => { loadHistory(linkId).then(setLinks); }, [linkId]);
  return links;
}

const period = (h: HistoryLink) => {
  const f = (d: string | null) => (d ? new Date(d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }) : 'devam ediyor');
  return `${f(h.consent_at)} – ${f(h.revoked_at)}`;
};

export function HistoryHeader({ h }: { h: HistoryLink }) {
  return (
    <View style={styles.head}>
      <Text style={styles.headTitle}>Önceki uzman: {[h.clinician, h.title].filter(Boolean).join(' · ') || 'Adsız'} — {h.clinic}</Text>
      <Text style={styles.small}>{period(h)} · ebeveynin izniyle, yalnız okuma</Text>
    </View>
  );
}

export function InheritedNotes({ linkId }: { linkId: string }) {
  const links = useHistory(linkId);
  const [notes, setNotes] = useState<Record<string, Note[]>>({});
  useEffect(() => {
    links.forEach((h) => listNotes(h.from_link_id).then((n) => setNotes((s) => ({ ...s, [h.from_link_id]: n }))).catch(() => {}));
  }, [links]);
  if (!links.length) return null;
  return (
    <View>
      <Label>Önceki uzmanın notları</Label>
      {links.map((h) => (
        <View key={h.from_link_id} style={{ gap: 8, marginBottom: 10 }}>
          <HistoryHeader h={h} />
          {(notes[h.from_link_id] ?? []).length === 0 && <Text style={styles.small}>Not yok.</Text>}
          {(notes[h.from_link_id] ?? []).map((n) => (
            <Card key={n.id} style={{ gap: 4, backgroundColor: '#FAFAFB' }}>
              <Text style={styles.small}>{new Date(n.created_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })}{n.author ? ` · ${n.author}` : ''}</Text>
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
  const links = useHistory(linkId);
  const [items, setItems] = useState<Record<string, Suggestion[]>>({});
  useEffect(() => {
    links.forEach((h) => listSuggestions(h.from_link_id).then((n) => setItems((s) => ({ ...s, [h.from_link_id]: n }))).catch(() => {}));
  }, [links]);
  if (!links.length) return null;
  return (
    <View>
      <Label>Önceki uzmanın önerileri</Label>
      {links.map((h) => (
        <View key={h.from_link_id} style={{ gap: 6, marginBottom: 10 }}>
          <HistoryHeader h={h} />
          {(items[h.from_link_id] ?? []).length === 0 && <Text style={styles.small}>Öneri yok.</Text>}
          {(items[h.from_link_id] ?? []).map((s) => (
            <Card key={s.id} style={{ flexDirection: 'row', gap: 10, alignItems: 'center', backgroundColor: '#FAFAFB' }}>
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
