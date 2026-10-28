import React, { useEffect, useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { listSuggestions, Suggestion } from '../../lib/clinic';
import { taskSetRate } from '../../lib/metrics';
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
  return <LivePlan client={client} today={today} data={data} />;
}

function LivePlan({ client, today, data }: Pick<ClientCtx, 'client' | 'today' | 'data'>) {
  const [busy, setBusy] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const history = useHistory(client.link_id);
  useEffect(() => { listSuggestions(client.link_id).then(setSuggestions).catch(() => setSuggestions([])); }, [client.link_id]);

  // Hedefe bağlı rutinler: aynı hedefe bağlı öneri paketleri; oran kabul edilip göreve dönüşenlerin son 7 günü
  const goalExtra = (goalId: string) => {
    const linked = suggestions.filter((s) => s.goal_id === goalId);
    if (!linked.length) return null;
    const groups = [...new Map(linked.map((s) => [s.routine?.group ?? s.id, s])).values()];
    return (
      <View style={styles.linked}>
        {groups.map((g) => {
          const items = linked.filter((s) => (s.routine?.group ?? s.id) === (g.routine?.group ?? g.id));
          const ids = items.map((s) => s.task_id).filter((x): x is string => !!x);
          const r = taskSetRate(data.tasks, data.completions, ids, today);
          const added = items.filter((s) => s.status === 'accepted').length;
          return (
            <View key={g.routine?.group ?? g.id} style={{ gap: 4 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name={(g.routine?.icon ?? 'repeat-outline') as keyof typeof Ionicons.glyphMap} size={16} color={colors.navy} />
                <Text style={styles.linkedTitle}>Bağlı rutin: {g.routine?.title ?? g.title}</Text>
              </View>
              {r.planned > 0 ? (
                <>
                  <View style={styles.bar}><View style={[styles.fill, { width: `${r.rate ?? 0}%` }]} /></View>
                  <Text style={styles.small}>Son 7 gün %{r.rate} · {r.approved} / {r.planned} görev ebeveyn onaylı (ebeveyn kaydı, puan değil)</Text>
                </>
              ) : (
                <Text style={styles.small}>{added ? 'Henüz planlı gün yok.' : `Ebeveynin eklemesi bekleniyor (${items.length} görev).`}</Text>
              )}
            </View>
          );
        })}
      </View>
    );
  };

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
      <PlanEditor target={{ kind: 'link', linkId: client.link_id, clinicId: client.clinic_id }} today={today} onChanged={() => setDirty(true)}
        goalExtra={goalExtra} />
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
  linked: { backgroundColor: '#FFF8E1', borderRadius: 10, padding: 10, gap: 8 },
  linkedTitle: { fontSize: 13, fontWeight: '700', color: colors.navy },
  bar: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 6, backgroundColor: colors.ok },
});
