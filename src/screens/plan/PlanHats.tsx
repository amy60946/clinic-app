import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Switch, Alert, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Input, Notice, SmallButton, IconButton, Segmented } from '../../components/ui';
import { GasLine } from '../../components/charts';
import { weekStarts, taskSetRate, Task } from '../../lib/metrics';
import { track } from '../../lib/track';
import { todayISO } from '../../dates';
import {
  PlanTarget, PlanGoal, PlanModule, ModuleLog, ModuleGoals, ModuleInput, PlanTemplate, GoalT, PackageT, Published, GoalStatus, ModuleStatus,
  DOMAINS, GOAL_TEMPLATES, MODULE_TEMPLATES, PACKAGES, domainLabel, measureLabel,
  loadPlan, loadLogs, loadModuleGoals, linkModuleGoals, unlinkModuleGoal, addGoals, updateGoal, addModules, updateModule, deleteModule,
  rateGoal, applyPackage, goalFromTemplate, moduleFromTemplate, logSummary, publishPlan, listPlanTemplates, savePlanTemplate,
  updatePlanTemplate, deletePlanTemplate, loadPublished, PlanSchemaMissing,
} from '../../lib/plan';
import {
  Suggestion, SuggestionInput, SuggestionSchemaMissing, RoutineRef, ChangeInput, listSuggestions, addSuggestions, withdrawSuggestion,
  proposeChanges, updateSuggestion, updateSuggestionFields, setSuggestionGoal, listOwnRoutines,
} from '../../lib/clinic';
import {
  ROUTINES, Routine, OwnRoutine, routinesFor, childBand, ownToRoutine, fitsAge, draftOf, routineSuggestions, newGroupId, AGE_LABEL, agesText,
} from '../../lib/routines';
import type { AgeGroup } from '../../templates';
import { useDragSource, useDropZone } from '../../lib/dnd';
import { RGroup, groupSuggestions, visibleGroup, goalUnsent, moduleUnsent } from '../../lib/planCore';
import { useLayout } from '../../lib/layout';
import { useClientConfig } from '../../lib/clientConfig';
import RoutineSheet, { RoutineGoal } from '../client/RoutineSheet';
import SuggestionEditor from '../client/SuggestionEditor';
import ChangeSheet, { EditTarget, EditResult } from './ChangeSheet';
import PlanEditor, { GoalSheet, ModuleSheet, PackageSheet, GAS_LABELS } from './PlanEditor';
import type { ClientCtx } from '../client/ClientScreen';

// Takip planı — hedef hatları (kullanıcı kararları 30 Ekim ve 2 Kasım 2026, "C"; ortak akislar.md 12.1):
// her hedef bir satır: hedef (uzman yazar ve değerlendirir) · aile programı (ebeveyn evde uygular) · rutin ve görevler
// (çocuk yapar, ebeveyn onaylar). Bir program birden çok hedefi destekler; rutin bir hedefe bağlanır.
// Rutin ve görev önerileri TASLAK olarak eklenir; plan değişiklikleriyle birlikte tek "Aileye gönder" ile gider (tek bildirim).
// Ailede ekli rutin değiştirilmez, DEĞİŞİKLİK ÖNERİLİR. Kitaplık: paketler, hazır hedefler, programlar, rutinler, Şablonlarım;
// web'de sürükle-bırak, her yerde "Ekle". Uzmanın kendi programı bu sürümde yok (sistem içerikleri).

const GOAL_COLORS = ['#2C4A9A', '#2F7D4A', '#9A6B00', '#7A3E9D', '#B3263E', '#1F7A8C'];
// hedef alanına göre önerilen rutin konuları (ortak hazir_rutinler.json "theme")
const DOMAIN_THEMES: Record<string, string[]> = {
  routine: ['morning', 'evening'], school: ['afterschool'], sleep: ['evening'], rules: ['evening', 'chores'],
  attention: ['afterschool', 'chores'], emotion: ['evening'], social: ['family'],
};
const GOAL_STATUS: { id: GoalStatus; label: string }[] = [
  { id: 'active', label: 'Sürüyor' }, { id: 'achieved', label: 'Ulaşıldı' }, { id: 'paused', label: 'Ara verildi' },
];
const MODULE_STATUS: { id: ModuleStatus; label: string }[] = [
  { id: 'planned', label: 'Planlandı' }, { id: 'active', label: 'Etkin' }, { id: 'done', label: 'Tamamlandı' },
];
const short = (s: string, n = 30) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const isWeb = Platform.OS === 'web';
// iOS'ta bir pencere kapanırken başka pencere açılamaz: kapanış bitince aç
const later = (f: () => void) => (Platform.OS === 'ios' ? setTimeout(f, 450) : f());

/* ---------- Sürükle-bırak sarmalayıcıları (yalnız web; başka yerde düz View) ---------- */
function DragView({ payload, style, children }: { payload: string | null; style?: object; children: React.ReactNode }) {
  const ref = useRef<View>(null);
  useDragSource(ref, payload);
  return <View ref={ref} style={[style, payload && isWeb ? (styles.grab as object) : null]}>{children}</View>;
}
function DropView({ accept, onDrop, style, children }: { accept: string[]; onDrop: (p: string) => void; style?: object; children: React.ReactNode }) {
  const ref = useRef<View>(null);
  const [over, setOver] = useState(false);
  useDropZone(ref, accept, onDrop, setOver);
  return <View ref={ref} style={[style, over && styles.dropOver]}>{children}</View>;
}
const splitPayload = (p: string) => { const i = p.indexOf(':'); return [p.slice(0, i), p.slice(i + 1)] as const; };

/* ====================================================================== */

export default function PlanHats({ client, me, data, today, reload }: Pick<ClientCtx, 'client' | 'me' | 'data' | 'today' | 'reload'>) {
  const target: PlanTarget = { kind: 'link', linkId: client.link_id, clinicId: client.clinic_id };
  const { desktop } = useLayout();
  // Ailede ekli rutine değişiklik önerisi, ParentApp "Uzmanın değişiklik önerisi" kartını yayınlayana kadar kapalı: eski ParentApp
  // değişiklik önerisini yeni görev gibi ekler (çift görev). Yönetim panelinde `plan_change_suggestions` bayrağı açılınca görünür.
  const changeOn = useClientConfig().flag('plan_change_suggestions');
  const band = childBand(data.child);
  const [plan, setPlan] = useState<{ goals: PlanGoal[]; modules: PlanModule[]; legacy: boolean } | null>(null);
  const [logs, setLogs] = useState<ModuleLog[]>([]);
  const [links, setLinks] = useState<ModuleGoals | null>(null);     // null: program ↔ hedef bağı sunucuda yok
  const [sugg, setSugg] = useState<Suggestion[]>([]);
  const [pub, setPub] = useState<Published | null>(null);
  const [tpls, setTpls] = useState<PlanTemplate[] | null>(null);    // null: Şablonlarım sunucuda yok
  const [own, setOwn] = useState<OwnRoutine[] | null>(null);
  const [error, setError] = useState('');
  const [localDirty, setLocalDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [width, setWidth] = useState(0);
  const [openIds, setOpenIds] = useState<string[] | null>(null);
  const [focus, setFocus] = useState<string | null>(null);          // kitaplıktaki "Ekle" bu hedefe ekler
  const [which, setWhich] = useState<'this' | 'last'>('this');
  const [libOpen, setLibOpen] = useState<boolean | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [help, setHelp] = useState(false);
  // pencereler
  const [goalSheet, setGoalSheet] = useState<{ editing?: PlanGoal } | null>(null);
  const [moduleSheet, setModuleSheet] = useState<{ editing?: PlanModule; goalId: string | null } | null>(null);
  const [pkgOpen, setPkgOpen] = useState(false);
  const [rtSheet, setRtSheet] = useState<{ routine: Routine; goalId: string | null } | null>(null);
  const [taskSheet, setTaskSheet] = useState<{ goalId: string | null; editing: Suggestion | null } | null>(null);
  const [pick, setPick] = useState<string | null>(null);              // "+ Rutin ya da görev bağla" (hedef kimliği)
  const [edit, setEdit] = useState<{ group: RGroup; target: EditTarget } | null>(null);
  const [tplSave, setTplSave] = useState<PlanGoal | null>(null);

  const load = useCallback(async () => {
    try {
      const [p, s] = await Promise.all([loadPlan(target), listSuggestions(client.link_id).catch(() => [] as Suggestion[])]);
      const ids = p.modules.map((m) => m.id);
      const [l, lk, pb] = await Promise.all([
        loadLogs(ids), p.legacy ? Promise.resolve(null) : loadModuleGoals(ids).catch(() => null), loadPublished(client.link_id),
      ]);
      setPlan(p); setSugg(s); setLogs(l); setLinks(lk); setPub(pb); setError('');
    } catch (e) {
      setError(e instanceof PlanSchemaMissing ? e.message : (e as Error).message);
    }
  }, [client.link_id]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadLibrary = useCallback(() => {
    listPlanTemplates().then(setTpls).catch(() => setTpls(null));
    listOwnRoutines().then(setOwn).catch(() => setOwn(null));
  }, []);
  useEffect(() => { loadLibrary(); }, [loadLibrary]);
  // danışan verisi yenilenince (aşağı çekme, kabul bildirimi) plan da yeniden okunur
  useEffect(() => { load(); }, [load, data]);
  // Aile bir öneriyi az önce kabul ettiyse görev listesi eskidir: kabul edilen görev çocuğun listesinde yoksa veriyi bir kez yenile
  const staleAsked = useRef(false);
  useEffect(() => {
    if (staleAsked.current || !reload) return;
    const known = new Set(data.tasks.map((t) => t.id));
    if (sugg.some((s) => s.status === 'accepted' && s.task_id && !known.has(s.task_id))) { staleAsked.current = true; reload(); }
  }, [sugg, data, reload]);

  const goals = useMemo(() => (plan?.goals ?? []).filter((g) => !g.archived), [plan]);
  const archived = useMemo(() => (plan?.goals ?? []).filter((g) => g.archived), [plan]);
  const groups = useMemo(() => groupSuggestions(sugg, data.tasks, today).filter((r) => visibleGroup(r, today)), [sugg, data.tasks, today]);
  // ilk açılışta: iki ya da daha az hedef varsa hepsi açık, yoksa ilki
  useEffect(() => {
    if (plan && openIds === null) setOpenIds(goals.length <= 2 ? goals.map((g) => g.id) : goals.slice(0, 1).map((g) => g.id));
    if (plan && libOpen === null) setLibOpen(desktop && goals.length === 0);
  }, [plan]); // eslint-disable-line react-hooks/exhaustive-deps

  if (error) return <Notice icon="construct-outline" text={error} />;
  if (!plan) return <ActivityIndicator color={colors.navy} style={{ marginTop: 24 }} />;
  // eski sunucu (aile programı yok): eski düzenleyici
  if (plan.legacy) return <PlanEditor target={target} today={today} onChanged={() => setLocalDirty(true)} />;

  /* ---------- türetilenler ---------- */
  const weeks = weekStarts(today, 8);
  const week = which === 'this' ? weeks[weeks.length - 1] : weeks[weeks.length - 2];
  const thisWeek = weeks[weeks.length - 1];
  const linkOK = links !== null;
  const modsOf = (gid: string) => plan.modules.filter((m) => links?.[m.id]?.includes(gid));
  const rtsOf = (gid: string) => groups.filter((r) => r.goalId === gid);
  const unlinkedMods = plan.modules.filter((m) => !links || !(links[m.id] ?? []).some((id) => goals.some((g) => g.id === id)));
  const unlinkedRts = groups.filter((r) => (!r.goalId || !goals.some((g) => g.id === r.goalId)) && r.state !== 'declined' && !(r.single && r.state === 'added'));
  const otherSingles = groups.filter((r) => r.single && r.state === 'added' && (!r.goalId || !goals.some((g) => g.id === r.goalId))).length;
  const sharedIds = new Set(goals.filter((g) => g.shared).map((g) => g.id));
  const unsentGoal = (g: PlanGoal) => !!pub && goalUnsent(g, pub.goals[g.id] ?? null);
  const unsentMod = (m: PlanModule) => !!pub && moduleUnsent(m, pub.modules[m.id] ?? null, links ? (links[m.id] ?? []).filter((id) => sharedIds.has(id)) : null);
  const draftUnits = new Set(sugg.filter((s) => s.status === 'draft').map((s) => (s.kind === 'change' ? `c:${s.routine?.group ?? s.id}` : s.routine?.group ?? s.id))).size;
  const unsentPlan = pub ? plan.goals.filter(unsentGoal).length + plan.modules.filter(unsentMod).length : localDirty ? 1 : 0;
  const unsent = unsentPlan + draftUnits;
  const hatUnsent = (g: PlanGoal) => unsentGoal(g) || modsOf(g.id).some(unsentMod) || rtsOf(g.id).some((r) => r.drafts > 0 || r.changes.some((c) => c.status === 'draft'));
  const isOpen = (gid: string) => (openIds ?? []).includes(gid);
  const toggle = (gid: string) => {
    setOpenIds((x) => ((x ?? []).includes(gid) ? (x ?? []).filter((y) => y !== gid) : [...(x ?? []), gid]));
    setFocus(gid);
  };
  const libTarget = focus && goals.some((g) => g.id === focus) ? focus : goals[0]?.id ?? null;
  const showLib = desktop && !!libOpen && width >= 980;
  const cols3 = (showLib ? width - 316 : width) >= 760;
  const taken = [...data.tasks.map((t) => t.title), ...sugg.filter((s) => s.status === 'pending' || s.status === 'draft').map((s) => s.title)];
  const richGoals: RoutineGoal[] = goals.filter((g) => g.status !== 'achieved').map((g) => ({
    id: g.id, title: g.title,
    meta: [g.domain && domainLabel(g.domain), `${modsOf(g.id).length} program`, `${rtsOf(g.id).length} rutin`, g.shared ? '' : 'yalnız sende'].filter(Boolean).join(' · '),
  }));
  const ownRoutines = (own ?? []).map(ownToRoutine);
  const resolveRoutine = (key: string): Routine | null => {
    if (key.startsWith('own:')) return ownRoutines.find((r) => r.key === key) ?? null;
    const base = ROUTINES.find((r) => r.key === key);
    if (!base) return null;
    return (base.theme && ROUTINES.find((r) => r.theme === base.theme && fitsAge(r, band))) || base;
  };

  /* ---------- eylemler ---------- */
  const fail = (what: string) => (e: unknown) => Alert.alert(what, (e as Error).message);
  const after = (planChanged = true) => { if (planChanged) setLocalDirty(true); return load(); };
  const act = (p: Promise<unknown>, what = 'Kaydedilemedi', planChanged = true) => p.then(() => after(planChanged)).catch(fail(what));
  const needLinks = () => {
    if (linkOK) return true;
    Alert.alert('Veritabanı güncellemesi bekleniyor', 'Programı bir hedefe bağlamak için ortak 20261102100000_plan_redesign.sql uygulanmalı.');
    return false;
  };
  const openHat = (gid: string) => { setOpenIds((x) => ((x ?? []).includes(gid) ? x : [...(x ?? []), gid])); setFocus(gid); };

  const addGoalFromTemplate = async (gt: GoalT) => {
    try {
      const [gid] = await addGoals(target, [goalFromTemplate(gt, plan.goals.length)]);
      track('plan.goal', { tpl: gt.key });
      await after();
      if (gid) openHat(gid);
    } catch (e) { fail('Hedef eklenemedi')(e); }
  };
  const addPackage = async (p: PackageT, goalKeys = p.goals) => {
    const { goalIds } = await applyPackage(target, p, plan, goalKeys);
    track('plan.package', { key: p.key });
    await after();
    goalIds.forEach(openHat);
  };
  const addTemplateModule = async (key: string, gid: string | null) => {
    const t = MODULE_TEMPLATES.find((m) => m.key === key);
    if (!t) return;
    try {
      const existing = plan.modules.find((m) => m.template_key === key);
      if (existing) {
        if (gid && needLinks()) await linkModuleGoals(client.clinic_id, [[existing.id, gid]]);
        else if (!gid) Alert.alert('Bu program planda var', t.title);
      } else {
        const [id] = await addModules(target, [moduleFromTemplate(t, plan.modules.length, 'active')]);
        if (gid && id && linkOK) await linkModuleGoals(client.clinic_id, [[id, gid]]);
      }
      track('plan.module', { tpl: key, goal: !!gid });
      await after();
    } catch (e) { fail('Program eklenemedi')(e); }
  };
  const setRoutineGoal = async (r: RGroup, gid: string | null) => {
    const ids = r.items.map((s) => s.id);
    try {
      await setSuggestionGoal(ids, gid);
    } catch (e) {
      // eski sunucu: yalnız taslak/bekleyen öneri tek tek güncellenebilir
      if (!(e instanceof SuggestionSchemaMissing) || r.items.some((s) => s.status !== 'draft' && s.status !== 'pending')) throw e;
      for (const s of r.items) await updateSuggestionFields(s.id, { goal_id: gid });
    }
    track('plan.routine_goal', { link: !!gid });
    await load();
  };
  const onDropHat = (gid: string) => (p: string) => {
    const [type, rest] = splitPayload(p);
    if (type === 'module') {
      const [mid, from] = rest.split('|');
      if (from !== gid && needLinks()) act(linkModuleGoals(client.clinic_id, [[mid, gid]]), 'Bağlanamadı');
    } else if (type === 'routine') {
      const r = groups.find((x) => x.key === rest);
      if (r && r.goalId !== gid) setRoutineGoal(r, gid).catch(fail('Bağlanamadı'));
    } else if (type === 'libmod') addTemplateModule(rest, gid);
    else if (type === 'librt') { const r = resolveRoutine(rest); if (r) setRtSheet({ routine: r, goalId: gid }); }
    openHat(gid);
  };
  const onDropUnlinked = (p: string) => {
    const [type, rest] = splitPayload(p);
    if (type === 'module') {
      const [mid, from] = rest.split('|');
      if (from && from !== '-') act(unlinkModuleGoal(mid, from), 'Bağ kaldırılamadı');
    } else if (type === 'routine') {
      const r = groups.find((x) => x.key === rest);
      if (r?.goalId) setRoutineGoal(r, null).catch(fail('Bağ kaldırılamadı'));
    }
  };
  const onDropPlan = (p: string) => {
    const [type, rest] = splitPayload(p);
    if (type === 'libgoal') { const gt = GOAL_TEMPLATES.find((g) => g.key === rest); if (gt) addGoalFromTemplate(gt); }
    else if (type === 'libpkg') { const pk = PACKAGES.find((x) => x.key === rest); if (pk) addPackage(pk).catch(fail('Paket eklenemedi')); }
    else if (type === 'libtpl') { const t = tpls?.find((x) => x.id === rest); if (t) applyTemplate(t); }
  };
  const pickGoal = (title: string, cb: (gid: string) => void) => {
    if (!goals.length) return Alert.alert('Önce bir hedef ekle');
    Alert.alert('Hangi hedefe bağlansın?', title, [
      ...goals.map((g) => ({ text: short(g.title, 40), onPress: () => cb(g.id) })),
      { text: 'Vazgeç', style: 'cancel' as const },
    ]);
  };

  // rutin taslağı (hedef satırından ya da kitaplıktan)
  const submitRoutine = async (list: SuggestionInput[]) => {
    const res = await addSuggestions(client, me.id, list, { draft: true });
    track('suggestion.routine', { routine: list[0]?.routine?.key ?? '', n: list.length, grouped: res.grouped, goal: !!list[0]?.goal_id, draft: res.draft, from: 'plan' });
    setRtSheet(null);
    await load();
    if (!res.draft) Alert.alert('Rutin aileye gönderildi', 'Taslak için veritabanı güncellemesi bekleniyor; öneri hemen gönderildi.');
  };
  const submitTask = async (list: SuggestionInput[]) => {
    if (!taskSheet) return;
    if (taskSheet.editing) {
      await updateSuggestion(taskSheet.editing.id, { ...list[0], goal_id: taskSheet.editing.goal_id });
      track('suggestion.update', { from: 'plan' });
      setTaskSheet(null);
      return void load();
    }
    const res = await addSuggestions(client, me.id, list.map((s) => ({ ...s, goal_id: taskSheet.goalId })), { draft: true });
    track('suggestion.send', { n: list.length, draft: res.draft, from: 'plan' });
    setTaskSheet(null);
    await load();
    if (!res.draft) Alert.alert('Öneri aileye gönderildi', 'Taslak için veritabanı güncellemesi bekleniyor; öneri hemen gönderildi.');
  };

  // rutini düzenle: taslak/bekleyen doğrudan; ailede ekli → değişiklik önerisi
  const openEdit = (r: RGroup) => {
    if (r.state === 'added') {
      if (!r.tasks.length) return Alert.alert('Ailede sürmekte olan görev yok');
      const prefill = Object.fromEntries(r.changes.map((c) => [c.target_task_id!, { reminder: c.reminder, remove: c.change_remove }]));
      setEdit({ group: r, target: { mode: 'change', title: r.title, prefill,
        items: r.tasks.map((t) => ({ id: t.id, title: t.title, emoji: t.emoji, reminder: t.reminder })) } });
    } else if (r.single && r.items.length === 1 && (r.state === 'draft' || r.state === 'pending')) {
      setTaskSheet({ goalId: r.goalId, editing: r.items[0] });
    } else {
      const items = r.items.filter((s) => s.status === 'draft' || s.status === 'pending');
      setEdit({ group: r, target: { mode: r.state === 'draft' ? 'draft' : 'pending', title: r.title,
        items: items.map((s) => ({ id: s.id, title: s.title, emoji: s.emoji, reminder: s.reminder })) } });
    }
  };
  const submitEdit = async (list: EditResult[]) => {
    if (!edit) return;
    const r = edit.group;
    if (edit.target.mode === 'change') {
      const changes: ChangeInput[] = [];
      for (const x of list) {
        const t = r.tasks.find((y) => y.id === x.id);
        if (!t) continue;
        const open = r.changes.find((c) => c.target_task_id === x.id);
        if (!x.remove && (x.reminder ?? null) === (t.reminder ?? null)) { if (open) await withdrawSuggestion(open.id); continue; }
        changes.push({ task: t, reminder: x.reminder, remove: x.remove, routine: r.routine, goal_id: r.goalId });
      }
      await proposeChanges(client, me.id, changes, sugg);
      track('suggestion.change', { n: changes.length, remove: changes.filter((c) => c.remove).length });
    } else {
      for (const x of list) {
        if (x.remove) await withdrawSuggestion(x.id);
        else await updateSuggestionFields(x.id, { reminder: x.reminder });
      }
      track('suggestion.update', { from: 'plan', n: list.length });
    }
    setEdit(null);
    await load();
  };
  const withdrawGroup = (r: RGroup) => {
    const open = r.items.filter((s) => s.status === 'draft' || s.status === 'pending');
    Alert.alert(r.state === 'draft' ? 'Taslak silinsin mi?' : 'Öneri geri çekilsin mi?',
      r.state === 'draft' ? 'Aile bu taslağı hiç görmedi.' : 'Ebeveyn bu öneriyi artık görmez.', [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: r.state === 'draft' ? 'Sil' : 'Geri çek', style: 'destructive',
          onPress: () => Promise.all(open.map((s) => withdrawSuggestion(s.id))).then(() => { setEdit(null); setTaskSheet(null); return load(); })
            .catch(fail('Geri çekilemedi')),
        },
      ]);
  };

  const hatMenu = (g: PlanGoal) => Alert.alert(short(g.title, 60), undefined, [
    { text: 'Hedefi düzenle', onPress: () => setGoalSheet({ editing: g }) },
    { text: 'Şablon olarak kaydet', onPress: () => (tpls === null
      ? Alert.alert('Veritabanı güncellemesi bekleniyor', 'Şablonlarım için ortak 20261102100000_plan_redesign.sql uygulanmalı.')
      : setTplSave(g)) },
    { text: 'Arşivle', style: 'destructive', onPress: () => act(updateGoal(g.id, { archived: true })) },
    { text: 'Vazgeç', style: 'cancel' },
  ]);

  // Şablonlarım: hedef + bağlı programlar + rutinler; çocuğa ait kayıt girmez
  const saveTemplate = async (g: PlanGoal, title: string, shared: boolean) => {
    const keys = new Set<string>();
    await savePlanTemplate(title, shared, {
      goal: {
        title: g.title, template_key: g.template_key || undefined, domain: g.domain || undefined, measure: g.measure,
        target: g.target || undefined, weeks: g.weeks || undefined, home_support: g.home_support || undefined, description: g.description || undefined,
      },
      modules: modsOf(g.id).slice(0, 12).map((m) => ({
        template_key: m.template_key || undefined, title: m.title, aim: m.aim || undefined, practice: m.practice || undefined,
        checklist: m.checklist.slice(0, 8),
      })),
      routines: rtsOf(g.id).filter((r) => r.routine?.key && !keys.has(r.routine.key) && keys.add(r.routine.key))
        .slice(0, 6).map((r) => ({ key: r.routine!.key, title: r.title, icon: r.icon || undefined })),
    });
    track('plan.template_save', { shared, modules: modsOf(g.id).length });
    setTplSave(null);
    loadLibrary();
    Alert.alert('Şablon kaydedildi', `Kitaplık › Şablonlarım'da "${title}". Başka bir danışana tek hamlede uygulayabilirsin.`);
  };
  const applyTemplate = async (t: PlanTemplate) => {
    try {
      const tg = t.content.goal;
      const [gid] = await addGoals(target, [{
        title: tg.title, description: tg.description ?? '', domain: tg.domain ?? '', measure: tg.measure ?? 'yesno', baseline: '',
        target: tg.target ?? '', weeks: tg.weeks ?? null, home_support: tg.home_support ?? '', shared: true, status: 'active',
        template_key: tg.template_key ?? null, position: plan.goals.length,
      }]);
      // programlar: aynı şablon anahtarlı program planda varsa o bağlanır, yoksa eklenir
      const reuse: string[] = [];
      const create: ModuleInput[] = [];
      t.content.modules.forEach((m) => {
        const ex = m.template_key ? plan.modules.find((x) => x.template_key === m.template_key) : undefined;
        if (ex) reuse.push(ex.id);
        else create.push({ title: m.title, aim: m.aim ?? '', practice: m.practice ?? '', checklist: m.checklist ?? [], status: 'active',
          template_key: m.template_key ?? null, position: plan.modules.length + create.length });
      });
      const made = await addModules(target, create);
      if (gid && linkOK) await linkModuleGoals(client.clinic_id, [...reuse, ...made].map((mid) => [mid, gid] as [string, string]));
      // rutinler çocuğun yaşına uyan sürümle, taslak olarak
      let routines = 0;
      for (const x of t.content.routines) {
        const r = resolveRoutine(x.key);
        if (!r) continue;
        const list = routineSuggestions(r, draftOf(r, taken), todayISO(), '', { group: newGroupId(), goalId: gid });
        if (!list.length) continue;
        await addSuggestions(client, me.id, list, { draft: true });
        routines += 1;
      }
      track('plan.template_apply', { modules: create.length + reuse.length, routines });
      await after();
      if (gid) openHat(gid);
      Alert.alert('Şablon uygulandı', `Hedef, ${create.length + reuse.length} program ve ${routines} rutin taslağı eklendi. Gözden geçir, sonra "Aileye gönder".`);
    } catch (e) { fail('Şablon uygulanamadı')(e); }
  };

  const publish = async () => {
    setBusy(true);
    try {
      await publishPlan(client.link_id);
      track('plan.publish', { drafts: draftUnits, plan: unsentPlan });
      setLocalDirty(false);
      await load();
      Alert.alert('Aileye gönderildi', 'Ebeveyn tek bildirim alır; plan ve öneriler ParentApp › Uzmanım › (senin adın) bölümünde.');
    } catch (e) {
      Alert.alert('Gönderilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  /* ---------- dikkat ---------- */
  const attention: { icon: keyof typeof Ionicons.glyphMap; text: string; onPress?: () => void; tone?: 'warn' }[] = [];
  if (unsent) attention.push({ icon: 'paper-plane-outline', text: `${unsent} değişiklik aileye gönderilmedi`, onPress: publish, tone: 'warn' });
  const noGas = goals.filter((g) => g.status === 'active' && !g.ratings.some((r) => r.week === thisWeek));
  if (noGas.length) attention.push({ icon: 'stats-chart-outline', text: `Bu hafta değerlendirilmedi: ${noGas.length} hedef`, onPress: () => openHat(noGas[0].id) });
  const idle = plan.modules.filter((m) => m.status === 'active' && pub?.modules[m.id] && logSummary(logs, m.id, 7).practiced === 0);
  if (idle.length) attention.push({ icon: 'time-outline', text: `7 gündür uygulanmadı: ${short(idle[0].title, 26)}${idle.length > 1 ? ` +${idle.length - 1}` : ''}` });
  const low = groups.filter((r) => r.state === 'added' && r.tasks.length).map((r) => ({ r, s: taskSetRate(data.tasks, data.completions, r.tasks.map((t) => t.id), today) }))
    .filter((x) => x.s.planned >= 3 && (x.s.rate ?? 0) < 60);
  if (low.length) attention.push({ icon: 'trending-down-outline', text: `Rutin oranı düşük: ${short(low[0].r.title, 22)} %${low[0].s.rate}`, onPress: low[0].r.goalId ? () => openHat(low[0].r.goalId!) : undefined });
  const waiting = groups.filter((r) => r.state === 'pending').length + sugg.filter((s) => s.kind === 'change' && s.status === 'pending').length;
  if (waiting) attention.push({ icon: 'hourglass-outline', text: `${waiting} öneri ebeveyn kararı bekliyor` });

  /* ---------- çizim ---------- */
  const moduleMini = (m: PlanModule, gid: string | null) => {
    const s = logSummary(logs, m.id, 7);
    const n = links?.[m.id]?.filter((id) => goals.some((g) => g.id === id)).length ?? 0;
    return (
      <DragView key={`${m.id}-${gid}`} payload={isWeb && linkOK ? `module:${m.id}|${gid ?? '-'}` : null} style={styles.mini}>
        <View style={styles.miniHead}>
          <Text style={styles.miniTitle} numberOfLines={2}>{m.title}</Text>
          {unsentMod(m) && <View style={styles.dot} accessibilityLabel="Aileye gönderilmedi" />}
          <IconButton name="create-outline" label="Programı düzenle" size={16} onPress={() => setModuleSheet({ editing: m, goalId: gid })} />
          {gid ? (
            <IconButton name="unlink-outline" label="Bu hedeften ayır" size={16} onPress={() => act(unlinkModuleGoal(m.id, gid), 'Bağ kaldırılamadı')} />
          ) : (
            <IconButton name="trash-outline" label="Programı sil" size={16} onPress={() => Alert.alert('Program silinsin mi?', 'Ailenin bu programdaki uygulama kayıtları da silinir.', [
              { text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => act(deleteModule(m.id), 'Silinemedi') }])} />
          )}
        </View>
        <View style={styles.seg}>
          {MODULE_STATUS.map((x) => (
            <Pressable key={x.id} onPress={() => m.status !== x.id && act(updateModule(m.id, { status: x.id }))} style={[styles.segItem, m.status === x.id && styles.segOn]}
              accessibilityRole="radio" accessibilityState={{ selected: m.status === x.id }}>
              <Text style={[styles.segText, m.status === x.id && styles.segTextOn]}>{x.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.tiny}>
          {m.status === 'planned' ? 'Aile görmez (planlandı)' : pub?.modules[m.id] ? `Son 7 gün: ${s.practiced} gün uyguladı (ebeveyn kaydı)` : 'Aileye gönderilmedi'}
          {n > 1 ? ` · ${n} hedefte` : ''}
        </Text>
      </DragView>
    );
  };

  const routineMini = (r: RGroup) => {
    const ids = r.tasks.map((t) => t.id);
    const rate = r.state === 'added' ? taskSetRate(data.tasks, data.completions, ids, today) : null;
    const times = r.items.map((s) => s.reminder).filter((x): x is string => !!x).sort();
    const draftChange = r.changes.some((c) => c.status === 'draft');
    const pendingChange = r.changes.some((c) => c.status === 'pending');
    const pill = r.state === 'draft' ? { t: 'Taslak · gönderilmedi', fg: colors.medium.fg, bg: colors.medium.bg }
      : r.state === 'pending' ? { t: 'Ebeveyn kararı bekleniyor', fg: '#2C4A9A', bg: '#E6EAF5' }
        : r.state === 'added' ? { t: r.single ? 'Ailede ekli' : `${r.added} / ${r.items.length} görev ailede`, fg: colors.easy.fg, bg: colors.easy.bg }
          : { t: 'Aile eklemedi', fg: colors.muted, bg: '#ECEEF3' };
    return (
      <DragView key={r.key} payload={isWeb ? `routine:${r.key}` : null} style={styles.mini}>
        <View style={styles.miniHead}>
          {r.single ? <Text style={{ fontSize: 16 }}>{r.emoji}</Text>
            : <Ionicons name={(r.icon || 'repeat-outline') as keyof typeof Ionicons.glyphMap} size={16} color={colors.navy} />}
          <Text style={styles.miniTitle} numberOfLines={2}>{r.title}</Text>
          {r.goalId && <IconButton name="unlink-outline" label="Hedeften ayır" size={16} onPress={() => setRoutineGoal(r, null).catch(fail('Bağ kaldırılamadı'))} />}
        </View>
        <Text style={styles.tiny}>
          {[r.single ? 'Tek görev' : `${r.items.length} görev`, times.length ? (times.length > 1 && times[0] !== times[times.length - 1] ? `${times[0]}–${times[times.length - 1]}` : times[0]) : ''].filter(Boolean).join(' · ')}
        </Text>
        <View style={[styles.pill, { backgroundColor: pill.bg }]}><Text style={[styles.pillText, { color: pill.fg }]}>{pill.t}</Text></View>
        {rate && rate.planned > 0 && (
          <>
            <View style={styles.bar}><View style={[styles.fill, { width: `${rate.rate ?? 0}%` }]} /></View>
            <Text style={styles.tiny}>Son 7 gün %{rate.rate} · {rate.approved}/{rate.planned} onaylı (ebeveyn kaydı, puan değil)</Text>
          </>
        )}
        {(draftChange || pendingChange) && (
          <Text style={[styles.tiny, { color: colors.medium.fg }]}>{draftChange ? 'Değişiklik taslağı · gönderilmedi' : 'Değişiklik önerildi · ebeveyn kararı bekleniyor'}</Text>
        )}
        <View style={styles.miniActions}>
          {r.state === 'added' && r.tasks.length > 0 && (changeOn || r.changes.length > 0)
            && <SmallButton label={r.changes.length ? 'Değişikliği düzenle' : 'Değişiklik öner'} onPress={() => openEdit(r)} />}
          {(r.state === 'draft' || r.state === 'pending') && <SmallButton label="Düzenle" onPress={() => openEdit(r)} />}
          {(r.state === 'draft' || r.state === 'pending') && <SmallButton label={r.state === 'draft' ? 'Sil' : 'Geri çek'} danger onPress={() => withdrawGroup(r)} />}
        </View>
      </DragView>
    );
  };

  const goalColumn = (g: PlanGoal) => {
    const ratings = Object.fromEntries(g.ratings.map((r) => [r.week, r.rating]));
    const cur = ratings[week];
    const kv: [string, string][] = [
      ['Ölçüm', measureLabel(g.measure)], ['Başlangıç', g.baseline || '—'], ['Hedef', g.target || '—'],
      ['Süre', g.weeks ? `${g.weeks} hafta` : '—'],
    ];
    return (
      <View style={{ gap: 8 }}>
        <View style={styles.kv}>
          {kv.map(([k, v]) => (
            <View key={k} style={styles.kvItem}><Text style={styles.kvKey}>{k}</Text><Text style={styles.kvVal}>{v}</Text></View>
          ))}
        </View>
        {!!g.home_support && <Text style={styles.small}>Evde: {g.home_support}</Text>}
        <View style={styles.inline}>
          <Switch value={g.shared} onValueChange={(v) => act(updateGoal(g.id, { shared: v }))} trackColor={{ true: colors.navy }}
            accessibilityLabel="Aile bu hedefi görür" />
          <Text style={styles.small}>{g.shared ? 'Aile görür' : 'Yalnız sende'}</Text>
        </View>
        <View style={styles.seg}>
          {GOAL_STATUS.map((s) => (
            <Pressable key={s.id} onPress={() => g.status !== s.id && act(updateGoal(g.id, { status: s.id }))} style={[styles.segItem, g.status === s.id && styles.segOn]}
              accessibilityRole="radio" accessibilityState={{ selected: g.status === s.id }}>
              <Text style={[styles.segText, g.status === s.id && styles.segTextOn]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.colSub}>{which === 'this' ? 'Bu haftanın' : 'Geçen haftanın'} değerlendirmesi (GAS, aile görmez)</Text>
        <View style={styles.scale}>
          {[-2, -1, 0, 1, 2].map((v) => (
            <Pressable key={v} onPress={() => act(rateGoal(client.clinic_id, g.id, week, v), 'Puan kaydedilemedi', false)} accessibilityLabel={GAS_LABELS[v]}
              style={[styles.scaleBtn, cur === v && styles.scaleOn]}>
              <Text style={[styles.scaleNum, cur === v && { color: '#fff' }]}>{v > 0 ? `+${v}` : v}</Text>
            </Pressable>
          ))}
        </View>
        {cur !== undefined && <Text style={styles.tiny}>{GAS_LABELS[cur]}</Text>}
        {g.ratings.length > 1 && <GasLine weeks={weeks} ratings={ratings} height={90} width={300} />}
      </View>
    );
  };

  const programColumn = (g: PlanGoal) => {
    const mods = modsOf(g.id);
    const want = (GOAL_TEMPLATES.find((x) => x.key === g.template_key)?.modules ?? [])
      .filter((k) => !mods.some((m) => m.template_key === k));
    const loose = unlinkedMods.slice(0, 4);
    return (
      <View style={{ gap: 8 }}>
        {!linkOK && <Text style={styles.tiny}>Programı hedefe bağlamak için veritabanı güncellemesi bekleniyor; programlar aşağıda "Bir hedefe bağlı olmayanlar"da.</Text>}
        {mods.map((m) => moduleMini(m, g.id))}
        {!mods.length && linkOK && <Text style={styles.empty}>Bu hedefe bağlı program yok.</Text>}
        {linkOK && want.length > 0 && (
          <View style={styles.sugg}>
            <Text style={styles.suggLead}>Öneriler</Text>
            {want.map((k) => (
              <Pressable key={k} onPress={() => addTemplateModule(k, g.id)} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText}>+ {MODULE_TEMPLATES.find((m) => m.key === k)?.title ?? k}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {linkOK && loose.length > 0 && (
          <View style={styles.sugg}>
            <Text style={styles.suggLead}>Bağlı değil</Text>
            {loose.map((m) => (
              <Pressable key={m.id} onPress={() => act(linkModuleGoals(client.clinic_id, [[m.id, g.id]]), 'Bağlanamadı')} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText}>↳ {short(m.title, 26)}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable onPress={() => setModuleSheet({ goalId: g.id })} style={styles.add} accessibilityRole="button">
          <Text style={styles.addText}>+ Program ekle</Text>
        </Pressable>
      </View>
    );
  };

  const routineColumn = (g: PlanGoal) => {
    const rts = rtsOf(g.id);
    const themes = DOMAIN_THEMES[g.domain] ?? [];
    const offer = themes.map((th) => ROUTINES.find((r) => r.theme === th && fitsAge(r, band))).filter((r): r is Routine => !!r)
      .filter((r) => !rts.some((x) => x.routine?.key === r.key));
    const loose = unlinkedRts.slice(0, 4);
    return (
      <View style={{ gap: 8 }}>
        {rts.map(routineMini)}
        {!rts.length && <Text style={styles.empty}>Bu hedefe bağlı rutin yok.</Text>}
        {offer.length > 0 && (
          <View style={styles.sugg}>
            <Text style={styles.suggLead}>{band ? `Öneriler · ${AGE_LABEL[band]} yaş` : 'Öneriler'}</Text>
            {offer.map((r) => (
              <Pressable key={r.key} onPress={() => setRtSheet({ routine: r, goalId: g.id })} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText}>+ {r.title}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {loose.length > 0 && (
          <View style={styles.sugg}>
            <Text style={styles.suggLead}>Bağlı değil</Text>
            {loose.map((r) => (
              <Pressable key={r.key} onPress={() => setRoutineGoal(r, g.id).catch(fail('Bağlanamadı'))} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText}>↳ {short(r.title, 26)}</Text>
              </Pressable>
            ))}
          </View>
        )}
        <Pressable onPress={() => setPick(g.id)} style={styles.add} accessibilityRole="button">
          <Text style={styles.addText}>+ Rutin ya da görev bağla</Text>
        </Pressable>
      </View>
    );
  };

  const hatSummary = (g: PlanGoal) => {
    const mods = modsOf(g.id);
    const act7 = mods.filter((m) => m.status === 'active' && pub?.modules[m.id]);
    const days = act7.reduce((n, m) => n + logSummary(logs, m.id, 7).practiced, 0);
    const rts = rtsOf(g.id);
    const ids = rts.flatMap((r) => r.tasks.map((t) => t.id));
    const rate = ids.length ? taskSetRate(data.tasks, data.completions, ids, today) : null;
    const last = [...g.ratings].sort((a, b) => a.week.localeCompare(b.week)).pop();
    return [
      { k: 'p', b: `${mods.length} program`, s: act7.length ? `uygulama ${days}/${act7.length * 7} gün` : mods.length ? 'aileye kapalı' : '—' },
      { k: 'r', b: `${rts.length} rutin`, s: rate && rate.planned ? `son 7 gün %${rate.rate}` : rts.some((r) => r.state === 'pending') ? 'karar bekliyor' : rts.some((r) => r.state === 'draft') ? 'taslak' : '—' },
      { k: 'g', b: `GAS ${last ? (last.rating > 0 ? `+${last.rating}` : last.rating) : '—'}`, s: g.ratings.some((r) => r.week === thisWeek) ? 'bu hafta girildi' : 'bu hafta girilmedi' },
    ];
  };

  const hat = (g: PlanGoal, i: number) => {
    const open = isOpen(g.id);
    const color = GOAL_COLORS[i % GOAL_COLORS.length];
    const meta = [g.domain && domainLabel(g.domain), `${g.baseline || '—'} → ${g.target || '—'}`, g.weeks ? `${g.weeks} hafta` : '',
      g.status !== 'active' ? GOAL_STATUS.find((s) => s.id === g.status)?.label : '', g.shared ? '' : 'yalnız sende'].filter(Boolean).join(' · ');
    const dirty = hatUnsent(g);
    const hatButtons = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <IconButton name="ellipsis-horizontal" label="Diğer işlemler" size={18} onPress={() => hatMenu(g)} />
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </View>
    );
    return (
      <DropView key={g.id} accept={['module', 'routine', 'libmod', 'librt']} onDrop={onDropHat(g.id)} style={[styles.hat, { borderLeftColor: color }]}>
        <Pressable onPress={() => toggle(g.id)} style={[styles.hatLine, !cols3 && { flexDirection: 'column', alignItems: 'stretch' }]}
          accessibilityRole="button" accessibilityState={{ expanded: open }}>
          <View style={{ flex: cols3 ? 1 : undefined, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.hatTitle}>{g.title}</Text>
              <Text style={styles.small}>{meta}</Text>
              {dirty && <Text style={[styles.tiny, { color: colors.medium.fg, fontWeight: '700' }]}>Aileye gönderilmedi</Text>}
            </View>
            {!cols3 && hatButtons}
          </View>
          <View style={styles.cells}>
            {hatSummary(g).map((c) => (
              <View key={c.k} style={[styles.cell, !cols3 && { flex: 1, minWidth: 0 }]}><Text style={styles.cellB}>{c.b}</Text><Text style={styles.tiny}>{c.s}</Text></View>
            ))}
          </View>
          {cols3 && hatButtons}
        </Pressable>
        {open && (
          <View style={[styles.hatBody, cols3 && { flexDirection: 'row', alignItems: 'flex-start' }]}>
            <View style={[styles.col, cols3 && styles.col3]}>
              <ColHead q="Neyi değiştiriyoruz, nasıl anlayacağız?" info={[
                'Hedef: uzman yazar ve değerlendirir.',
                '"Aile görür" açıksa hedefin adı, düzeyleri ve açıklaması aileye gider; GAS değerlendirmen aileye gitmez.',
              ]} />
              {goalColumn(g)}
            </View>
            <View style={[styles.col, cols3 && styles.col3]}>
              <ColHead q="Ebeveyn evde nasıl destekler?" info={[
                'Aile programı: ebeveyn evde uygular, "Bugün uyguladım" der.',
                'Aile yalnız Etkin ve Tamamlandı programları görür; Planlandı aileye gitmez.',
                'Bir program birden çok hedefe bağlanabilir.',
                ...(isWeb && desktop ? ['Kitaplıktan bir programı bu hedefin üstüne sürükleyip bırakabilirsin.'] : []),
              ]} />
              {programColumn(g)}
            </View>
            <View style={[styles.col, cols3 && styles.col3]}>
              <ColHead q="Her gün, hangi anda, hangi adımlarla?" info={[
                'Rutin ve görevler: çocuk yapar, ebeveyn onaylar.',
                'Buradan eklenenler taslaktır; "Aileye gönder" deyince aileye gider.',
                'Oranlar ebeveynin onay kaydıdır, puan değildir.',
              ]} />
              {routineColumn(g)}
            </View>
          </View>
        )}
      </DropView>
    );
  };

  // dar ekranda kitaplık penceresi önce kapanır
  const fromLib = (f: () => void) => { if (showLib) f(); else { setLibOpen(false); later(f); } };
  const library = (
    <Library band={band} goals={goals} target={libTarget} onTarget={setFocus} tpls={tpls} ownRoutines={ownRoutines} meId={me.id} owner={me.role === 'owner'}
      onGoal={(g) => fromLib(() => addGoalFromTemplate(g))}
      onPackage={(p) => fromLib(() => addPackage(p).then(() => Alert.alert('Paket eklendi', `${p.title}: hedefler ve programlar eklendi. Gözden geçir, sonra "Aileye gönder".`))
        .catch(fail('Paket eklenemedi')))}
      onModule={(k) => fromLib(() => addTemplateModule(k, libTarget))}
      onRoutine={(r) => fromLib(() => setRtSheet({ routine: r, goalId: libTarget }))}
      onTemplate={(t) => fromLib(() => applyTemplate(t))}
      onTemplateMenu={(t) => Alert.alert(t.title, t.shared ? 'Ekibine açık' : 'Yalnız sende', [
        ...(t.created_by === me.id || me.role === 'owner' ? [
          { text: t.shared ? 'Yalnız bende kalsın' : 'Ekibime aç', onPress: () => updatePlanTemplate(t.id, { shared: !t.shared }).then(loadLibrary).catch(fail('Kaydedilemedi')) },
          { text: 'Sil', style: 'destructive' as const, onPress: () => deletePlanTemplate(t.id).then(loadLibrary).catch(fail('Silinemedi')) },
        ] : []),
        { text: 'Kapat', style: 'cancel' as const },
      ])} />
  );

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)}>
      <View style={styles.toolbar}>
        <IconButton name={help ? 'information-circle' : 'information-circle-outline'} label="Takip Planı nasıl çalışır?" size={20} onPress={() => setHelp((v) => !v)} />
        <SmallButton label={desktop && width >= 980 ? (libOpen ? 'Kitaplığı gizle' : 'Kitaplık') : 'Kitaplık'} onPress={() => setLibOpen((v) => !v)} />
        {goals.length > 1 && (
          <SmallButton label={(openIds ?? []).length >= goals.length ? 'Hepsini kapat' : 'Hepsini aç'}
            onPress={() => setOpenIds((openIds ?? []).length >= goals.length ? [] : goals.map((g) => g.id))} />
        )}
        <SmallButton label="+ Hedef" onPress={() => setGoalSheet({})} />
        <View style={{ flex: 1 }} />
        {goals.length > 0 && (
          <View style={{ minWidth: 200 }}>
            <Segmented options={[{ id: 'this' as const, label: 'Bu hafta' }, { id: 'last' as const, label: 'Geçen hafta' }]} value={which} onChange={setWhich} />
          </View>
        )}
        <Pressable onPress={publish} disabled={busy} style={[styles.send, !unsent && styles.sendQuiet, busy && { opacity: 0.6 }]} accessibilityRole="button">
          {busy ? <ActivityIndicator color={unsent ? '#fff' : colors.navy} /> : (
            <>
              <Ionicons name="paper-plane-outline" size={16} color={unsent ? '#fff' : colors.navy} />
              <Text style={[styles.sendText, !unsent && { color: colors.navy }]}>Aileye gönder{unsent ? ` (${unsent})` : ''}</Text>
            </>
          )}
        </Pressable>
      </View>
      {help && (
        <View style={styles.infoBox}>
          {[
            'Her hedef bir satır: hedef · ailenin evdeki programı · çocuğun rutini ve görevleri. Satıra dokununca açılır.',
            'Eklediklerin taslaktır; aile, sen "Aileye gönder" deyince tek bildirimle görür.',
            'Takip Planı gözlem toplar, tanı koymaz.',
          ].map((t) => <Text key={t} style={styles.infoLine}>• {t}</Text>)}
        </View>
      )}
      {attention.length > 0 && (
        <View style={styles.attention}>
          {attention.slice(0, 4).map((a, i) => (
            <Pressable key={i} onPress={a.onPress} disabled={!a.onPress} style={[styles.att, a.tone === 'warn' && styles.attWarn]} accessibilityRole={a.onPress ? 'button' : undefined}>
              <Ionicons name={a.icon} size={14} color={a.tone === 'warn' ? colors.medium.fg : colors.navy} />
              <Text style={[styles.attText, a.tone === 'warn' && { color: colors.medium.fg }]}>{a.text}</Text>
            </Pressable>
          ))}
        </View>
      )}

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 16 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <DropView accept={['libgoal', 'libpkg', 'libtpl']} onDrop={onDropPlan} style={{ gap: 10 }}>
            {goals.map(hat)}
            {goals.length === 0 && (
              <View style={styles.placeholder}>
                <Text style={styles.hatTitle}>{client.child_name || 'Danışan'} için henüz takip planı yok.</Text>
                <Text style={styles.small}>
                  Bir paketle, hazır bir hedefle{tpls?.length ? ' ya da kendi şablonunla' : ''} başla.{isWeb && desktop ? ' Kitaplıktan buraya sürükleyip bırakabilirsin.' : ''}
                </Text>
                <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 }}>
                  <SmallButton label="Hazır paketle başla" onPress={() => setPkgOpen(true)} />
                  <SmallButton label="+ Hedef ekle" onPress={() => setGoalSheet({})} />
                  {!!tpls?.length && <SmallButton label="Şablonlarım" onPress={() => setLibOpen(true)} />}
                </View>
              </View>
            )}
          </DropView>

          {(unlinkedMods.length > 0 || unlinkedRts.length > 0) && (
            <DropView accept={['module', 'routine']} onDrop={onDropUnlinked} style={styles.unlinked}>
              <ColHead q="Bir hedefe bağlı olmayanlar" info={[isWeb && desktop
                ? 'Kartı bir hedefin üstüne sürükle; bağı kaldırmak için kartı buraya bırak.'
                : '"Hedefe bağla" ile bir hedefin altına al.']} />
              <View style={styles.looseGrid}>
                {unlinkedMods.map((m) => (
                  <View key={m.id} style={styles.looseItem}>
                    {moduleMini(m, null)}
                    {linkOK && goals.length > 0 && <SmallButton label="Hedefe bağla" onPress={() => pickGoal(m.title, (gid) => act(linkModuleGoals(client.clinic_id, [[m.id, gid]]), 'Bağlanamadı'))} />}
                  </View>
                ))}
                {unlinkedRts.map((r) => (
                  <View key={r.key} style={styles.looseItem}>
                    {routineMini(r)}
                    {goals.length > 0 && <SmallButton label="Hedefe bağla" onPress={() => pickGoal(r.title, (gid) => { setRoutineGoal(r, gid).catch(fail('Bağlanamadı')); })} />}
                  </View>
                ))}
              </View>
            </DropView>
          )}
          {otherSingles > 0 && (
            <Text style={[styles.tiny, { marginTop: 8 }]}>Hedefe bağlı olmayan {otherSingles} tek görev daha ailede ekli; Ev Rutinleri'nde görünür.</Text>
          )}

          {archived.length > 0 && (
            <View style={{ marginTop: 14, gap: 8 }}>
              <View style={{ alignSelf: 'flex-start' }}>
                <SmallButton label={showArchived ? 'Arşivi gizle' : `Arşiv (${archived.length})`} onPress={() => setShowArchived((v) => !v)} />
              </View>
              {showArchived && archived.map((g) => (
                <View key={g.id} style={styles.archRow}>
                  <Text style={[styles.small, { flex: 1 }]}>{g.title} · {g.ratings.length} değerlendirme</Text>
                  <SmallButton label="Geri al" onPress={() => act(updateGoal(g.id, { archived: false }))} />
                </View>
              ))}
            </View>
          )}
        </View>
        {showLib && <View style={styles.libPanel}>{library}</View>}
      </View>

      {/* dar ekranda kitaplık ayrı pencerede */}
      <Modal visible={!!libOpen && !showLib} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setLibOpen(false)}>
        <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
          <View style={styles.sheetHeader}>
            <IconButton name="close" label="Kapat" onPress={() => setLibOpen(false)} />
            <Text style={styles.sheetTitle}>Kitaplık</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 60 }}>{library}</ScrollView>
        </SafeAreaView>
      </Modal>

      {goalSheet && (
        <GoalSheet editing={goalSheet.editing} legacy={false} onClose={() => setGoalSheet(null)}
          onSave={async (input) => {
            if (goalSheet.editing) await updateGoal(goalSheet.editing.id, input);
            else {
              const [gid] = await addGoals(target, [{ ...input, position: plan.goals.length }]);
              if (gid) openHat(gid);
            }
            track('plan.goal', { edit: !!goalSheet.editing });
            setGoalSheet(null);
            await after();
          }} />
      )}
      {moduleSheet && (
        <ModuleSheet editing={moduleSheet.editing} onClose={() => setModuleSheet(null)}
          onSave={async (input) => {
            if (moduleSheet.editing) await updateModule(moduleSheet.editing.id, input);
            else {
              const [id] = await addModules(target, [{ ...input, position: plan.modules.length }]);
              if (id && moduleSheet.goalId && linkOK) await linkModuleGoals(client.clinic_id, [[id, moduleSheet.goalId]]);
            }
            track('plan.module', { edit: !!moduleSheet.editing, goal: !!moduleSheet.goalId });
            setModuleSheet(null);
            await after();
          }} />
      )}
      {pkgOpen && (
        <PackageSheet onClose={() => setPkgOpen(false)}
          onApply={async (p, goalKeys) => { await addPackage(p, goalKeys); setPkgOpen(false); }} />
      )}
      <RoutineSheet routine={rtSheet?.routine ?? null} childName={client.child_name} band={band} taken={taken} goals={richGoals}
        initialGoal={rtSheet?.goalId ?? null} asDraft onClose={() => setRtSheet(null)} onSubmit={submitRoutine} />
      <SuggestionEditor visible={!!taskSheet} childName={client.child_name} editing={taskSheet?.editing ?? null} asDraft
        onClose={() => setTaskSheet(null)} onSubmit={submitTask}
        onWithdraw={taskSheet?.editing ? () => {
          const s = taskSheet.editing!;
          withdrawGroup(groups.find((r) => r.items.some((x) => x.id === s.id)) ?? groupSuggestions([s], [], today)[0]);
        } : undefined} />
      <ChangeSheet target={edit?.target ?? null} onClose={() => setEdit(null)} onSubmit={submitEdit}
        onWithdraw={edit && edit.target.mode !== 'change' ? () => withdrawGroup(edit.group) : undefined} />
      <LinkPicker visible={!!pick} band={band} ownRoutines={ownRoutines} goalTitle={goals.find((g) => g.id === pick)?.title ?? ''}
        loose={unlinkedRts}
        onClose={() => setPick(null)}
        onRoutine={(r) => { const gid = pick; setPick(null); later(() => setRtSheet({ routine: r, goalId: gid })); }}
        onTask={() => { const gid = pick; setPick(null); later(() => setTaskSheet({ goalId: gid, editing: null })); }}
        onLoose={(r) => { const gid = pick; setPick(null); if (gid) setRoutineGoal(r, gid).catch(fail('Bağlanamadı')); }} />
      {tplSave && <TemplateSaveSheet goal={tplSave} modules={modsOf(tplSave.id).length} routines={rtsOf(tplSave.id).filter((r) => r.routine).length}
        onClose={() => setTplSave(null)} onSave={(title, shared) => saveTemplate(tplSave, title, shared)} />}
    </View>
  );
}

/* ---------- Sütun başlığı: kısa başlık + (i); açıklama yalnız (i)'ye dokununca ---------- */
function ColHead({ q, info }: { q: string; info: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <Text style={[styles.colQ, { flexShrink: 1 }]}>{q}</Text>
        <Pressable onPress={() => setOpen((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Açıklama" accessibilityState={{ expanded: open }}>
          <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={16} color={colors.muted} />
        </Pressable>
      </View>
      {open && <View style={styles.infoBox}>{info.map((t) => <Text key={t} style={styles.infoLine}>• {t}</Text>)}</View>}
    </View>
  );
}

/* ---------- Kitaplık ---------- */
type LibTab = 'pkg' | 'goal' | 'mod' | 'rt' | 'tpl';
function Library({ band, goals, target, onTarget, tpls, ownRoutines, meId, owner, onGoal, onPackage, onModule, onRoutine, onTemplate, onTemplateMenu }: {
  band: AgeGroup | null; goals: PlanGoal[]; target: string | null; onTarget: (gid: string) => void;
  tpls: PlanTemplate[] | null; ownRoutines: Routine[]; meId: string; owner: boolean;
  onGoal: (g: GoalT) => void; onPackage: (p: PackageT) => void; onModule: (key: string) => void; onRoutine: (r: Routine) => void;
  onTemplate: (t: PlanTemplate) => void; onTemplateMenu: (t: PlanTemplate) => void;
}) {
  const [tab, setTab] = useState<LibTab>(tpls?.length ? 'tpl' : 'pkg');
  const [domain, setDomain] = useState('');
  const tabs: { id: LibTab; label: string }[] = [
    { id: 'pkg', label: 'Paketler' }, { id: 'goal', label: 'Hedefler' }, { id: 'mod', label: 'Programlar' }, { id: 'rt', label: 'Rutinler' },
    ...(tpls !== null ? [{ id: 'tpl' as const, label: `Şablonlarım${tpls.length ? ` (${tpls.length})` : ''}` }] : []),
  ];
  const needsTarget = tab === 'mod' || tab === 'rt';
  const row = (key: string, payload: string, title: string, sub: string, onAdd: () => void, extra?: React.ReactNode) => (
    <DragView key={key} payload={isWeb ? payload : null} style={styles.libRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={styles.libTitle} numberOfLines={2}>{title}</Text>
        {!!sub && <Text style={styles.tiny} numberOfLines={2}>{sub}</Text>}
      </View>
      {extra}
      <SmallButton label="Ekle" onPress={onAdd} />
    </DragView>
  );
  return (
    <View style={{ gap: 10 }}>
      <View style={styles.libTabs}>
        {tabs.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[styles.libTab, tab === t.id && styles.libTabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === t.id }}>
            <Text style={[styles.libTabText, tab === t.id && { color: '#fff' }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {needsTarget && (
        goals.length ? (
          <View style={{ gap: 4 }}>
            <Text style={styles.tiny}>"Ekle" şu hedefe bağlar:</Text>
            <View style={styles.sugg}>
              {goals.map((g) => (
                <Pressable key={g.id} onPress={() => onTarget(g.id)} style={[styles.chip, target === g.id && styles.chipOn]} accessibilityRole="radio" accessibilityState={{ selected: target === g.id }}>
                  <Text style={[styles.chipText, target === g.id && { color: '#fff' }]}>{short(g.title, 24)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : <Text style={styles.tiny}>Henüz hedef yok: eklediğin bir hedefe bağlı olmaz, sonra bağlayabilirsin.</Text>
      )}
      {isWeb && <Text style={styles.tiny}>İpucu: bir satırı tutup hedefin üstüne sürükleyebilirsin.</Text>}
      {tab === 'pkg' && (
        <View style={{ gap: 6 }}>
          <Text style={styles.tiny}>Paket hem hedefleri hem aile programlarını ekler; programlar ilgili hedeflere bağlı gelir.</Text>
          {PACKAGES.map((p) => row(p.key, `libpkg:${p.key}`, p.title, `${p.goals.length} hedef · ${p.modules.length} program · ${p.weeks} hafta`, () => onPackage(p)))}
        </View>
      )}
      {tab === 'goal' && (
        <View style={{ gap: 6 }}>
          <View style={styles.sugg}>
            {[{ key: '', label: 'Tümü' }, ...DOMAINS].map((d) => (
              <Pressable key={d.key || 'all'} onPress={() => setDomain(d.key)} style={[styles.chip, domain === d.key && styles.chipOn]}>
                <Text style={[styles.chipText, domain === d.key && { color: '#fff' }]}>{d.label}</Text>
              </Pressable>
            ))}
          </View>
          {GOAL_TEMPLATES.filter((g) => !domain || g.domain === domain).map((g) =>
            row(g.key, `libgoal:${g.key}`, g.title, `${domainLabel(g.domain)} · ${g.target} · ${g.modules.length} önerilen program`, () => onGoal(g)))}
        </View>
      )}
      {tab === 'mod' && (
        <View style={{ gap: 6 }}>
          <Text style={styles.tiny}>Kanıta dayalı ebeveyn eğitiminin ortak bileşenlerinden programlar (sistem içeriği; içeriğini düzenleyebilirsin).</Text>
          {MODULE_TEMPLATES.map((m) => row(m.key, `libmod:${m.key}`, m.title, m.aim, () => onModule(m.key)))}
        </View>
      )}
      {tab === 'rt' && (
        <View style={{ gap: 6 }}>
          <Text style={styles.tiny}>{band ? `${AGE_LABEL[band]} yaş rutinleri.` : 'Bütün yaş grupları.'} Rutin taslak olarak eklenir; "Aileye gönder" ile gider.</Text>
          {routinesFor(band).map((r) => row(r.key, `librt:${r.key}`, r.title, `${r.subtitle} · ${r.tasks.length} görev · ${agesText(r.ages)}`, () => onRoutine(r)))}
          {ownRoutines.length > 0 && <Text style={[styles.colSub, { marginTop: 6 }]}>Rutinlerim</Text>}
          {ownRoutines.map((r) => row(r.key, `librt:${r.key}`, r.title, `${r.tasks.length} görev · ${agesText(r.ages)}`, () => onRoutine(r)))}
        </View>
      )}
      {tab === 'tpl' && tpls !== null && (
        <View style={{ gap: 6 }}>
          <Text style={styles.tiny}>Kaydettiğin hedef + programlar + rutinler. Hedef satırındaki ⋯ › "Şablon olarak kaydet" ile eklenir. Çocuğa ait kayıt (değerlendirme, onay, not) şablona girmez.</Text>
          {!tpls.length && <Text style={styles.empty}>Henüz şablonun yok.</Text>}
          {tpls.map((t) => row(t.id, `libtpl:${t.id}`, t.title,
            [`${t.content.modules.length} program`, `${t.content.routines.length} rutin`, t.shared ? (t.created_by === meId ? 'ekibine açık' : 'ekipten') : 'yalnız sende'].join(' · '),
            () => onTemplate(t),
            (t.created_by === meId || owner) ? <IconButton name="ellipsis-horizontal" label="Şablon işlemleri" size={16} onPress={() => onTemplateMenu(t)} /> : null))}
        </View>
      )}
    </View>
  );
}

/* ---------- "+ Rutin ya da görev bağla" ---------- */
function LinkPicker({ visible, band, ownRoutines, goalTitle, loose, onClose, onRoutine, onTask, onLoose }: {
  visible: boolean; band: AgeGroup | null; ownRoutines: Routine[]; goalTitle: string; loose: RGroup[];
  onClose: () => void; onRoutine: (r: Routine) => void; onTask: () => void; onLoose: (r: RGroup) => void;
}) {
  const [tab, setTab] = useState<'catalog' | 'own' | 'loose'>('catalog');
  const [all, setAll] = useState(false);
  const list = tab === 'own' ? ownRoutines : routinesFor(all ? null : band);
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.sheetColumn}>
          <View style={styles.sheetHeader}>
            <IconButton name="close" label="Kapat" onPress={onClose} />
            <View style={{ flex: 1 }}>
              <Text style={styles.sheetTitle}>Rutin ya da görev bağla</Text>
              <Text style={styles.small} numberOfLines={1}>Hedef: {goalTitle}</Text>
            </View>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 60 }}>
            <Segmented options={[
              { id: 'catalog' as const, label: 'Hazır rutinler' }, { id: 'own' as const, label: `Rutinlerim (${ownRoutines.length})` },
              ...(loose.length ? [{ id: 'loose' as const, label: `Bağlı olmayan (${loose.length})` }] : []),
            ]} value={tab} onChange={setTab} />
            {tab !== 'loose' && list.map((r) => (
              <Pressable key={r.key} onPress={() => onRoutine(r)} style={[styles.pickRow, { backgroundColor: r.tint }]} accessibilityRole="button">
                <View style={styles.pickIcon}><Ionicons name={r.icon as keyof typeof Ionicons.glyphMap} size={18} color={colors.navy} /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.libTitle}>{r.title}</Text>
                  <Text style={styles.tiny}>{r.subtitle} · {r.tasks.length} görev · {agesText(r.ages)}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.faint} />
              </Pressable>
            ))}
            {tab === 'own' && !ownRoutines.length && <Text style={styles.empty}>Ev Rutinleri › "+ Aileye öner" › Rutinlerim'den kendi rutinini kurabilirsin.</Text>}
            {tab === 'catalog' && !!band && (
              <Pressable onPress={() => setAll((v) => !v)} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
                <Text style={styles.link}>{all ? `Yalnız ${AGE_LABEL[band]} yaş rutinleri` : 'Bütün yaş gruplarını göster'}</Text>
              </Pressable>
            )}
            {tab === 'loose' && loose.map((r) => (
              <Pressable key={r.key} onPress={() => onLoose(r)} style={styles.pickRow} accessibilityRole="button">
                <Text style={{ fontSize: 18 }}>{r.single ? r.emoji : '🔁'}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.libTitle}>{r.title}</Text>
                  <Text style={styles.tiny}>{r.single ? 'Tek görev' : `${r.items.length} görev`} · {r.state === 'added' ? 'ailede ekli' : r.state === 'pending' ? 'karar bekliyor' : 'taslak'}</Text>
                </View>
                <Text style={styles.link}>Bağla</Text>
              </Pressable>
            ))}
            <Pressable onPress={onTask} style={[styles.pickRow, styles.pickTask]} accessibilityRole="button">
              <Ionicons name="add-circle-outline" size={20} color={colors.navy} />
              <View style={{ flex: 1 }}>
                <Text style={styles.libTitle}>Tek görev öner</Text>
                <Text style={styles.tiny}>298 görevlik katalogdan ya da kendin yaz; taslak olarak bu hedefe bağlanır</Text>
              </View>
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/* ---------- Şablon olarak kaydet ---------- */
function TemplateSaveSheet({ goal, modules, routines, onClose, onSave }: {
  goal: PlanGoal; modules: number; routines: number; onClose: () => void; onSave: (title: string, shared: boolean) => Promise<void>;
}) {
  const [title, setTitle] = useState(short(goal.title, 80));
  const [shared, setShared] = useState<'me' | 'team'>('me');
  const [busy, setBusy] = useState(false);
  const save = async () => {
    if (!title.trim()) return Alert.alert('Şablona bir ad ver');
    setBusy(true);
    try { await onSave(title.trim(), shared === 'team'); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.sheetColumn}>
          <View style={styles.sheetHeader}>
            <IconButton name="close" label="Kapat" onPress={onClose} />
            <Text style={styles.sheetTitle}>Şablon olarak kaydet</Text>
          </View>
          <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
            <Text style={styles.small}>
              Hedef, bağlı {modules} program ve {routines} rutin kaydedilir. Çocuğa ait kayıtlar (değerlendirme, onay, not) şablona girmez.
              Başka bir danışana Kitaplık › Şablonlarım'dan tek hamlede uygularsın; rutinler o çocuğun yaşına uyan sürümle gelir.
            </Text>
            <Text style={styles.colSub}>Şablonun adı</Text>
            <Input value={title} onChangeText={setTitle} maxLength={80} placeholder="Ör. Sabah seti · 6–8 yaş" />
            <Text style={styles.colSub}>Kim kullanabilir?</Text>
            <Segmented options={[{ id: 'me' as const, label: 'Yalnız ben' }, { id: 'team' as const, label: 'Ekibim' }]} value={shared} onChange={setShared} />
            <Text style={styles.tiny}>Ekibine açarsan kliniğindeki uzmanlar kullanabilir, düzenleyemez.</Text>
            <Pressable onPress={save} disabled={busy} style={[styles.cta, busy && { opacity: 0.6 }]} accessibilityRole="button">
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.ctaText}>Kaydet</Text>}
            </Pressable>
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  intro: { fontSize: 13, color: colors.muted, lineHeight: 19, marginTop: 8 },
  toolbar: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginTop: 12, marginBottom: 10 },
  send: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 38, paddingHorizontal: 14, borderRadius: radius.pill, backgroundColor: colors.navy },
  sendQuiet: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  sendText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  attention: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 10 },
  att: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line },
  attWarn: { backgroundColor: colors.medium.bg, borderColor: colors.medium.bg },
  attText: { fontSize: 12, fontWeight: '600', color: colors.navy },
  hat: { backgroundColor: '#fff', borderRadius: radius.md, borderLeftWidth: 5, overflow: 'hidden' },
  hatLine: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, flexWrap: 'wrap' },
  hatTitle: { fontSize: 15, fontWeight: '700', color: colors.navy },
  cells: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  cell: { backgroundColor: colors.bg, borderRadius: radius.sm, paddingHorizontal: 10, paddingVertical: 6, minWidth: 96 },
  cellB: { fontSize: 12, fontWeight: '700', color: colors.navy },
  hatBody: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line, padding: 12, gap: 12 },
  col: { gap: 6 },
  col3: { flex: 1, minWidth: 0, paddingHorizontal: 4 },
  colQ: { fontSize: 13, fontWeight: '700', color: colors.navy },
  colSub: { fontSize: 11, fontWeight: '600', color: colors.muted, textTransform: 'none' },
  kv: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  kvItem: { backgroundColor: colors.bg, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5, minWidth: 80 },
  kvKey: { fontSize: 10, color: colors.muted },
  kvVal: { fontSize: 13, fontWeight: '600', color: colors.navy },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  seg: { flexDirection: 'row', backgroundColor: '#ECEEF3', borderRadius: 8, padding: 2, alignSelf: 'flex-start', flexWrap: 'wrap' },
  segItem: { paddingVertical: 5, paddingHorizontal: 8, borderRadius: 6 },
  segOn: { backgroundColor: '#fff' },
  segText: { fontSize: 11, fontWeight: '600', color: colors.muted },
  segTextOn: { color: colors.navy, fontWeight: '700' },
  scale: { flexDirection: 'row', gap: 4 },
  scaleBtn: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  scaleOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  scaleNum: { fontSize: 13, fontWeight: '700', color: colors.navy },
  mini: { backgroundColor: '#FAFBFC', borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, padding: 10, gap: 6 },
  miniHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  miniTitle: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.navy },
  miniActions: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  pill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  pillText: { fontSize: 11, fontWeight: '700' },
  bar: { height: 5, borderRadius: 3, backgroundColor: colors.line, overflow: 'hidden' },
  fill: { height: 5, backgroundColor: colors.ok },
  sugg: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  suggLead: { fontSize: 11, color: colors.muted, marginRight: 2 },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  chipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  chipText: { fontSize: 12, fontWeight: '600', color: colors.navy },
  add: { backgroundColor: '#EEF0F4', borderRadius: radius.sm, paddingVertical: 8, alignItems: 'center' },
  addText: { fontSize: 12, fontWeight: '600', color: colors.navy },
  infoBox: { backgroundColor: '#F3F5FA', borderRadius: radius.sm, padding: 10, gap: 4, marginTop: 4 },
  infoLine: { fontSize: 12, color: colors.text, lineHeight: 17 },
  empty: { fontSize: 12, color: colors.muted, fontStyle: 'italic' },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  tiny: { fontSize: 11, color: colors.muted, lineHeight: 15 },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  placeholder: { backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1.5, borderStyle: 'dashed', borderColor: colors.faint, padding: 18, gap: 6 },
  unlinked: { marginTop: 14, backgroundColor: '#F1F3F7', borderRadius: radius.md, padding: 12, gap: 10, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint },
  looseGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  looseItem: { width: 260, maxWidth: '100%', gap: 6 },
  archRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.sm, padding: 10 },
  libPanel: { width: 300, backgroundColor: '#fff', borderRadius: radius.md, padding: 12, borderWidth: 1, borderColor: colors.line },
  libTabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  libTab: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#ECEEF3' },
  libTabOn: { backgroundColor: colors.navy },
  libTabText: { fontSize: 12, fontWeight: '600', color: colors.navy },
  libRow: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  libTitle: { fontSize: 13, fontWeight: '600', color: colors.navy },
  grab: { cursor: 'grab' } as object,
  dropOver: { borderColor: colors.navy, backgroundColor: '#EEF3FC' },
  safe: { flex: 1, backgroundColor: colors.bg },
  sheetColumn: { flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  sheetTitle: { fontSize: 17, fontWeight: '700', color: colors.navy },
  pickRow: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: radius.md, backgroundColor: '#fff' },
  pickIcon: { width: 32, height: 32, borderRadius: 9, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  pickTask: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint },
  cta: { height: 50, borderRadius: radius.md, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center', marginTop: 6 },
  ctaText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
