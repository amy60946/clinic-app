import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet, ActivityIndicator, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Label, Empty, Notice, DifficultyBadge } from '../../components/ui';
import {
  Suggestion, SuggestionInput, SuggestionSchemaMissing, listSuggestions, addSuggestions, updateSuggestion, withdrawSuggestion,
  listOwnRoutines, listTeam,
} from '../../lib/clinic';
import { formatTR } from '../../dates';
import SuggestionEditor, { repeatSummary } from './SuggestionEditor';
import type { ClientCtx } from './ClientScreen';
import { track } from '../../lib/track';
import { skillName } from '../../skills';
import { InheritedSuggestions } from './History';
import RoutineSheet, { RoutineGoal } from './RoutineSheet';
import RoutineEditor from './RoutineEditor';
import { Routine, OwnRoutine, routinesFor, childBand, ownToRoutine, agesText, fitsAge, AGE_LABEL } from '../../lib/routines';
import { loadPlan } from '../../lib/plan';
import { Segmented } from '../../components/ui';

const STATUS: Record<Suggestion['status'], { label: string; fg: string; bg: string; icon: keyof typeof Ionicons.glyphMap }> = {
  pending: { label: 'Ebeveyn kararı bekleniyor', fg: colors.medium.fg, bg: colors.medium.bg, icon: 'time-outline' },
  accepted: { label: 'Ebeveyn görevlere ekledi', fg: colors.easy.fg, bg: colors.easy.bg, icon: 'checkmark-circle' },
  declined: { label: 'Ebeveyn eklemedi', fg: colors.muted, bg: '#ECEEF3', icon: 'close-circle-outline' },
};

// Uzman yalnız önerir; görevi ekleyip eklememek ebeveynin kararıdır (ParentApp › Uzmanım › <uzman> › Görev önerileri).
// Bekleyen öneri güncellenebilir ya da geri çekilebilir; karar verilmiş öneri değişmez.
export default function SuggestionsTab({ client, me, data }: ClientCtx) {
  const [items, setItems] = useState<Suggestion[] | null>(null);
  const [editor, setEditor] = useState<{ open: boolean; editing: Suggestion | null }>({ open: false, editing: null });
  const [schemaMissing, setSchemaMissing] = useState(false);
  const [routine, setRoutine] = useState<Routine | null>(null);
  const [routineTab, setRoutineTab] = useState<'catalog' | 'own'>('catalog');
  const [own, setOwn] = useState<OwnRoutine[] | null>(null);       // null: sunucuda yok (Rutinlerim görünmez)
  const [ownEditor, setOwnEditor] = useState<{ open: boolean; editing: OwnRoutine | null }>({ open: false, editing: null });
  const [goals, setGoals] = useState<RoutineGoal[]>([]);
  const [teamSize, setTeamSize] = useState(1);
  const [allAges, setAllAges] = useState(false);
  const { width } = useWindowDimensions();
  // Rutinler çocuğun yaş grubuna göre (ortak hazir_rutinler.json sürüm 2); yaş bilinmiyorsa hepsi
  const band = childBand(data.child);
  const catalog = useMemo(() => routinesFor(allAges ? null : band), [band, allAges]);
  const ownRoutines = useMemo(() => (own ?? []).map(ownToRoutine), [own]);
  // çocukta zaten olan görevler ve bekleyen öneriler (rutinde baştan seçili gelmez)
  const taken = [...data.tasks.map((t) => t.title), ...(items ?? []).filter((s) => s.status === 'pending').map((s) => s.title)];

  const loadOwn = useCallback(() => { listOwnRoutines().then(setOwn).catch(() => setOwn(null)); }, []);
  useEffect(() => {
    loadOwn();
    listTeam().then((t) => setTeamSize(t.length)).catch(() => {});
    // hedefe bağlama için bu danışanın etkin hedefleri
    loadPlan({ kind: 'link', linkId: client.link_id, clinicId: client.clinic_id })
      .then((p) => setGoals(p.goals.filter((g) => !g.archived && g.status !== 'achieved').map((g) => ({ id: g.id, title: g.title }))))
      .catch(() => setGoals([]));
  }, [loadOwn, client.link_id, client.clinic_id]);

  const sendRoutine = async (list: SuggestionInput[]) => {
    let grouped = true;
    try {
      ({ grouped } = await addSuggestions(client, me.id, list));
    } catch (e) {
      if (e instanceof SuggestionSchemaMissing) setSchemaMissing(true);
      throw e;
    }
    track('suggestion.routine', { routine: list[0]?.routine?.key ?? '', n: list.length, grouped, goal: !!list[0]?.goal_id });
    setRoutine(null);
    load();
    Alert.alert('Rutin önerildi', grouped
      ? `${list.length} görev tek paket olarak ebeveynin onayına gönderildi.`
      : `${list.length} görev ebeveynin onayına gönderildi. (Paket ve hedef bağı için veritabanı güncellemesi bekleniyor; görevler ayrı öneri olarak gitti.)`);
  };

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
      <Label>Günlük rutin önerisi</Label>
      <Text style={[styles.sub, { marginTop: 0, marginBottom: 10 }]}>
        Bir rutini tek paket olarak öner; ebeveyn tek kartta görür, isterse görev çıkarıp ekler. Her görev ayrı onaylanır.
        {band ? ` ${client.child_name} için ${AGE_LABEL[band]} yaş rutinleri.` : ''}
      </Text>
      {own !== null && (
        <View style={{ marginBottom: 10 }}>
          <Segmented options={[{ id: 'catalog' as const, label: 'Hazır rutinler' }, { id: 'own' as const, label: `Rutinlerim (${ownRoutines.length})` }]}
            value={routineTab} onChange={setRoutineTab} />
        </View>
      )}
      <View style={styles.routines}>
        {(routineTab === 'own' && own !== null ? ownRoutines : catalog).map((r) => (
          <Pressable key={r.id} onPress={() => setRoutine(r)} accessibilityRole="button"
            style={({ pressed }) => [styles.routine, { width: width >= 720 ? '32%' : '48.5%', backgroundColor: r.tint }, pressed && { opacity: 0.85 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={styles.routineIcon}><Ionicons name={r.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.navy} /></View>
              {r.source === 'own' && (
                <Pressable onPress={() => setOwnEditor({ open: true, editing: own!.find((o) => o.id === r.id) ?? null })} hitSlop={8}
                  accessibilityLabel={`${r.title} rutinini düzenle`}>
                  <Ionicons name="create-outline" size={18} color={colors.navy} />
                </Pressable>
              )}
            </View>
            <Text style={styles.routineTitle}>{r.title}</Text>
            <Text style={styles.meta}>{r.subtitle} · {r.tasks.length} görev</Text>
            {(!band || allAges || r.source === 'own') && <Text style={[styles.meta, !fitsAge(r, band) && { color: colors.medium.fg }]}>{agesText(r.ages)}</Text>}
          </Pressable>
        ))}
        {routineTab === 'own' && own !== null && (
          <Pressable onPress={() => setOwnEditor({ open: true, editing: null })} accessibilityRole="button"
            style={({ pressed }) => [styles.routine, styles.newRoutine, { width: width >= 720 ? '32%' : '48.5%' }, pressed && { opacity: 0.85 }]}>
            <Ionicons name="add-circle-outline" size={26} color={colors.navy} />
            <Text style={styles.routineTitle}>Yeni rutin</Text>
            <Text style={styles.meta}>Kendi rutinini kur, bütün danışanlarında kullan</Text>
          </Pressable>
        )}
      </View>
      {routineTab === 'catalog' && !!band && (
        <Pressable onPress={() => setAllAges((v) => !v)} hitSlop={6} style={{ alignSelf: 'flex-start', marginTop: 8 }} accessibilityRole="button">
          <Text style={styles.link}>{allAges ? `Yalnız ${AGE_LABEL[band]} yaş rutinlerini göster` : 'Bütün yaş gruplarını göster'}</Text>
        </Pressable>
      )}
      {schemaMissing && (
        <Notice icon="construct-outline" text="Öneri ayrıntıları (tekrar günleri, hatırlatma, ödül…) için veritabanı güncellemesi bekleniyor. Güncelleme uygulanınca bu özellik açılır." />
      )}

      <Label>{`Gönderilen öneriler (${items?.length ?? 0})`}</Label>
      {!items ? <ActivityIndicator color={colors.navy} /> : items.length === 0 ? <Empty text="Henüz öneri gönderilmedi." /> : (
        <View style={{ gap: 10 }}>
          {groupSent(items).map((entry) => entry.kind === 'routine' ? (
            <RoutinePackage key={entry.group} items={entry.items} goals={goals} onEdit={(s) => setEditor({ open: true, editing: s })} />
          ) : (
            <SuggestionCard key={entry.item.id} s={entry.item} onEdit={() => setEditor({ open: true, editing: entry.item })} />
          ))}
        </View>
      )}
      <InheritedSuggestions linkId={client.link_id} />

      <RoutineSheet routine={routine} childName={client.child_name} band={band} taken={taken} goals={goals} onClose={() => setRoutine(null)} onSubmit={sendRoutine} />
      <RoutineEditor visible={ownEditor.open} me={me} editing={ownEditor.editing} teamSize={teamSize}
        onClose={() => setOwnEditor({ open: false, editing: null })}
        onSaved={() => { setOwnEditor({ open: false, editing: null }); setRoutineTab('own'); loadOwn(); }} />
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

// Paketsiz tek öneri kartı
function SuggestionCard({ s, onEdit }: { s: Suggestion; onEdit: () => void }) {
            const st = STATUS[s.status] ?? STATUS.pending;
            const pending = s.status === 'pending';
            return (
              <Pressable key={s.id} disabled={!pending} onPress={onEdit}
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
}

// Gönderilenler: aynı paketteki öneriler tek kartta (en yeni üstte); paketsiz öneriler tek tek
type SentEntry = { kind: 'routine'; group: string; items: Suggestion[] } | { kind: 'single'; item: Suggestion };
function groupSent(items: Suggestion[]): SentEntry[] {
  const out: SentEntry[] = [];
  const seen = new Map<string, Suggestion[]>();
  for (const s of items) {
    const g = s.routine?.group;
    if (!g) { out.push({ kind: 'single', item: s }); continue; }
    const list = seen.get(g);
    if (list) list.push(s);
    else { const l = [s]; seen.set(g, l); out.push({ kind: 'routine', group: g, items: l }); }
  }
  out.forEach((e) => { if (e.kind === 'routine') e.items.sort((a, b) => (a.routine?.position ?? 0) - (b.routine?.position ?? 0)); });
  return out;
}

function RoutinePackage({ items, goals, onEdit }: { items: Suggestion[]; goals: RoutineGoal[]; onEdit: (s: Suggestion) => void }) {
  const [open, setOpen] = useState(false);
  const r = items[0].routine!;
  const added = items.filter((s) => s.status === 'accepted').length;
  const waiting = items.filter((s) => s.status === 'pending').length;
  const goal = goals.find((g) => g.id === items[0].goal_id)?.title;
  return (
    <View style={styles.pkg}>
      <Pressable onPress={() => setOpen((v) => !v)} accessibilityRole="button" accessibilityState={{ expanded: open }} style={styles.pkgHead}>
        <View style={styles.routineIcon}><Ionicons name={r.icon as keyof typeof Ionicons.glyphMap} size={20} color={colors.navy} /></View>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.cardTitle}>{r.title} · {items.length} görev</Text>
          <Text style={styles.meta}>
            {[`${added} / ${items.length} eklendi`, waiting ? `${waiting} karar bekliyor` : '', goal ? `Hedef: ${goal}` : ''].filter(Boolean).join(' · ')}
          </Text>
          <View style={styles.pkgBar}><View style={[styles.pkgFill, { width: `${Math.round((added / items.length) * 100)}%` }]} /></View>
        </View>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </Pressable>
      {open && items.map((s) => {
        const st = STATUS[s.status] ?? STATUS.pending;
        return (
          <Pressable key={s.id} disabled={s.status !== 'pending'} onPress={() => onEdit(s)} style={styles.pkgRow}
            accessibilityHint={s.status === 'pending' ? 'Öneriyi düzenle' : undefined}>
            <Text style={styles.pkgTime}>{s.reminder ?? ''}</Text>
            <Text style={{ fontSize: 18 }}>{s.emoji}</Text>
            <Text style={[styles.meta, { flex: 1, color: colors.text, fontSize: 13 }]}>{s.title}</Text>
            <Ionicons name={st.icon} size={16} color={st.fg} accessibilityLabel={st.label} />
          </Pressable>
        );
      })}
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
  routines: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 10 },
  routine: { borderRadius: radius.md, padding: 14, gap: 4, minHeight: 112 },
  routineIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  newRoutine: { backgroundColor: '#fff', borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.faint, justifyContent: 'center' },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  pkg: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  pkgHead: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14 },
  pkgBar: { height: 6, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden', marginTop: 4 },
  pkgFill: { height: 6, backgroundColor: colors.ok },
  pkgRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  pkgTime: { width: 40, fontSize: 12, fontWeight: '700', color: colors.navy },
  routineTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
});
