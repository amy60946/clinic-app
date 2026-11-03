import React from 'react';
import { View } from 'react-native';
import { Label } from '../../components/ui';
import PlanEditor from '../plan/PlanEditor';
import PlanHats from '../plan/PlanHats';
import { useHistory, HistoryHeader } from './History';
import type { ClientCtx } from './ClientScreen';

// Danışan › Takip planı: hedef hatları (hedef · aile programı · rutin ve görevler; ortak akislar.md 12.1) + önceki uzmandan
// devralınan plan (salt okunur, akislar.md 11). Örnek ailede aynı ekran, salt okunur (ilk kullanım "Ö1", 3 Kasım 2026).
export default function PlanTab({ client, me, today, data, reload }: ClientCtx) {
  if (data.sample && data.samplePlan) return <PlanHats client={client} me={me} data={data} today={today} preset={data.samplePlan} />;
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
