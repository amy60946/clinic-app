import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Switch, Alert, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Card, Label, Input, Cta, Empty, SmallButton, IconButton, Notice } from '../../components/ui';
import { GasLine } from '../../components/charts';
import { weekStarts } from '../../lib/metrics';
import { track } from '../../lib/track';
import {
  PlanTarget, PlanGoal, PlanModule, ModuleLog, GoalInput, ModuleInput, Measure, GoalStatus, ModuleStatus, PackageT,
  DOMAINS, GOAL_TEMPLATES, MODULE_TEMPLATES, PACKAGES, MEASURES, TARGET_HINTS, BARRIERS,
  loadPlan, loadLogs, addGoals, updateGoal, deleteGoal, addModules, updateModule, deleteModule, rateGoal, applyPackage,
  goalFromTemplate, moduleFromTemplate, domainLabel, logSummary, lastLogDay, PlanSchemaMissing,
} from '../../lib/plan';

// Takip planı düzenleyicisi (ortak/sozlesme/akislar.md 12): hedefler + aile programı. Bir paylaşımda (danışan › Plan)
// ya da aile davetinde taslak olarak çalışır. Şablonlar ortak/veri/takip_sablonlari.json; uzman her alanı düzenler.
// Haftalık GAS puanı ve ebeveyn kaydı özeti yalnız paylaşımda (taslakta aile yok).

export const GAS_LABELS: Record<number, string> = {
  [-2]: 'Beklenenden çok az', [-1]: 'Beklenenden az', 0: 'Beklenen düzey', 1: 'Beklenenden fazla', 2: 'Beklenenden çok fazla',
};
const GOAL_STATUS: { id: GoalStatus; label: string }[] = [
  { id: 'active', label: 'Sürüyor' }, { id: 'achieved', label: 'Ulaşıldı' }, { id: 'paused', label: 'Ara verildi' },
];
const MODULE_STATUS: { id: ModuleStatus; label: string }[] = [
  { id: 'planned', label: 'Planlandı' }, { id: 'active', label: 'Etkin' }, { id: 'done', label: 'Tamamlandı' },
];

// preset: hazır veriyle salt okunur gösterim (önceki uzmandan devralınan plan; sunucudan ayrıca yüklenmez)
export default function PlanEditor({ target, today, onChanged, readOnly = false, preset }: {
  target: PlanTarget; today?: string; onChanged?: () => void; readOnly?: boolean;
  preset?: { goals: PlanGoal[]; modules: PlanModule[]; logs: ModuleLog[] };
}) {
  const [plan, setPlan] = useState<{ goals: PlanGoal[]; modules: PlanModule[]; legacy: boolean } | null>(null);
  const [logs, setLogs] = useState<ModuleLog[]>([]);
  const [error, setError] = useState('');
  const [goalSheet, setGoalSheet] = useState<{ open: boolean; editing?: PlanGoal }>({ open: false });
  const [moduleSheet, setModuleSheet] = useState<{ open: boolean; editing?: PlanModule }>({ open: false });
  const [pkgOpen, setPkgOpen] = useState(false);
  const [which, setWhich] = useState<'this' | 'last'>('this');
  const [showArchived, setShowArchived] = useState(false);
  const isLink = target.kind === 'link';
  const key = target.kind === 'link' ? target.linkId : target.code;

  const load = useCallback(async () => {
    if (preset) {
      setPlan({ goals: preset.goals, modules: preset.modules, legacy: false });
      setLogs(preset.logs);
      return;
    }
    try {
      const p = await loadPlan(target);
      setPlan(p);
      if (target.kind === 'link') setLogs(await loadLogs(p.modules.map((m) => m.id)));
    } catch (e) {
      setError(e instanceof PlanSchemaMissing ? e.message : (e as Error).message);
    }
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { load(); }, [load]);

  const changed = () => { load(); onChanged?.(); };
  const act = (p: Promise<unknown>, what = 'Kaydedilemedi') => p.then(changed).catch((e) => Alert.alert(what, (e as Error).message));

  if (error) return <Notice icon="construct-outline" text={error} />;
  if (!plan) return <ActivityIndicator color={colors.navy} style={{ marginTop: 24 }} />;

  const weeks = today ? weekStarts(today, 8) : [];
  const week = which === 'this' ? weeks[weeks.length - 1] : weeks[weeks.length - 2];
  const goals = plan.goals.filter((g) => !g.archived);
  const archived = plan.goals.filter((g) => g.archived);
  const empty = goals.length === 0 && plan.modules.length === 0;

  return (
    <View>
      {plan.legacy && isLink && (
        <Notice icon="construct-outline" text="Aile programı ve ayrıntılı hedef alanları için veritabanı güncellemesi bekleniyor. Şimdilik yalnız hedef ve haftalık puan." />
      )}
      {!readOnly && !plan.legacy && (
        <Pressable style={styles.pkg} onPress={() => setPkgOpen(true)} accessibilityRole="button">
          <Ionicons name="albums-outline" size={20} color={colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={styles.pkgTitle}>{empty ? 'Hazır paketle başla' : 'Paketten ekle'}</Text>
            <Text style={styles.small}>Ör. uyku, rutin, duygu düzenleme. Hedef ve modüller gelir; hepsini düzenleyebilirsin.</Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.faint} />
        </Pressable>
      )}

      <Label>{`Çocuğun hedefleri (${goals.length})`}</Label>
      {isLink && !readOnly && goals.some((g) => g.ratings) && weeks.length > 1 && (
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          {(['this', 'last'] as const).map((w) => (
            <Pressable key={w} onPress={() => setWhich(w)} style={[styles.chip, which === w && styles.chipOn]}>
              <Text style={[styles.chipText, which === w && { color: '#fff' }]}>{w === 'this' ? 'Bu hafta' : 'Geçen hafta'}</Text>
            </Pressable>
          ))}
          <Text style={[styles.small, { alignSelf: 'center' }]}>haftalık değerlendirme (aile görmez)</Text>
        </View>
      )}
      {goals.length === 0 && <Empty text="Henüz hedef yok." />}
      <View style={{ gap: 10 }}>
        {goals.map((g) => (
          <GoalCard key={g.id} g={g} isLink={isLink} readOnly={readOnly} week={week} weeks={weeks} legacy={plan.legacy}
            onEdit={() => setGoalSheet({ open: true, editing: g })}
            onToggleShared={(v) => act(updateGoal(g.id, { shared: v }))}
            onStatus={(s) => act(updateGoal(g.id, { status: s }))}
            onArchive={() => act(updateGoal(g.id, { archived: true }))}
            onDelete={() => Alert.alert('Hedef silinsin mi?', '', [
              { text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => act(deleteGoal(g.id), 'Silinemedi') }])}
            onRate={(r) => target.kind === 'link' && act(rateGoal(target.clinicId, g.id, week, r), 'Puan kaydedilemedi')} />
        ))}
      </View>
      {!readOnly && <View style={{ marginTop: 10, alignItems: 'flex-start' }}><SmallButton label="+ Hedef ekle" onPress={() => setGoalSheet({ open: true })} /></View>}
      {archived.length > 0 && (
        <View style={{ marginTop: 12 }}>
          <SmallButton label={showArchived ? 'Arşivi gizle' : `Arşiv (${archived.length})`} onPress={() => setShowArchived((v) => !v)} />
          {showArchived && archived.map((g) => (
            <Card key={g.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <Text style={[styles.small, { flex: 1 }]}>{g.title} · {g.ratings.length} değerlendirme</Text>
              {!readOnly && <SmallButton label="Geri al" onPress={() => act(updateGoal(g.id, { archived: false }))} />}
            </Card>
          ))}
        </View>
      )}

      {!plan.legacy && (
        <>
          <Label>{`Aile programı (${plan.modules.length})`}</Label>
          <Text style={[styles.small, { marginBottom: 8 }]}>Aile yalnız "Etkin" ve "Tamamlandı" modülleri görür; her gün tek dokunuşla "uyguladım" işaretler.</Text>
          {plan.modules.length === 0 && <Empty text="Henüz modül yok." />}
          <View style={{ gap: 10 }}>
            {plan.modules.map((m) => (
              <ModuleCard key={m.id} m={m} isLink={isLink} readOnly={readOnly} logs={logs}
                onEdit={() => setModuleSheet({ open: true, editing: m })}
                onStatus={(s) => act(updateModule(m.id, { status: s }))}
                onDelete={() => Alert.alert('Modül silinsin mi?', 'Ailenin bu modüldeki uygulama kayıtları da silinir.', [
                  { text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => act(deleteModule(m.id), 'Silinemedi') }])} />
            ))}
          </View>
          {!readOnly && <View style={{ marginTop: 10, alignItems: 'flex-start' }}><SmallButton label="+ Modül ekle" onPress={() => setModuleSheet({ open: true })} /></View>}
        </>
      )}

      {goalSheet.open && (
        <GoalSheet editing={goalSheet.editing} legacy={plan.legacy} onClose={() => setGoalSheet({ open: false })}
          onSave={async (input) => {
            if (goalSheet.editing) await updateGoal(goalSheet.editing.id, plan.legacy ? { title: input.title, description: input.description } : input);
            else if (plan.legacy) await addGoals(target, [{ title: input.title, description: input.description } as GoalInput]);
            else await addGoals(target, [{ ...input, position: plan.goals.length }]);
            track('plan.goal', { edit: !!goalSheet.editing });
            setGoalSheet({ open: false });
            changed();
          }} />
      )}
      {moduleSheet.open && (
        <ModuleSheet editing={moduleSheet.editing} onClose={() => setModuleSheet({ open: false })}
          onSave={async (input) => {
            if (moduleSheet.editing) await updateModule(moduleSheet.editing.id, input);
            else await addModules(target, [{ ...input, position: plan.modules.length }]);
            track('plan.module', { edit: !!moduleSheet.editing });
            setModuleSheet({ open: false });
            changed();
          }} />
      )}
      {pkgOpen && (
        <PackageSheet onClose={() => setPkgOpen(false)}
          onApply={async (p, goalKeys) => {
            await applyPackage(target, p, plan, goalKeys);
            track('plan.package', { key: p.key });
            setPkgOpen(false);
            changed();
          }} />
      )}
    </View>
  );
}

/* ---------- Kartlar ---------- */

function GoalCard({ g, isLink, readOnly, week, weeks, legacy, onEdit, onToggleShared, onStatus, onArchive, onDelete, onRate }: {
  g: PlanGoal; isLink: boolean; readOnly: boolean; week: string; weeks: string[]; legacy: boolean;
  onEdit: () => void; onToggleShared: (v: boolean) => void; onStatus: (s: GoalStatus) => void; onArchive: () => void; onDelete: () => void;
  onRate: (r: number) => void;
}) {
  const ratings = Object.fromEntries(g.ratings.map((r) => [r.week, r.rating]));
  const cur = ratings[week];
  const meta = [g.domain && domainLabel(g.domain), g.measure !== 'level' && g.target ? `Hedef: ${g.target}` : '',
    g.baseline ? `Başlangıç: ${g.baseline}` : '', g.weeks ? `${g.weeks} hafta` : ''].filter(Boolean).join(' · ');
  return (
    <Card style={{ gap: 10 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.title}>{g.title}</Text>
          {!!meta && <Text style={styles.small}>{meta}</Text>}
          {!!g.home_support && <Text style={styles.body}>Evde: {g.home_support}</Text>}
          {!!g.description && <Text style={styles.small}>{g.description}</Text>}
        </View>
        {!readOnly && <IconButton name="create-outline" label="Hedefi düzenle" onPress={onEdit} />}
      </View>
      {!legacy && (
        <View style={styles.rowWrap}>
          {!readOnly && (
            <View style={styles.inline}>
              <Switch value={g.shared} onValueChange={onToggleShared} trackColor={{ true: colors.navy }}
                accessibilityLabel="Aile bu hedefi görür" />
              <Text style={styles.small}>{g.shared ? 'Aile görür' : 'Yalnız klinik'}</Text>
            </View>
          )}
          <View style={styles.seg}>
            {GOAL_STATUS.map((s) => (
              <Pressable key={s.id} disabled={readOnly} onPress={() => onStatus(s.id)} style={[styles.segItem, g.status === s.id && styles.segOn]}>
                <Text style={[styles.segText, g.status === s.id && { color: colors.navy, fontWeight: '700' }]}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}
      {isLink && weeks.length > 0 && (
        <>
          <GasLine weeks={weeks} ratings={ratings} />
          {!readOnly && (
            <View style={styles.scale}>
              {[-2, -1, 0, 1, 2].map((r) => (
                <Pressable key={r} onPress={() => onRate(r)} accessibilityLabel={GAS_LABELS[r]} style={[styles.scaleBtn, cur === r && styles.scaleOn]}>
                  <Text style={[styles.scaleNum, cur === r && { color: '#fff' }]}>{r > 0 ? `+${r}` : r}</Text>
                  <Text style={[styles.scaleLbl, cur === r && { color: '#fff' }]}>{GAS_LABELS[r]}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </>
      )}
      {!readOnly && (
        <View style={{ flexDirection: 'row', gap: 8 }}>
          {isLink ? <SmallButton label="Arşivle" onPress={onArchive} /> : <SmallButton label="Sil" danger onPress={onDelete} />}
        </View>
      )}
    </Card>
  );
}

function ModuleCard({ m, isLink, readOnly, logs, onEdit, onStatus, onDelete }: {
  m: PlanModule; isLink: boolean; readOnly: boolean; logs: ModuleLog[];
  onEdit: () => void; onStatus: (s: ModuleStatus) => void; onDelete: () => void;
}) {
  // devralınan plan (salt okunur): pencere önceki dönemin son kaydında biter, bugünden sayılmaz
  const end = readOnly ? lastLogDay(logs, m.id) : undefined;
  const s = isLink && (!readOnly || end) ? logSummary(logs, m.id, 14, end) : null;
  const ease = s ? [s.ease.easy && `kolay ${s.ease.easy}`, s.ease.medium && `orta ${s.ease.medium}`, s.ease.hard && `zorlandı ${s.ease.hard}`].filter(Boolean).join(' · ') : '';
  const barriers = s ? Object.entries(s.barriers).map(([k, n]) => `${BARRIERS[k] ?? k} (${n})`).join(', ') : '';
  return (
    <Card style={{ gap: 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={styles.title}>{m.title}</Text>
          {!!m.aim && <Text style={styles.body}>{m.aim}</Text>}
          {!!m.practice && <Text style={styles.small}>Evde: {m.practice}</Text>}
        </View>
        {!readOnly && <IconButton name="create-outline" label="Modülü düzenle" onPress={onEdit} />}
      </View>
      {m.checklist.length > 0 && (
        <View style={{ gap: 2 }}>
          {m.checklist.map((c, i) => <Text key={i} style={styles.small}>☐ {c}</Text>)}
        </View>
      )}
      <View style={styles.seg}>
        {MODULE_STATUS.map((x) => (
          <Pressable key={x.id} disabled={readOnly} onPress={() => onStatus(x.id)} style={[styles.segItem, m.status === x.id && styles.segOn]}>
            <Text style={[styles.segText, m.status === x.id && { color: colors.navy, fontWeight: '700' }]}>{x.label}</Text>
          </Pressable>
        ))}
      </View>
      {s && m.status !== 'planned' && (
        <View style={styles.logBox}>
          <Text style={styles.body}>
            <Text style={{ fontWeight: '700' }}>{end ? `Dönemin son ${s.days} günü` : `Son ${s.days} gün`}: </Text>
            {s.practiced} gün uyguladı{ease ? ` · ailenin bildirdiği zorluk: ${ease}` : ''}
          </Text>
          {!!barriers && <Text style={styles.small}>Uygulayamadığı günler: {barriers}</Text>}
          <Text style={styles.tiny}>Ailenin kendi bildirimi; bir puan ya da değerlendirme değildir.</Text>
        </View>
      )}
      {!readOnly && <View style={{ alignItems: 'flex-start' }}><SmallButton label="Sil" danger onPress={onDelete} /></View>}
    </Card>
  );
}

/* ---------- Hedef ekle / düzenle ---------- */

function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.column}>
          <View style={styles.sheetHeader}>
            <IconButton name="close" label="Kapat" onPress={onClose} />
            <Text style={styles.sheetTitle}>{title}</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">{children}</ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

function Chips<T extends string>({ options, value, onChange }: { options: { id: T; label: string }[]; value: T | ''; onChange: (v: T) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
      {options.map((o) => (
        <Pressable key={o.id} onPress={() => onChange(o.id)} style={[styles.chip, value === o.id && styles.chipOn]}
          accessibilityRole="radio" accessibilityState={{ selected: value === o.id }}>
          <Text style={[styles.chipText, value === o.id && { color: '#fff' }]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function GoalSheet({ editing, legacy, onClose, onSave }: {
  editing?: PlanGoal; legacy: boolean; onClose: () => void; onSave: (g: GoalInput) => Promise<void>;
}) {
  const [step, setStep] = useState<'pick' | 'form'>(editing || legacy ? 'form' : 'pick');
  const [domain, setDomain] = useState(editing?.domain ?? '');
  const [f, setF] = useState<GoalInput>(editing ?? {
    title: '', description: '', domain: '', measure: 'yesno', baseline: '', target: '', weeks: 6, home_support: '', shared: true, status: 'active',
  });
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<GoalInput>) => setF((x) => ({ ...x, ...p }));
  const list = useMemo(() => GOAL_TEMPLATES.filter((g) => !domain || g.domain === domain), [domain]);

  const save = async () => {
    if (!f.title.trim()) return Alert.alert('Hedef davranışı yaz.');
    setBusy(true);
    try { await onSave(f); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); } finally { setBusy(false); }
  };

  if (step === 'pick') {
    return (
      <Sheet title="Hedef ekle" onClose={onClose}>
        <Chips options={[{ id: '', label: 'Tümü' } as { id: string; label: string }, ...DOMAINS.map((d) => ({ id: d.key, label: d.label }))]}
          value={domain} onChange={setDomain} />
        <View style={{ gap: 8, marginTop: 14 }}>
          {list.map((g) => (
            <Pressable key={g.key} style={styles.tpl} onPress={() => { setF({ ...goalFromTemplate(g) }); setStep('form'); }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>{g.title}</Text>
                <Text style={styles.small}>{domainLabel(g.domain)} · {MEASURES.find((m) => m.key === g.measure)?.label} · {g.target}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          ))}
        </View>
        <View style={{ marginTop: 16 }}><Cta label="Kendi hedefimi yazacağım" onPress={() => { set({ domain }); setStep('form'); }} /></View>
      </Sheet>
    );
  }
  return (
    <Sheet title={editing ? 'Hedefi düzenle' : 'Hedef'} onClose={onClose}>
      <Text style={styles.small}>Hedefi gözlenebilir yaz: "… yapar". Hiçbir hedef tanı ya da puan değildir.</Text>
      {!legacy && (<><Label>Alan</Label>
        <Chips options={DOMAINS.map((d) => ({ id: d.key, label: d.label }))} value={f.domain} onChange={(v) => set({ domain: v })} /></>)}
      <Label>Hedef davranış</Label>
      <Input value={f.title} onChangeText={(v) => set({ title: v })} placeholder="Ör. Sabah rutinini 1 hatırlatmayla bitirir" maxLength={120} multiline />
      {!legacy && (<>
        <Label>Nasıl ölçülür</Label>
        <Chips options={MEASURES.map((m) => ({ id: m.key, label: m.label }))} value={f.measure} onChange={(v) => set({ measure: v as Measure })} />
        <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Label>Başlangıç düzeyi (aile görür)</Label>
            <Input value={f.baseline} onChangeText={(v) => set({ baseline: v })} placeholder="Ör. %30 (boşsa ilk hafta)" maxLength={60} />
          </View>
          <View style={{ flex: 1, minWidth: 140 }}>
            <Label>Hedef düzey (aile görür)</Label>
            <Input value={f.target} onChangeText={(v) => set({ target: v })} placeholder="Ör. 7 günün 5'i" maxLength={60} />
          </View>
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
          {TARGET_HINTS.map((t) => <SmallButton key={t} label={t} onPress={() => set({ target: t })} />)}
        </View>
        <Label>Süre</Label>
        <Chips options={[4, 6, 8, 12].map((w) => ({ id: String(w), label: `${w} hafta` }))} value={f.weeks ? String(f.weeks) : ''}
          onChange={(v) => set({ weeks: Number(v) })} />
        <Label>Evde nasıl desteklenir (aile görür)</Label>
        <Input value={f.home_support} onChangeText={(v) => set({ home_support: v })} placeholder="Ör. Resimli çizelge; bitince övgü" maxLength={400} multiline />
      </>)}
      <Label>{legacy ? 'Açıklama' : 'Ek açıklama (aile görür)'}</Label>
      <Input value={f.description} onChangeText={(v) => set({ description: v })} placeholder="İsteğe bağlı" maxLength={600} multiline />
      {!legacy && (
        <View style={[styles.inline, { marginTop: 14 }]}>
          <Switch value={f.shared} onValueChange={(v) => set({ shared: v })} trackColor={{ true: colors.navy }} />
          <Text style={styles.body}>Aile bu hedefi görsün</Text>
        </View>
      )}
      <View style={{ marginTop: 18 }}><Cta label="Kaydet" onPress={save} busy={busy} /></View>
    </Sheet>
  );
}

/* ---------- Modül ekle / düzenle ---------- */

function ModuleSheet({ editing, onClose, onSave }: { editing?: PlanModule; onClose: () => void; onSave: (m: ModuleInput) => Promise<void> }) {
  const [step, setStep] = useState<'pick' | 'form'>(editing ? 'form' : 'pick');
  const [f, setF] = useState<ModuleInput>(editing ?? { title: '', aim: '', practice: '', checklist: [], status: 'active' });
  const [checklist, setChecklist] = useState((editing?.checklist ?? []).join('\n'));
  const [busy, setBusy] = useState(false);
  const set = (p: Partial<ModuleInput>) => setF((x) => ({ ...x, ...p }));

  const save = async () => {
    if (!f.title.trim()) return Alert.alert('Modülün adını yaz.');
    setBusy(true);
    try { await onSave({ ...f, checklist: checklist.split('\n') }); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); } finally { setBusy(false); }
  };

  if (step === 'pick') {
    return (
      <Sheet title="Aile programına modül ekle" onClose={onClose}>
        <Text style={styles.small}>Kanıta dayalı ebeveyn eğitiminin ortak bileşenlerinden iskeletler. İçeriği sen belirlersin.</Text>
        <View style={{ gap: 8, marginTop: 12 }}>
          {MODULE_TEMPLATES.map((m) => (
            <Pressable key={m.key} style={styles.tpl} onPress={() => {
              const t = moduleFromTemplate(m, 0, 'active');
              setF(t); setChecklist(t.checklist.join('\n')); setStep('form');
            }}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>{m.title}</Text>
                <Text style={styles.small}>{m.aim}</Text>
                {!!m.note && <Text style={[styles.small, { color: colors.medium.fg }]}>{m.note}</Text>}
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          ))}
        </View>
        <View style={{ marginTop: 16 }}><Cta label="Boş modül" onPress={() => setStep('form')} /></View>
      </Sheet>
    );
  }
  return (
    <Sheet title={editing ? 'Modülü düzenle' : 'Modül'} onClose={onClose}>
      <Label>Ad</Label>
      <Input value={f.title} onChangeText={(v) => set({ title: v })} placeholder="Ör. Övgü ve olumlu pekiştirme" maxLength={120} />
      <Label>Amaç (aile görür)</Label>
      <Input value={f.aim} onChangeText={(v) => set({ aim: v })} placeholder="Tek cümle" maxLength={400} multiline />
      <Label>Evde uygulama</Label>
      <Input value={f.practice} onChangeText={(v) => set({ practice: v })} placeholder="Ne kadar sıklıkla, nasıl?" maxLength={600} multiline />
      <Label>Kontrol listesi (her satır bir madde, en çok 8)</Label>
      <Input value={checklist} onChangeText={setChecklist} placeholder={'Telefonu uzağa koydum\nOyunu çocuğum seçti'} multiline />
      <Label>Durum</Label>
      <Chips options={MODULE_STATUS} value={f.status} onChange={(v) => set({ status: v })} />
      <Text style={[styles.small, { marginTop: 6 }]}>"Planlandı" aileye görünmez; sırası gelince "Etkin" yap.</Text>
      <View style={{ marginTop: 18 }}><Cta label="Kaydet" onPress={save} busy={busy} /></View>
    </Sheet>
  );
}

/* ---------- Paketler ---------- */

function PackageSheet({ onClose, onApply }: { onClose: () => void; onApply: (p: PackageT, goalKeys: string[]) => Promise<void> }) {
  const [sel, setSel] = useState<PackageT | null>(null);
  const [goalKeys, setGoalKeys] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const pick = (p: PackageT) => { setSel(p); setGoalKeys(p.goals); };
  const apply = async () => {
    if (!sel) return;
    setBusy(true);
    try { await onApply(sel, goalKeys); } catch (e) { Alert.alert('Eklenemedi', (e as Error).message); } finally { setBusy(false); }
  };

  if (!sel) {
    return (
      <Sheet title="Hazır paketler" onClose={onClose}>
        <Text style={styles.small}>İhtiyaç alanına göre başlangıç planı. Tanı etiketi gerekmez; eklediklerini düzenleyebilir ya da silebilirsin.</Text>
        <View style={{ gap: 8, marginTop: 12 }}>
          {PACKAGES.map((p) => (
            <Pressable key={p.key} style={styles.tpl} onPress={() => pick(p)}>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.title}>{p.title}</Text>
                <Text style={styles.small}>{p.goals.length} hedef · {p.modules.length} modül · {p.weeks} hafta</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.faint} />
            </Pressable>
          ))}
        </View>
      </Sheet>
    );
  }
  return (
    <Sheet title={sel.title} onClose={() => setSel(null)}>
      <Label>Hedefler (seçtiklerin eklenir)</Label>
      <View style={{ gap: 6 }}>
        {sel.goals.map((k) => {
          const g = GOAL_TEMPLATES.find((x) => x.key === k)!;
          const on = goalKeys.includes(k);
          return (
            <Pressable key={k} onPress={() => setGoalKeys((s) => (on ? s.filter((x) => x !== k) : [...s, k]))} style={[styles.tpl, on && { borderColor: colors.navy }]}
              accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
              <Ionicons name={on ? 'checkbox' : 'square-outline'} size={20} color={colors.navy} />
              <Text style={[styles.body, { flex: 1 }]}>{g.title}</Text>
            </Pressable>
          );
        })}
      </View>
      <Label>Aile programı (sırayla)</Label>
      {sel.modules.map((k, i) => (
        <Text key={k} style={styles.body}>{i + 1}. {MODULE_TEMPLATES.find((m) => m.key === k)?.title}{i === 0 ? ' — etkin' : ''}</Text>
      ))}
      <Text style={[styles.small, { marginTop: 6 }]}>İlk modül etkin başlar; diğerleri "Planlandı" kalır, sırası gelince etkinleştirirsin.</Text>
      <View style={{ marginTop: 18 }}><Cta label="Plana ekle" onPress={apply} busy={busy} /></View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.navy, flex: 1 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  tiny: { fontSize: 11, color: colors.muted },
  pkg: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: radius.md, padding: 14, marginTop: 8, borderWidth: 1, borderColor: colors.line },
  pkgTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  tpl: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.line },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 13, fontWeight: '600', color: colors.navy },
  rowWrap: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, justifyContent: 'space-between' },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seg: { flexDirection: 'row', backgroundColor: '#ECEEF3', borderRadius: radius.sm, padding: 3 },
  segItem: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 8 },
  segOn: { backgroundColor: '#fff' },
  segText: { fontSize: 12, fontWeight: '600', color: colors.muted },
  logBox: { backgroundColor: colors.bg, borderRadius: radius.sm, padding: 10, gap: 3 },
  scale: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  scaleBtn: { flexGrow: 1, flexBasis: 90, alignItems: 'center', paddingVertical: 8, paddingHorizontal: 4, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  scaleOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  scaleNum: { fontSize: 15, fontWeight: '700', color: colors.navy },
  scaleLbl: { fontSize: 10, color: colors.muted, textAlign: 'center' },
});
