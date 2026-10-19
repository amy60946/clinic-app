import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, radius } from '../../theme';
import { Card, Label, Input, Cta, Empty, Segmented, SmallButton } from '../../components/ui';
import { GasLine } from '../../components/charts';
import { Goal, listGoals, addGoal, setGoalArchived, rateGoal } from '../../lib/clinic';
import { weekStarts, parseDate } from '../../lib/metrics';
import { MAX_WEEKS, type ClientCtx } from './ClientScreen';

// Hedefe ulaşma ölçeği (GAS): uzman ve aile 3–5 hedef koyar, haftalık -2 … +2. Aile puanları görmez.
export const GAS_LABELS: Record<number, string> = {
  [-2]: 'Beklenenden çok az',
  [-1]: 'Beklenenden az',
  0: 'Beklenen düzey',
  1: 'Beklenenden fazla',
  2: 'Beklenenden çok fazla',
};

export default function GoalsTab({ client, me, today }: ClientCtx) {
  const [goals, setGoals] = useState<Goal[] | null>(null);
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [busy, setBusy] = useState(false);
  const [which, setWhich] = useState<'this' | 'last'>('this');
  const [showArchived, setShowArchived] = useState(false);
  const weeks = weekStarts(today, MAX_WEEKS);
  const week = which === 'this' ? weeks[weeks.length - 1] : weeks[weeks.length - 2];

  const load = useCallback(() => {
    listGoals(client.link_id).then(setGoals).catch((e) => Alert.alert('Hedefler yüklenemedi', (e as Error).message));
  }, [client.link_id]);
  useEffect(load, [load]);

  const create = async () => {
    if (!title.trim()) return Alert.alert('Hedefin başlığını yaz.');
    setBusy(true);
    try {
      await addGoal(client, me.id, title, desc);
      setTitle('');
      setDesc('');
      load();
    } catch (e) {
      Alert.alert('Hedef eklenemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const rate = (g: Goal, r: number) =>
    rateGoal(client, me.id, g.id, week, r).then(load).catch((e) => Alert.alert('Puan kaydedilemedi', (e as Error).message));

  const archive = (g: Goal, v: boolean) =>
    setGoalArchived(g.id, v).then(load).catch((e) => Alert.alert('Değiştirilemedi', (e as Error).message));

  if (!goals) return <ActivityIndicator color={colors.navy} style={{ marginTop: 24 }} />;
  const active = goals.filter((g) => !g.archived);
  const archived = goals.filter((g) => g.archived);

  return (
    <View>
      <Text style={styles.intro}>
        Hedefe ulaşma ölçeği (GAS): aileyle birlikte 3–5 hedef belirle, her hafta -2 … +2 arasında işaretle. Puanlar ve hedefler yalnız klinikte görünür.
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12 }}>
        <Text style={styles.small}>Puanlanan hafta</Text>
        <View style={{ width: 240 }}>
          <Segmented options={[{ id: 'this', label: 'Bu hafta' }, { id: 'last', label: 'Geçen hafta' }]} value={which} onChange={setWhich} />
        </View>
        <Text style={styles.small}>{parseDate(week).toLocaleDateString('tr-TR')} pazartesi</Text>
      </View>

      <Label>{`Etkin hedefler (${active.length})`}</Label>
      {active.length === 0 && <Empty text="Henüz hedef yok. Aşağıdan ilk hedefi ekle." />}
      <View style={{ gap: 10 }}>
        {active.map((g) => {
          const ratings = Object.fromEntries(g.ratings.map((r) => [r.week, r.rating]));
          const cur = ratings[week];
          return (
            <Card key={g.id} style={{ gap: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.goalTitle}>{g.title}</Text>
                  {g.description ? <Text style={styles.small}>{g.description}</Text> : null}
                </View>
                <SmallButton label="Arşivle" onPress={() => archive(g, true)} />
              </View>
              <GasLine weeks={weeks} ratings={ratings} />
              <View style={styles.scale}>
                {[-2, -1, 0, 1, 2].map((r) => (
                  <Pressable key={r} onPress={() => rate(g, r)} accessibilityLabel={GAS_LABELS[r]}
                    style={[styles.scaleBtn, cur === r && styles.scaleOn]}>
                    <Text style={[styles.scaleNum, cur === r && { color: '#fff' }]}>{r > 0 ? `+${r}` : r}</Text>
                    <Text style={[styles.scaleLbl, cur === r && { color: '#fff' }]}>{GAS_LABELS[r]}</Text>
                  </Pressable>
                ))}
              </View>
            </Card>
          );
        })}
      </View>

      <Label>Yeni hedef</Label>
      <Card style={{ gap: 10 }}>
        <Input value={title} onChangeText={setTitle} placeholder="Hedef (ör. Sabah rutinini hatırlatmasız başlatır)" maxLength={120} />
        <Input value={desc} onChangeText={setDesc} placeholder="Düzeyler / açıklama — isteğe bağlı" maxLength={600} multiline />
        <Cta label="Hedef ekle" onPress={create} busy={busy} />
      </Card>

      {archived.length > 0 && (
        <View style={{ marginTop: 16 }}>
          <SmallButton label={showArchived ? 'Arşivi gizle' : `Arşiv (${archived.length})`} onPress={() => setShowArchived((v) => !v)} />
          {showArchived && (
            <View style={{ gap: 8, marginTop: 10 }}>
              {archived.map((g) => (
                <Card key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <Text style={[styles.small, { flex: 1 }]}>{g.title} · {g.ratings.length} puan</Text>
                  <SmallButton label="Geri al" onPress={() => archive(g, false)} />
                </Card>
              ))}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 8 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  goalTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  scale: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scaleBtn: {
    flexGrow: 1, flexBasis: 90, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4,
    borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff',
  },
  scaleOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  scaleNum: { fontSize: 15, fontWeight: '700', color: colors.navy },
  scaleLbl: { fontSize: 10, color: colors.muted, textAlign: 'center' },
});
