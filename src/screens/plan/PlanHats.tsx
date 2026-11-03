import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Input, Notice, SmallButton, IconButton, Segmented } from '../../components/ui';
import { weekStarts, taskSetRate, Task } from '../../lib/metrics';
import { track } from '../../lib/track';
import { todayISO } from '../../dates';
import {
  PlanTarget, PlanGoal, PlanModule, ModuleLog, ModuleGoals, ModuleInput, PlanTemplate, GoalT, PackageT, Published, GoalStatus, ModuleStatus,
  DOMAINS, GOAL_TEMPLATES, MODULE_TEMPLATES, PACKAGES, domainLabel, measureLabel,
  loadPlan, loadLogs, loadModuleGoals, linkModuleGoals, unlinkModuleGoal, addGoals, updateGoal, addModules, updateModule, deleteModule,
  rateGoal, applyPackage, goalFromTemplate, moduleFromTemplate, logSummary, publishPlan, publishPlanSelected, listPlanTemplates, savePlanTemplate,
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
import { RGroup, PubItem, groupSuggestions, visibleGroup, goalUnsent, moduleUnsent, goalWeek, lastRating, reviewDue, publishItems, goalSnapshot, moduleSnapshot } from '../../lib/planCore';
import { useLayout } from '../../lib/layout';
import { useClientConfig } from '../../lib/clientConfig';
import RoutineSheet, { RoutineGoal } from '../client/RoutineSheet';
import SuggestionEditor from '../client/SuggestionEditor';
import ChangeSheet, { EditTarget, EditResult } from './ChangeSheet';
import PlanEditor, { GoalSheet, ModuleSheet, PackageSheet } from './PlanEditor';
import EvaluateSheet, { dayMonth } from './EvaluateSheet';
import PublishSheet from './PublishSheet';
import { PRIVATE, HEAD, STATUS_TONE } from './tones';
import type { ClientCtx } from '../client/ClientScreen';
import type { SamplePlan } from '../../lib/sample';
import { FamilySees } from '../HelpSheet';
import { CoachTarget, CoachBanner, useCoachEmit } from '../../lib/coach';

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

// preset: örnek aile (ilk kullanım "Ö1", 3 Kasım 2026) — aynı ekran, veri cihazda. Deneme alanı: hedef ekle, önerilen rutini taslak
// olarak bağla, Aileye gönder (özet), Değerlendir yerel durumda çalışır (yaptırarak öğreten tur bunları kullanır; olaylar
// useCoachEmit). Öteki düzenlemeler gizli ya da "örnek" der; sunucuya hiçbir şey gitmez, örnek kapanınca sıfırlanır.
export default function PlanHats({ client, me, data, today, reload, preset }: Pick<ClientCtx, 'client' | 'me' | 'data' | 'today' | 'reload'> & { preset?: SamplePlan }) {
  const target: PlanTarget = { kind: 'link', linkId: client.link_id, clinicId: client.clinic_id };
  const ro = !!preset;
  const emit = useCoachEmit();
  const localId = () => `local-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
  const sampleOnly = () => Alert.alert('Örnek aile', 'Bu bir örnek: burada bir şey değişmez ve aileye gitmez. Gerçek bir ailede bu düğme çalışır.');
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
  const [libOpen, setLibOpen] = useState<boolean | null>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [help, setHelp] = useState(false);
  const [evalSheet, setEvalSheet] = useState<{ goal: PlanGoal; status?: GoalStatus } | null>(null);
  const [pubItems, setPubItems] = useState<PubItem[] | null>(null);
  const [tabOf, setTabOf] = useState<Record<string, 'goal' | 'mod' | 'rt'>>({});   // dar ekranda açık hedefin sekmesi (L2)
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
    if (preset) {
      setPlan({ goals: preset.goals, modules: preset.modules, legacy: false });
      setSugg(preset.suggestions); setLogs(preset.logs); setLinks(preset.links); setPub(preset.pub);
      return;
    }
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
  }, [client.link_id, preset]); // eslint-disable-line react-hooks/exhaustive-deps
  const loadLibrary = useCallback(() => {
    if (ro) return;
    listPlanTemplates().then(setTpls).catch(() => setTpls(null));
    listOwnRoutines().then(setOwn).catch(() => setOwn(null));
  }, [ro]);
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
  const showLib = !ro && desktop && !!libOpen && width >= 980;
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
    if (ro) {
      const at = new Date().toISOString();
      const add: Suggestion[] = list.map((x) => ({
        ...x, id: localId(), status: 'draft', created_at: at, updated_at: null, decided_at: null, task_title: null, task_id: null,
        kind: 'new', target_task_id: null, change_remove: false, routine: x.routine ?? null, goal_id: x.goal_id ?? null,
      }));
      setSugg((cur) => [...cur, ...add]);
      setRtSheet(null);
      emit('routine_added');
      return;
    }
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

  const hatMenu = (g: PlanGoal) => ro ? sampleOnly() : Alert.alert(short(g.title, 60), undefined, [
    { text: 'Hedefi düzenle', onPress: () => setGoalSheet({ editing: g }) },
    { text: 'Değerlendir', onPress: () => setEvalSheet({ goal: g }) },
    // D1: "Aile görür" anahtarı satırdan menüye taşındı; kapalıysa başlıkta "Yalnız sende"
    { text: g.shared ? 'Aileden gizle' : 'Aileye göster', onPress: () => act(updateGoal(g.id, { shared: !g.shared })) },
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
        title: tg.title, description: [tg.description, tg.home_support].filter(Boolean).join('\n').slice(0, 600), domain: tg.domain ?? '',
        measure: tg.measure ?? 'level', baseline: '', target: tg.target ?? '', weeks: tg.weeks ?? null, home_support: '', shared: true, status: 'active',
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

  // G1: önce özet; eski sunucuda (gönderilmiş sürüm okunamıyor) hepsi birden gider
  const sendItems = pub ? publishItems({ goals: plan.goals, modules: plan.modules, groups, changes: sugg, pub, links }) : null;
  const openPublish = () => {
    if (!sendItems) return void publish([]);
    if (!sendItems.length) return Alert.alert('Gönderilecek yeni bir şey yok', 'Aile planın son gönderdiğin hâlini görüyor.');
    setPubItems(sendItems);
  };
  const publish = async (hold: string[]) => {
    if (ro) {
      // örnek: gönderilmiş sürüm yerelde güncellenir; taslaklar "ebeveyn kararı bekleniyor" olur
      const shared = new Set(plan.goals.filter((g) => g.shared && !g.archived).map((g) => g.id));
      setPub((p) => {
        const next = { goals: { ...(p?.goals ?? {}) }, modules: { ...(p?.modules ?? {}) } };
        plan.goals.filter((g) => !hold.includes(g.id)).forEach((g) => { next.goals[g.id] = goalSnapshot(g); });
        plan.modules.filter((m) => !hold.includes(m.id)).forEach((m) => {
          const snap = moduleSnapshot(m);
          next.modules[m.id] = snap && { ...snap, goal_ids: (links?.[m.id] ?? []).filter((id) => shared.has(id)) };
        });
        return next;
      });
      setSugg((cur) => cur.map((x) => (x.status === 'draft' && !hold.includes(x.id) ? { ...x, status: 'pending' } : x)));
      setPubItems(null);
      emit('published');
      return;
    }
    setBusy(true);
    try {
      await (pub ? publishPlanSelected(client.link_id, hold) : publishPlan(client.link_id));
      track('plan.publish', { drafts: draftUnits, plan: unsentPlan, held: hold.length });
      setLocalDirty(false);
      setPubItems(null);
      await load();
      Alert.alert(hold.length ? 'Seçilenler aileye gönderildi' : 'Aileye gönderildi',
        `Ebeveyn tek bildirim alır; plan ve öneriler ParentApp › Uzmanım › (senin adın) bölümünde.${hold.length ? ' Beklettiklerin planda "gönderilmedi" olarak kalır.' : ''}`);
    } catch (e) {
      Alert.alert('Gönderilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  // A1 + S1: değerlendirme ve durum
  const saveEval = async (g: PlanGoal, rating: number | null, status: GoalStatus) => {
    if (ro) {
      setPlan((p) => p && ({ ...p, goals: p.goals.map((x) => (x.id !== g.id ? x : {
        ...x, status, ratings: rating === null ? x.ratings : [...x.ratings.filter((r) => r.week !== thisWeek), { week: thisWeek, rating, note: '' }],
      })) }));
      setEvalSheet(null);
      emit('evaluated');
      return;
    }
    if (rating !== null) await rateGoal(client.clinic_id, g.id, thisWeek, rating);
    if (status !== g.status) await updateGoal(g.id, { status });
    track('plan.evaluate', { rated: rating !== null, status });
    setEvalSheet(null);
    await after(status !== g.status);
  };
  const statusMenu = (g: PlanGoal) => ro ? sampleOnly() : Alert.alert(short(g.title, 60), 'Hedefin durumu', [
    ...(g.status !== 'active' ? [{ text: 'Sürüyor', onPress: () => act(updateGoal(g.id, { status: 'active' })) }] : []),
    ...(g.status !== 'achieved' ? [{ text: 'Ulaşıldı · değerlendir', onPress: () => setEvalSheet({ goal: g, status: 'achieved' }) }] : []),
    ...(g.status !== 'paused' ? [{ text: 'Ara ver', onPress: () => act(updateGoal(g.id, { status: 'paused' })) }] : []),
    { text: 'Vazgeç', style: 'cancel' as const },
  ]);
  const moduleStatusMenu = (m: PlanModule) => ro ? sampleOnly() : Alert.alert(short(m.title, 60), 'Programın durumu', [
    ...MODULE_STATUS.filter((x) => x.id !== m.status).map((x) => ({
      text: x.id === 'planned' ? 'Planlandı (aile görmez)' : x.label, onPress: () => act(updateModule(m.id, { status: x.id })),
    })),
    { text: 'Vazgeç', style: 'cancel' as const },
  ]);

  /* ---------- dikkat ---------- */
  const attention: { icon: keyof typeof Ionicons.glyphMap; text: string; onPress?: () => void; tone?: 'warn'; coach?: string }[] = [];
  if (unsent) attention.push({ icon: 'paper-plane-outline', text: `${unsent} değişiklik aileye gönderilmedi`, onPress: openPublish, tone: 'warn' });
  const due = goals.filter((g) => reviewDue(g, today));
  if (due.length) attention.push({ icon: 'time-outline', text: `Değerlendirme zamanı: ${due.length} hedef`, onPress: () => { openHat(due[0].id); setEvalSheet({ goal: due[0] }); }, coach: 'plan.evaluate' });
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
      <DragView key={`${m.id}-${gid}`} payload={isWeb && linkOK && !ro ? `module:${m.id}|${gid ?? '-'}` : null}
        style={[styles.mini, (m.status === 'planned' || unsentMod(m)) && styles.miniPrivate]}>
        <View style={styles.miniHead}>
          <Text style={styles.miniTitle} numberOfLines={2}>{m.title}</Text>
          {unsentMod(m) && <View style={styles.dot} accessibilityLabel="Aileye gönderilmedi" />}
          {!ro && <IconButton name="create-outline" label="Programı düzenle" size={16} onPress={() => setModuleSheet({ editing: m, goalId: gid })} />}
          {ro ? null : gid ? (
            <IconButton name="unlink-outline" label="Bu hedeften ayır" size={16} onPress={() => act(unlinkModuleGoal(m.id, gid), 'Bağ kaldırılamadı')} />
          ) : (
            <IconButton name="trash-outline" label="Programı sil" size={16} onPress={() => Alert.alert('Program silinsin mi?', 'Ailenin bu programdaki uygulama kayıtları da silinir.', [
              { text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => act(deleteModule(m.id), 'Silinemedi') }])} />
          )}
        </View>
        <StatusChip label={MODULE_STATUS.find((x) => x.id === m.status)?.label ?? m.status} tone={STATUS_TONE[m.status]}
          onPress={() => moduleStatusMenu(m)} hint="Programın durumunu değiştir" />
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
      <DragView key={r.key} payload={isWeb && !ro ? `routine:${r.key}` : null}
        style={[styles.mini, (r.state === 'draft' || draftChange) && styles.miniPrivate]}>
        <View style={styles.miniHead}>
          {(r.state === 'draft' || draftChange) && <View style={styles.dot} accessibilityLabel="Aileye gönderilmedi" />}
          {r.single ? <Text style={{ fontSize: 16 }}>{r.emoji}</Text>
            : <Ionicons name={(r.icon || 'repeat-outline') as keyof typeof Ionicons.glyphMap} size={16} color={colors.navy} />}
          <Text style={styles.miniTitle} numberOfLines={2}>{r.title}</Text>
          {r.goalId && !ro && <IconButton name="unlink-outline" label="Hedeften ayır" size={16} onPress={() => setRoutineGoal(r, null).catch(fail('Bağ kaldırılamadı'))} />}
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
        {!ro && <View style={styles.miniActions}>
          {r.state === 'added' && r.tasks.length > 0 && (changeOn || r.changes.length > 0)
            && <SmallButton label={r.changes.length ? 'Değişikliği düzenle' : 'Değişiklik öner'} onPress={() => openEdit(r)} />}
          {(r.state === 'draft' || r.state === 'pending') && <SmallButton label="Düzenle" onPress={() => openEdit(r)} />}
          {(r.state === 'draft' || r.state === 'pending') && <SmallButton label={r.state === 'draft' ? 'Sil' : 'Geri çek'} danger onPress={() => withdrawGroup(r)} />}
        </View>}
      </DragView>
    );
  };

  // Hedef sütunu (kullanıcı kararları 2 Kasım 2026): aileye gidenler (hedef düzey, süre, açıklama, evde destek) üstte;
  // aileye gitmeyen GAS özeti bej kutuda (C1), "Değerlendir" ile (A1). Ölçüm türü ve başlangıç düzenleme formunda kalır.
  const goalColumn = (g: PlanGoal) => {
    const sorted = [...g.ratings].sort((x, y) => x.week.localeCompare(y.week));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    const sign = (v: number) => (v > 0 ? `+${v}` : v === 0 ? '0' : `−${-v}`);
    const n = goalWeek(g.created_at, today);
    const kv: [string, string][] = [
      ['Hedef düzey', g.target || '—'], ['Süre', g.weeks ? `${Math.min(n, g.weeks)}. hafta / ${g.weeks}` : `${n}. hafta`],
    ];
    return (
      <View style={{ gap: 8 }}>
        <View style={styles.kv}>
          {kv.map(([k, v]) => (
            <View key={k} style={styles.kvItem}><Text style={styles.kvKey}>{k}</Text><Text style={styles.kvVal}>{v}</Text></View>
          ))}
        </View>
        {!!g.description && <Text style={styles.small}><Text style={{ fontWeight: '700', color: colors.navy }}>{g.shared ? 'Aileye not: ' : 'Not: '}</Text>{g.description}</Text>}
        {!!g.home_support && <Text style={styles.small}><Text style={{ fontWeight: '700', color: colors.navy }}>Evde: </Text>{g.home_support}</Text>}
        <View style={styles.private}>
          <View style={styles.privateHead}>
            <Ionicons name="eye-off-outline" size={13} color={PRIVATE.fg} />
            <Text style={styles.privateWho}>YALNIZ SEN GÖRÜRSÜN</Text>
          </View>
          <Text style={[styles.small, { color: PRIVATE.text }]}>
            {last ? `GAS: ${first !== last ? `${sign(first.rating)} (${dayMonth(first.week)}) → ` : ''}${sign(last.rating)} (${dayMonth(last.week)})` : 'Henüz değerlendirilmedi.'}
            {reviewDue(g, today) ? ' · değerlendirme zamanı' : ''}
          </Text>
          <View style={{ alignSelf: 'flex-start' }}><SmallButton label="Değerlendir" onPress={() => setEvalSheet({ goal: g })} /></View>
        </View>
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
        {!ro && linkOK && want.length > 0 && (
          <View style={styles.sugg}>
            <Text style={styles.suggLead}>Öneriler</Text>
            {want.map((k) => (
              <Pressable key={k} onPress={() => addTemplateModule(k, g.id)} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText}>+ {MODULE_TEMPLATES.find((m) => m.key === k)?.title ?? k}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {!ro && linkOK && loose.length > 0 && (
          <View style={styles.sugg}>
            <Text style={styles.suggLead}>Bağlı değil</Text>
            {loose.map((m) => (
              <Pressable key={m.id} onPress={() => act(linkModuleGoals(client.clinic_id, [[m.id, g.id]]), 'Bağlanamadı')} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText}>↳ {short(m.title, 26)}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {!ro && (
          <Pressable onPress={() => setModuleSheet({ goalId: g.id })} style={styles.add} accessibilityRole="button">
            <Text style={styles.addText}>+ Program ekle</Text>
          </Pressable>
        )}
      </View>
    );
  };

  const routineColumn = (g: PlanGoal) => {
    const rts = rtsOf(g.id);
    const themes = DOMAIN_THEMES[g.domain] ?? (ro ? ['afterschool'] : []);
    const coachHere = ro && g.id === goals.find((x) => x.id.startsWith('local-'))?.id;
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
            {offer.map((r, i) => {
              const chip = (
                <Pressable key={r.key} onPress={() => setRtSheet({ routine: r, goalId: g.id })} style={styles.chip} accessibilityRole="button">
                  <Text style={styles.chipText}>+ {r.title}</Text>
                </Pressable>
              );
              return coachHere && i === 0 ? <CoachTarget key={r.key} id="plan.newRoutine" label={`+ ${r.title}`}>{chip}</CoachTarget> : chip;
            })}
          </View>
        )}
        {!ro && loose.length > 0 && (
          <View style={styles.sugg}>
            <Text style={styles.suggLead}>Bağlı değil</Text>
            {loose.map((r) => (
              <Pressable key={r.key} onPress={() => setRoutineGoal(r, g.id).catch(fail('Bağlanamadı'))} style={styles.chip} accessibilityRole="button">
                <Text style={styles.chipText}>↳ {short(r.title, 26)}</Text>
              </Pressable>
            ))}
          </View>
        )}
        {!ro && (
          <Pressable onPress={() => setPick(g.id)} style={styles.add} accessibilityRole="button">
            <Text style={styles.addText}>+ Rutin ya da görev bağla</Text>
          </Pressable>
        )}
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
    const last = lastRating(g);
    return [
      { k: 'p', b: `${mods.length} program`, s: act7.length ? (cols3 ? `${days}/${act7.length * 7} gün uygulandı` : `${days}/${act7.length * 7} gün`) : mods.length ? 'aileye kapalı' : '—' },
      { k: 'r', b: `${rts.length} rutin`, s: rate && rate.planned ? `son 7 gün %${rate.rate}` : rts.some((r) => r.state === 'pending') ? 'karar bekliyor' : rts.some((r) => r.state === 'draft') ? 'taslak' : '—' },
      { k: 'g', private: true, b: last ? `${cols3 ? 'Son değerlendirme' : 'GAS'} ${last.rating > 0 ? `+${last.rating}` : last.rating === 0 ? '0' : `−${-last.rating}`}` : cols3 ? 'Değerlendirilmedi' : 'GAS —',
        s: last ? dayMonth(last.week) : reviewDue(g, today) ? 'değerlendirme zamanı' : '—' },
    ];
  };

  // Sütun etiketleri (H1): kısa gri ad; ne anlattığı (i) içinde
  const colHeads = {
    goal: <ColHead q="Hedef" info={[
      'Neyi değiştiriyoruz, nasıl anlayacağız? Hedefi uzman yazar ve değerlendirir.',
      'Aileye açık hedefin adı, hedef düzeyi, süresi ve açıklaması aileye gider; GAS değerlendirmen aileye gitmez.',
      'Hedefe ulaşıldığına sen karar verirsin; oranlar ve davranış kayıtları yardımcıdır.',
    ]} />,
    mod: <ColHead q="Aile programı" info={[
      'Ebeveyn evde nasıl destekler? Ebeveyn uygular, "Bugün uyguladım" der.',
      'Aile yalnız Etkin ve Tamamlandı programları görür; Planlandı aileye gitmez.',
      'Bir program birden çok hedefe bağlanabilir.',
      ...(isWeb && desktop ? ['Kitaplıktan bir programı bu hedefin üstüne sürükleyip bırakabilirsin.'] : []),
    ]} />,
    rt: <ColHead q="Rutin ve görevler" info={[
      'Her gün, hangi anda, hangi adımlarla? Çocuk yapar, ebeveyn onaylar.',
      'Buradan eklenenler taslaktır; "Aileye gönder" deyince aileye gider.',
      'Oranlar ebeveynin onay kaydıdır, puan değildir.',
    ]} />,
  };

  const hat = (g: PlanGoal, i: number) => {
    const open = isOpen(g.id);
    const color = GOAL_COLORS[i % GOAL_COLORS.length];
    const n = goalWeek(g.created_at, today);
    const meta = [g.domain && domainLabel(g.domain), g.target ? `hedef ${g.target}` : '',
      g.weeks ? (g.status === 'active' ? `${Math.min(n, g.weeks)}. hafta / ${g.weeks}` : `${g.weeks} hafta`) : g.status === 'active' ? `${n}. hafta` : ''].filter(Boolean).join(' · ');
    const dirty = hatUnsent(g);
    const st = GOAL_STATUS.find((x) => x.id === g.status);
    const tab = tabOf[g.id] ?? 'rt';
    const hatButtons = (
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        {!ro && <IconButton name="ellipsis-horizontal" label="Diğer işlemler" size={18} onPress={() => hatMenu(g)} />}
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted} />
      </View>
    );
    const titleRow = (
      <View style={{ flex: 1, gap: 3 }}>
        <View style={styles.titleRow}>
          {dirty && <View style={styles.dot} accessibilityLabel="Aileye gönderilmedi" />}
          <Text style={[styles.hatTitle, { flexShrink: 1, minWidth: 0 }]}>{g.title}</Text>
          {cols3 && <StatusChip label={st?.label ?? g.status} tone={STATUS_TONE[g.status]} onPress={() => statusMenu(g)} hint="Hedefin durumunu değiştir" />}
          {!g.shared && <PrivateBadge text="Yalnız sende" />}
        </View>
        {!cols3 && (
          <View style={styles.titleRow}>
            <StatusChip label={st?.label ?? g.status} tone={STATUS_TONE[g.status]} onPress={() => statusMenu(g)} hint="Hedefin durumunu değiştir" />
            {!!meta && <Text style={[styles.small, { flexShrink: 1 }]}>{meta}</Text>}
          </View>
        )}
        {cols3 && !!meta && <Text style={styles.small}>{meta}</Text>}
      </View>
    );
    return (
      <DropView key={g.id} accept={['module', 'routine', 'libmod', 'librt']} onDrop={onDropHat(g.id)} style={[styles.hat, { borderLeftColor: color }]}>
        <Pressable onPress={() => toggle(g.id)} style={[styles.hatLine, open && { backgroundColor: HEAD }, !cols3 && { flexDirection: 'column', alignItems: 'stretch' }]}
          accessibilityRole="button" accessibilityState={{ expanded: open }}>
          <View style={{ flex: cols3 ? 1 : undefined, minWidth: cols3 ? 240 : undefined, flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
            {titleRow}
            {!cols3 && hatButtons}
          </View>
          <View style={[styles.cells, !cols3 && { flexWrap: 'nowrap' }]}>
            {hatSummary(g).map((c) => (
              <View key={c.k} style={[styles.cell, open && { backgroundColor: '#fff' }, c.private && styles.cellPrivate, !cols3 && { flex: 1, minWidth: 0 }]}>
                <Text style={[styles.cellB, c.private && { color: PRIVATE.fg }]} numberOfLines={cols3 ? 1 : 2}>{c.b}</Text>
                <Text style={styles.tiny} numberOfLines={1}>{c.s}</Text>
              </View>
            ))}
          </View>
          {cols3 && hatButtons}
        </Pressable>
        {open && cols3 && (
          <View style={[styles.hatBody, { flexDirection: 'row', alignItems: 'flex-start' }]}>
            <View style={[styles.col, styles.col3]}>{colHeads.goal}{goalColumn(g)}</View>
            <View style={[styles.col, styles.col3]}>{colHeads.mod}{programColumn(g)}</View>
            <View style={[styles.col, styles.col3]}>{colHeads.rt}{routineColumn(g)}</View>
          </View>
        )}
        {/* dar ekran (L2): hedefin içinde sekmeler; en sık kullanılan rutin önce açık */}
        {open && !cols3 && (
          <View style={styles.hatBody}>
            <View style={styles.tabs} accessibilityRole="tablist">
              {([['goal', 'Hedef', null], ['mod', 'Program', modsOf(g.id).length], ['rt', 'Rutin', rtsOf(g.id).length]] as const).map(([id, label, count]) => (
                <Pressable key={id} onPress={() => setTabOf((x) => ({ ...x, [g.id]: id }))} accessibilityRole="tab" accessibilityState={{ selected: tab === id }}
                  style={[styles.tab, tab === id && styles.tabOn]}>
                  <Text style={[styles.tabText, tab === id && styles.tabTextOn]}>{label}{count !== null ? <Text style={styles.tabCount}>{` ${count}`}</Text> : null}</Text>
                </Pressable>
              ))}
            </View>
            <View style={styles.col}>
              {tab === 'goal' ? <>{colHeads.goal}{goalColumn(g)}</> : tab === 'mod' ? <>{colHeads.mod}{programColumn(g)}</> : <>{colHeads.rt}{routineColumn(g)}</>}
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
        {!ro && <SmallButton label={desktop && width >= 980 ? (libOpen ? 'Kitaplığı gizle' : 'Kitaplık') : 'Kitaplık'} onPress={() => setLibOpen((v) => !v)} />}
        {goals.length > 1 && (
          <SmallButton label={(openIds ?? []).length >= goals.length ? 'Hepsini kapat' : 'Hepsini aç'}
            onPress={() => setOpenIds((openIds ?? []).length >= goals.length ? [] : goals.map((g) => g.id))} />
        )}
        <CoachTarget id="plan.addGoal"><SmallButton label="+ Hedef" onPress={() => setGoalSheet({})} /></CoachTarget>
        <View style={{ flex: 1 }} />
        <CoachTarget id="plan.publish">
          <Pressable onPress={openPublish} disabled={busy} style={[styles.send, !unsent && styles.sendQuiet, busy && { opacity: 0.6 }]} accessibilityRole="button">
            {busy ? <ActivityIndicator color={unsent ? '#fff' : colors.navy} /> : (
              <>
                <Ionicons name="paper-plane-outline" size={16} color={unsent ? '#fff' : colors.navy} />
                <Text style={[styles.sendText, !unsent && { color: colors.navy }]}>Aileye gönder{unsent ? ` (${unsent})` : ''}</Text>
              </>
            )}
          </Pressable>
        </CoachTarget>
      </View>
      {ro && (
        <View style={styles.sampleBox}>
          <Ionicons name="eye-outline" size={14} color={PRIVATE.fg} />
          <Text style={[styles.small, { color: PRIVATE.text, flex: 1 }]}>
            Örnek aile: hedef ekle, rutin bağla, gönder, değerlendir. Kaydedilmez, aileye gitmez.
          </Text>
        </View>
      )}
      {help && (
        <View style={styles.infoBox}>
          {[
            'Her hedef bir satır: hedef · ailenin evdeki programı · çocuğun rutini ve görevleri. Satıra dokununca açılır.',
            'Eklediklerin taslaktır; aile, sen "Aileye gönder" deyince tek bildirimle görür.',
            'Takip Planı gözlem toplar, tanı koymaz.',
          ].map((t) => <Text key={t} style={styles.infoLine}>• {t}</Text>)}
          <Text style={[styles.infoLine, { fontWeight: '700', color: colors.navy, marginTop: 6 }]}>Aile neyi görür?</Text>
          <FamilySees compact />
        </View>
      )}
      {attention.length > 0 && (
        <View style={styles.attention}>
          {attention.slice(0, 4).map((a, i) => {
            const chip = (
              <Pressable key={i} onPress={a.onPress} disabled={!a.onPress} style={[styles.att, a.tone === 'warn' && styles.attWarn]} accessibilityRole={a.onPress ? 'button' : undefined}>
                <Ionicons name={a.icon} size={14} color={a.tone === 'warn' ? colors.medium.fg : colors.navy} />
                <Text style={[styles.attText, a.tone === 'warn' && { color: colors.medium.fg }]}>{a.text}</Text>
              </Pressable>
            );
            return a.coach ? <CoachTarget key={i} id={a.coach}>{chip}</CoachTarget> : chip;
          })}
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
                    {!ro && linkOK && goals.length > 0 && <SmallButton label="Hedefe bağla" onPress={() => pickGoal(m.title, (gid) => act(linkModuleGoals(client.clinic_id, [[m.id, gid]]), 'Bağlanamadı'))} />}
                  </View>
                ))}
                {unlinkedRts.map((r) => (
                  <View key={r.key} style={styles.looseItem}>
                    {routineMini(r)}
                    {!ro && goals.length > 0 && <SmallButton label="Hedefe bağla" onPress={() => pickGoal(r.title, (gid) => { setRoutineGoal(r, gid).catch(fail('Bağlanamadı')); })} />}
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
            if (ro) {
              // örnek: yeni hedef yerelde, en üstte ve açık
              const g: PlanGoal = {
                id: localId(), title: input.title, description: input.description, archived: false, created_at: new Date().toISOString(),
                domain: input.domain, measure: input.measure, baseline: input.baseline, target: input.target, weeks: input.weeks,
                home_support: input.home_support, shared: input.shared, status: input.status, position: -1, template_key: input.template_key ?? null, ratings: [],
              };
              setPlan((p) => p && ({ ...p, goals: [g, ...p.goals] }));
              setGoalSheet(null);
              openHat(g.id);
              setTabOf((x) => ({ ...x, [g.id]: 'rt' }));
              emit('goal_added');
              return;
            }
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
      <EvaluateSheet goal={evalSheet?.goal ?? null} initialStatus={evalSheet?.status} week={thisWeek} today={today}
        onClose={() => setEvalSheet(null)} onSave={(r, st) => saveEval(evalSheet!.goal, r, st)} />
      <PublishSheet items={pubItems} onClose={() => setPubItems(null)} onSend={publish}
        groups={plan.goals.map((g, i) => ({ id: g.id, title: g.title, color: GOAL_COLORS[Math.max(0, goals.findIndex((x) => x.id === g.id)) % GOAL_COLORS.length], hidden: !g.shared }))} />
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

/* ---------- Sütun etiketi (H1): küçük gri ad + (i); açıklama yalnız (i)'ye dokununca ---------- */
function ColHead({ q, info }: { q: string; info: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${q}: açıklama`}
        accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }}>
        <Text style={styles.colLabel}>{q}</Text>
        <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={14} color={colors.muted} />
      </Pressable>
      {open && <View style={styles.infoBox}>{info.map((t) => <Text key={t} style={styles.infoLine}>• {t}</Text>)}</View>}
    </View>
  );
}

// Durum çipi (S1): seyrek değişen durum başlıkta görünür, dokununca seçenekler
function StatusChip({ label, tone, onPress, hint }: { label: string; tone: { bg: string; fg: string }; onPress: () => void; hint: string }) {
  return (
    <Pressable onPress={onPress} hitSlop={6} accessibilityRole="button" accessibilityLabel={`${label}. ${hint}`}
      style={[styles.chipSt, { backgroundColor: tone.bg }]}>
      <View style={[styles.chipDot, { backgroundColor: tone.fg }]} />
      <Text style={[styles.chipStText, { color: tone.fg }]}>{label}</Text>
      <Ionicons name="chevron-down" size={11} color={tone.fg} />
    </Pressable>
  );
}

// Aileye gitmeyen şeyin etiketi (C1, D1)
function PrivateBadge({ text }: { text: string }) {
  return (
    <View style={styles.badge}>
      <Ionicons name="eye-off-outline" size={11} color={PRIVATE.fg} />
      <Text style={styles.badgeText}>{text}</Text>
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
  sampleBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: PRIVATE.bg, borderWidth: 1, borderColor: PRIVATE.line, borderRadius: radius.sm, padding: 10, marginTop: 4 },
  colLabel: { fontSize: 10.5, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#6B7387' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  chipSt: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 4, borderRadius: radius.pill, paddingLeft: 7, paddingRight: 6, paddingVertical: 3 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipStText: { fontSize: 11, fontWeight: '700' },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: PRIVATE.bg, borderColor: PRIVATE.line, borderWidth: 1,
    borderRadius: radius.pill, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 10.5, fontWeight: '700', color: PRIVATE.fg },
  private: { backgroundColor: PRIVATE.bg, borderColor: PRIVATE.line, borderWidth: 1, borderRadius: radius.sm, padding: 9, gap: 6 },
  privateHead: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  privateWho: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4, color: PRIVATE.fg },
  cellPrivate: { backgroundColor: PRIVATE.bg, borderWidth: 1, borderColor: PRIVATE.line },
  miniPrivate: { backgroundColor: PRIVATE.card, borderColor: PRIVATE.line },
  tabs: { flexDirection: 'row', backgroundColor: '#ECEEF3', borderRadius: 9, padding: 2, gap: 2 },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 7, borderRadius: 7 },
  tabOn: { backgroundColor: '#fff' },
  tabText: { fontSize: 12.5, fontWeight: '600', color: colors.muted },
  tabTextOn: { color: colors.navy, fontWeight: '700' },
  tabCount: { fontWeight: '400', color: colors.muted },
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
