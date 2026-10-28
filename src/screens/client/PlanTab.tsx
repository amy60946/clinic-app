import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { Cta, Label } from '../../components/ui';
import PlanEditor from '../plan/PlanEditor';
import { publishPlan } from '../../lib/plan';
import { track } from '../../lib/track';
import { useHistory, HistoryHeader } from './History';
import type { ClientCtx } from './ClientScreen';

// Danışan › Plan: takip planı (hedefler + aile programı) + haftalık değerlendirme (GAS, aile görmez)
// + önceki uzmandan devralınan plan (salt okunur). ortak akislar.md 11–12.
export default function PlanTab({ client, today, data }: ClientCtx) {
  if (data.sample && data.samplePlan) {
    return (
      <View>
        <Text style={styles.intro}>Takip planı: çocuğun hedefleri, haftalık değerlendirmen (aile görmez) ve ailenin evde uyguladığı program. Örnek ailede salt okunur.</Text>
        <PlanEditor target={{ kind: 'link', linkId: client.link_id, clinicId: '' }} readOnly preset={data.samplePlan} today={today} />
      </View>
    );
  }
  return <LivePlan client={client} today={today} />;
}

function LivePlan({ client, today }: Pick<ClientCtx, 'client' | 'today'>) {
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const history = useHistory(client.link_id);

  const publish = async () => {
    setBusy(true);
    try {
      await publishPlan(client.link_id);
      track('plan.publish');
      setDirty(false);
      Alert.alert('Aileye gönderildi', 'Ebeveyn bildirim alır; plan ParentApp › Uzmanım › (senin adın) › Program bölümünde.');
    } catch (e) {
      Alert.alert('Gönderilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Text style={styles.intro}>
        Takip planı: çocuğun hedefleri ve ailenin evde uygulayacağı program. Aile "aile görür" işaretli hedefleri ve etkin modülleri, sen "Planı aileye gönder" dediğinde ParentApp'te görür; haftalık değerlendirmen yalnız klinikte kalır. Gözlem toplar, tanı koymaz.
      </Text>
      <PlanEditor target={{ kind: 'link', linkId: client.link_id, clinicId: client.clinic_id }} today={today} onChanged={() => setDirty(true)} />
      <View style={{ marginTop: 16 }}>
        <Cta label={dirty ? 'Değişiklikleri aileye gönder' : 'Planı aileye gönder'} onPress={publish} busy={busy} />
        <Text style={styles.small}>Aile değişiklikleri sen gönderene kadar görmez; hazır olunca buradan bir kez gönder.</Text>
      </View>
      {history.filter((h) => h.goals.length || h.modules.length).map((h) => (
        <View key={h.key}>
          <Label>Önceki uzmanın planı</Label>
          <HistoryHeader h={h} />
          <PlanEditor target={{ kind: 'link', linkId: h.key, clinicId: '' }} readOnly preset={h}
            today={h.goals.flatMap((g) => g.ratings.map((r) => r.week)).sort().pop() ?? today} />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 8 },
  small: { fontSize: 12, color: colors.muted, marginTop: 6 },
});
