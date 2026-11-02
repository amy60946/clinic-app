import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { Label } from '../../components/ui';
import PlanEditor from '../plan/PlanEditor';
import PlanHats from '../plan/PlanHats';
import { useHistory, HistoryHeader } from './History';
import type { ClientCtx } from './ClientScreen';

// Danışan › Takip planı: hedef hatları (hedef · aile programı · rutin ve görevler; ortak akislar.md 12.1) + önceki uzmandan
// devralınan plan (salt okunur, akislar.md 11). Örnek ailede eski salt okunur görünüm.
export default function PlanTab({ client, me, today, data, reload }: ClientCtx) {
  if (data.sample && data.samplePlan) {
    return (
      <View>
        <Text style={styles.intro}>Takip Planı: çocuğun hedefleri, haftalık değerlendirmen (aile görmez) ve ailenin evde uyguladığı program. Örnek ailede salt okunur.</Text>
        <PlanEditor target={{ kind: 'link', linkId: client.link_id, clinicId: '' }} readOnly preset={data.samplePlan} today={today} />
      </View>
    );
  }
  return (
    <View>
      <PlanHats client={client} me={me} data={data} today={today} reload={reload} />
      <Inherited linkId={client.link_id} today={today} />
    </View>
  );
}

function Inherited({ linkId, today }: { linkId: string; today: string }) {
  const history = useHistory(linkId);
  return (
    <>
      {history.filter((h) => h.goals.length || h.modules.length).map((h) => (
        <View key={h.key} style={{ marginTop: 18 }}>
          <Label>Önceki uzmanın planı</Label>
          <HistoryHeader h={h} />
          <PlanEditor target={{ kind: 'link', linkId: h.key, clinicId: '' }} readOnly preset={h}
            today={h.goals.flatMap((g) => g.ratings.map((r) => r.week)).sort().pop() ?? today} />
        </View>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 8 },
});
