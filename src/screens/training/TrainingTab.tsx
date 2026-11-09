// Danışan › Ebeveyn Eğitimi (rakipteki "Parent training"e sadık; kullanıcı isteği 9 Kasım 2026: "örneklere sadık kal, ekstra sistem yok").
// Liste: ebeveyn seçici, "+ Eğitim ekle", Taslaklar / Etkin eğitimler / Ustalaşılan eğitimler, "Yeni etkinlik" noktası.
// Eğitim sayfası: durum (Taslak · Etkin · Ustalaştı), Not oluştur, ayarlar; sekmeler Özet · Öğrenme modülleri · Uygulama görevleri · Hızlı yapılacaklar.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, useWindowDimensions, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, radius } from '../../theme';
import { Card, Cta, Input, Notice, SmallButton, IconButton, Segmented, Empty } from '../../components/ui';
import { useActionMenu, confirmSpec } from '../../components/ActionMenu';
import DateField from '../../components/DateField';
import type { ClientCtx } from '../client/ClientScreen';
import {
  Training, Detail, TModule, TTask, TTodo, TrainingStatus, STATUS_META, SECTION_TONE, MEASURES, Measure, measureLabel, itemByKey, parentsOf,
  loadTrainings, loadDetail, createTraining, updateTraining, deleteTraining, addModules, moveModule, archiveModule, saveTask, archiveTask,
  saveTodo, archiveTodo, addData, deleteData, activityOf, isNew, logValue, trainingNote, TrainingNotInstalled,
} from '../../lib/training';
import { TypeTile, StatusChip, NewDot, SheetFrame, PercentArea, ItemContent, shortDate, GhostButton } from './parts';

const FOOT = { height: 48, marginTop: 0, paddingHorizontal: 18 };
import { LibraryBrowser } from './Library';
import ParentPreview from './ParentPreview';

const EMPTY_DETAIL: Detail = { modules: [], tasks: [], logs: [], todos: [], data: [] };
const ORDER: TrainingStatus[] = ['draft', 'active', 'mastered'];

export default function TrainingTab({ client, me, sample }: ClientCtx & { sample?: boolean }) {
  const [list, setList] = useState<Training[] | null>(null);
  const [detail, setDetail] = useState<Detail>(EMPTY_DETAIL);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const parents = parentsOf(client.parents);
  const [parent, setParent] = useState<string>(parents[0] ?? 'Ebeveyn');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const ts = await loadTrainings(client.link_id);
      const d = await loadDetail(ts.map((t) => t.id));
      setList(ts); setDetail(d); setError(null);
    } catch (e) {
      if (e instanceof TrainingNotInstalled) setMissing(true); else setError((e as Error).message);
      setList([]);
    }
  }, [client.link_id]);
  useEffect(() => { reload(); }, [reload]);

  if (sample) return <Notice icon="school-outline" text="Ebeveyn eğitimi gerçek danışanlarda: aileyi davet et, sonra buradan eğitim kur." />;
  if (missing) return <Notice icon="cloud-offline-outline" text="Ebeveyn eğitimi için veritabanı güncellemesi bekleniyor." />;
  if (!list) return <ActivityIndicator color={colors.navy} style={{ marginTop: 30 }} />;

  const open = list.find((t) => t.id === openId);
  if (open) {
    return <TrainingDetail key={open.id} training={open} detail={detail} me={me} onBack={() => { setOpenId(null); reload(); }} onChanged={reload} />;
  }

  const mine = list.filter((t) => t.parent_name === parent);
  const add = async () => {
    setBusy(true);
    try {
      const t = await createTraining({ clinic_id: client.clinic_id, link_id: client.link_id, parent_name: parent, created_by: me.id });
      await reload(); setOpenId(t.id);
    } catch (e) { Alert.alert('Eklenemedi', (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <View style={{ gap: 14 }}>
      {error && <Notice icon="alert-circle-outline" text={`Yüklenemedi: ${error}`} />}
      <View style={styles.headRow}>
        <Text style={styles.title}>Ebeveyn eğitimleri</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 }}>
          {parents.map((p) => (
            <Pressable key={p} onPress={() => setParent(p)} style={[styles.pchip, p === parent && styles.pchipOn]} accessibilityRole="radio" accessibilityState={{ selected: p === parent }}>
              <Ionicons name="person-outline" size={13} color={p === parent ? '#fff' : colors.navy} />
              <Text style={[styles.pchipText, p === parent && { color: '#fff' }]}>{p}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexGrow: 1 }} />
        <Cta label="+ Eğitim ekle" onPress={add} busy={busy} style={{ paddingHorizontal: 16, alignSelf: 'flex-start' }} />
      </View>
      {mine.length === 0 && <Empty text={`${parent} için henüz eğitim yok. "+ Eğitim ekle" ile başla ya da Ana ekran › Kaynak kütüphanesi'nden bir kaynak ata.`} />}
      {ORDER.map((st) => {
        const rows = mine.filter((t) => t.status === st);
        if (!rows.length) return null;
        return (
          <View key={st} style={{ gap: 8 }}>
            <View style={[styles.secBar, { backgroundColor: SECTION_TONE[st].bg }]}><Text style={[styles.secText, { color: SECTION_TONE[st].fg }]}>{STATUS_META[st].section}</Text></View>
            {rows.map((t) => {
              const a = activityOf(t.id, detail);
              const fresh = [a.modules, a.tasks, a.todos].some((x) => isNew(x, t.seen_at));
              return (
                <Pressable key={t.id} onPress={() => setOpenId(t.id)} style={({ pressed }) => [styles.tcard, pressed && { opacity: 0.85 }]} accessibilityRole="button" accessibilityLabel={t.title}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.tTitle} numberOfLines={2}>{t.title}</Text>
                    <Text style={styles.small}>Başlangıç: {shortDate(t.started_at)}</Text>
                  </View>
                  {fresh && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><NewDot /><Text style={styles.newText}>Yeni etkinlik</Text></View>}
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              );
            })}
          </View>
        );
      })}
    </View>
  );
}

type TabId = 'summary' | 'modules' | 'tasks' | 'todos';

function TrainingDetail({ training: t, detail, me, onBack, onChanged }: { training: Training; detail: Detail; me: ClientCtx['me']; onBack: () => void; onChanged: () => Promise<void> }) {
  const [tab, setTab] = useState<TabId>('summary');
  const { width } = useWindowDimensions();
  const narrow = width < 640;
  const [menu, openMenu] = useActionMenu();
  const seenAt = useRef(t.seen_at).current;          // açılıştaki "görüldü"; noktalar buna göre, sonra şimdi olarak yazılır
  const [sheet, setSheet] = useState<null | 'note' | 'rename' | 'criterion' | 'data' | 'pick' | 'preview' | { task: TTask | null } | { todo: TTodo | null } | { module: TModule }>(null);
  useEffect(() => { updateTraining(t.id, { seen_at: new Date().toISOString() }).catch(() => {}); }, [t.id]);
  const mods = detail.modules.filter((m) => m.training_id === t.id && !m.archived);
  const tasks = detail.tasks.filter((k) => k.training_id === t.id && !k.archived);
  const todos = detail.todos.filter((k) => k.training_id === t.id && !k.archived);
  const data = detail.data.filter((x) => x.training_id === t.id);
  const act = activityOf(t.id, detail);
  const dots: Record<TabId, boolean> = { summary: false, modules: isNew(act.modules, seenAt), tasks: isNew(act.tasks, seenAt), todos: isNew(act.todos, seenAt) };
  const remaining = mods.filter((m) => !m.completed_at).length;
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); await onChanged(); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); } };

  const statusMenu = (e: any) => openMenu({ title: 'Durum', items: ORDER.map((s) => ({ label: STATUS_META[s].label, checked: s === t.status,
    info: s === 'draft' ? `${t.parent_name} taslak eğitimi görmez.` : s === 'active' ? `${t.parent_name} eğitimi aile uygulamasında görür.` : 'Eğitim tamamlandı; ebeveyn ustalaştı.',
    onPress: () => s !== t.status && run(() => updateTraining(t.id, { status: s })) })) }, e);
  const gearMenu = (e: any) => openMenu({ items: [
    { label: 'Yeniden adlandır', icon: 'create-outline', onPress: () => setSheet('rename') },
    { label: 'Ebeveyn deneyimini önizle', icon: 'phone-portrait-outline', onPress: () => setSheet('preview') },
    { label: 'Eğitimi sil', icon: 'trash-outline', destructive: true, onPress: () => openMenu(confirmSpec('Eğitim silinsin mi?', 'Modüller, görevler ve ebeveynin kayıtları da silinir.', 'Sil', () => run(async () => { await deleteTraining(t.id); onBack(); }))) },
  ] }, e);

  const TABS: { id: TabId; label: string }[] = [
    { id: 'summary', label: 'Özet' }, { id: 'modules', label: 'Öğrenme modülleri' }, { id: 'tasks', label: 'Uygulama görevleri' }, { id: 'todos', label: 'Hızlı yapılacaklar' },
  ];
  return (
    <View style={{ gap: 12 }}>
      {menu}
      <Pressable onPress={onBack} style={styles.back} accessibilityRole="button"><Ionicons name="chevron-back" size={16} color={colors.navy} /><Text style={styles.backText}>Tüm eğitimler</Text></Pressable>
      <View style={styles.headRow}>
        <View style={{ flexGrow: 1, flexShrink: 1, minWidth: 200, gap: 2 }}>
          <Text style={styles.title}>{t.title}</Text>
          <Text style={styles.small}>Başlangıç {shortDate(t.started_at)}, {t.parent_name} için</Text>
        </View>
        <StatusChip status={t.status} onPress={statusMenu} />
        <SmallButton label="Not oluştur" onPress={() => setSheet('note')} />
        <IconButton name="settings-outline" label="Eğitim ayarları" onPress={gearMenu as any} />
      </View>
      {t.status === 'draft' && (
        <View style={styles.draft}>
          <Ionicons name="eye-off-outline" size={16} color="#7A5A22" />
          <Text style={styles.draftText}>Bu eğitim taslak; {t.parent_name} henüz göremez. Görünmesi için durumu Etkin yap.</Text>
        </View>
      )}
      <ScrollView horizontal={narrow} scrollEnabled={narrow} showsHorizontalScrollIndicator={false} style={styles.tabs} contentContainerStyle={!narrow && { flex: 1 }}>
        <View style={{ flexDirection: 'row', flex: narrow ? undefined : 1 }} accessibilityRole="tablist">
          {TABS.map((x) => (
            <Pressable key={x.id} onPress={() => setTab(x.id)} style={[styles.tab, !narrow && { flex: 1 }, tab === x.id && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === x.id }}>
              <View>
                <Text style={[styles.tabText, tab === x.id && styles.tabTextOn]} numberOfLines={1}>{x.label}</Text>
                {dots[x.id] && <View style={styles.tabDot}><NewDot /></View>}
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>

      {tab === 'summary' && (
        <View style={{ gap: 12 }}>
          <View style={styles.cards}>
            <SumCard title="Öğrenme modülleri" line={!mods.length ? 'Henüz modül yok' : remaining ? `${remaining} kaldı` : `${mods.length} atanmış modül`} onView={() => setTab('modules')} />
            {tasks.length > 0 && <SumCard title="Uygulama görevleri" line={`${tasks.length} görev`} onView={() => setTab('tasks')} />}
            {todos.length > 0 && <SumCard title="Hızlı yapılacaklar" line={todos.some((x) => !x.done_at) ? `${todos.filter((x) => !x.done_at).length} yapılacak kaldı` : 'Hepsi tamamlandı'} onView={() => setTab('todos')} />}
          </View>
          {tasks.length === 0 && <AddPrompt title="+ Uygulama görevi ekle" text="En uygun: öğrenilenleri evde uygulamak ve yeni bir alışkanlık kurmak. Bir hedef koyup ebeveynden bu hedefe doğru ilerlemeyi kaydetmesini de isteyebilirsin." onPress={() => setSheet({ task: null })} />}
          {todos.length === 0 && <AddPrompt title="+ Hızlı yapılacak ekle" text="En uygun: ebeveynin seans dışında bir kez yapmasını istediğin her iş." onPress={() => setSheet({ todo: null })} />}
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[styles.h, { flex: 1, minWidth: 180 }]}>Ustalık ölçütüne doğru gözlem verisi</Text>
              {t.criterion && <SmallButton label="+ Veri ekle" onPress={() => setSheet('data')} />}
            </View>
            {t.criterion ? (
              <>
                <Pressable onPress={() => setSheet('criterion')} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }} accessibilityRole="button" accessibilityLabel="Ustalık ölçütünü düzenle">
                  <Text style={[styles.body, { flex: 1 }]}>{t.criterion}</Text>
                  <Ionicons name="pencil-outline" size={16} color={colors.muted} />
                </Pressable>
                <DataView data={data} target={targetOf(t.criterion)} onDelete={(id) => run(() => deleteData(id))} />
              </>
            ) : (
              <View style={{ alignItems: 'center', gap: 6, paddingVertical: 14 }}>
                <Text style={styles.h}>Henüz ustalık ölçütü yok!</Text>
                <Text style={styles.small}>İzlemeye başlamak için bir ölçüt ekle</Text>
                <SmallButton label="Ustalık ölçütü ekle" onPress={() => setSheet('criterion')} />
              </View>
            )}
          </Card>
        </View>
      )}

      {tab === 'modules' && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.h, { flex: 1 }]}>{mods.length} etkin modül</Text>
            <SmallButton label="+ Daha fazla ekle" onPress={() => setSheet('pick')} />
          </View>
          {mods.length === 0 && <Empty text="Kaynak kütüphanesinden okuma, test ve açık uçlu sorular ekle." />}
          {mods.map((m, i) => {
            const it = itemByKey(m.item_key);
            const status = m.completed_at ? (m.total ? `Tamamlandı (${m.correct ?? 0}/${m.total})` : 'Tamamlandı') : '';
            return (
              <View key={m.id} style={styles.mrow}>
                <View style={{ gap: 2, width: 30 }}>
                  {i > 0 ? <IconButton name="chevron-up" label="Yukarı taşı" size={16} onPress={() => run(() => moveModule(mods, m.id, -1))} /> : <View style={{ height: 30 }} />}
                  {i < mods.length - 1 ? <IconButton name="chevron-down" label="Aşağı taşı" size={16} onPress={() => run(() => moveModule(mods, m.id, 1))} /> : <View style={{ height: 30 }} />}
                </View>
                <Pressable onPress={() => setSheet({ module: m })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }} accessibilityRole="button" accessibilityLabel={`${it?.title ?? m.item_key} incele`}>
                  {it && <TypeTile type={it.type} />}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.tTitle}>{it?.title ?? m.item_key}</Text>
                    <Text style={[styles.small, !!status && { color: colors.ok, fontWeight: '600' }]}>{status || 'Başlamadı'}</Text>
                  </View>
                  {isNew(m.completed_at, seenAt) && <NewDot />}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {tab === 'tasks' && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.h, { flex: 1 }]}>{tasks.length} uygulama görevi</Text>
            <SmallButton label="+ Uygulama görevi ekle" onPress={() => setSheet({ task: null })} />
          </View>
          {tasks.length === 0 && <AddPrompt title="+ Uygulama görevi ekle" text="En uygun: öğrenilenleri evde uygulamak ve yeni bir alışkanlık kurmak." onPress={() => setSheet({ task: null })} />}
          {tasks.map((k) => (
            <TaskRow key={k.id} task={k} logs={detail.logs.filter((l) => l.task_id === k.id)} fresh={isNew(detail.logs.find((l) => l.task_id === k.id)?.created_at ?? null, seenAt)}
              onMenu={(e) => openMenu({ items: [
                { label: 'Düzenle', icon: 'create-outline', onPress: () => setSheet({ task: k }) },
                { label: 'Arşivle', icon: 'archive-outline', destructive: true, onPress: () => run(() => archiveTask(k.id)) },
              ] }, e)} />
          ))}
        </View>
      )}

      {tab === 'todos' && (
        <View style={{ gap: 8 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[styles.h, { flex: 1 }]}>{todos.length} yapılacak</Text>
            <SmallButton label="+ Yapılacak ekle" onPress={() => setSheet({ todo: null })} />
          </View>
          {todos.length === 0 && <AddPrompt title="+ Hızlı yapılacak ekle" text="En uygun: ebeveynin seans dışında bir kez yapmasını istediğin her iş." onPress={() => setSheet({ todo: null })} />}
          {todos.map((k) => (
            <Pressable key={k.id} onPress={() => setSheet({ todo: k })} style={styles.mrow} accessibilityRole="button">
              <Ionicons name={k.done_at ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={k.done_at ? colors.ok : colors.faint} />
              <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                <Text style={[styles.small, k.done_at && { color: colors.ok, fontWeight: '600' }]}>{k.done_at ? `Tamamlandı · ${shortDate(k.done_at)}` : 'Bekliyor'}</Text>
                <Text style={styles.tTitle}>{k.title}</Text>
                {!!k.description && <Text style={styles.small} numberOfLines={2}>{k.description}</Text>}
              </View>
              {isNew(k.done_at, seenAt) && <NewDot />}
            </Pressable>
          ))}
        </View>
      )}

      {sheet === 'note' && <NoteSheet text={trainingNote(t, detail, shortDate)} onClose={() => setSheet(null)} />}
      {sheet === 'rename' && <TextSheet title="Eğitimi yeniden adlandır" label="Eğitimin adı" initial={t.title} max={80} onClose={() => setSheet(null)} onSave={(v) => run(() => updateTraining(t.id, { title: v.trim() || 'Adsız eğitim' }))} />}
      {sheet === 'criterion' && <TextSheet title="Ustalık ölçütü" label="Ölçüt" multiline initial={t.criterion ?? ''} max={400}
        placeholder="Ör. Ebeveyn, zorlayıcı davranışın öncülünü fırsatların %80'inde doğru belirler; art arda 3 seansta."
        onClose={() => setSheet(null)} onSave={(v) => run(() => updateTraining(t.id, { criterion: v.trim() || null }))} />}
      {sheet === 'data' && <DataSheet onClose={() => setSheet(null)} onSave={(day, v) => run(() => addData(t.id, day, v))} />}
      {sheet === 'pick' && <PickSheet me={me} exclude={mods.map((m) => m.item_key)} onClose={() => setSheet(null)} onAdd={(keys) => run(() => addModules(t.id, keys, detail.modules.filter((m) => m.training_id === t.id)))} />}
      {sheet === 'preview' && <ParentPreview training={t} detail={detail} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && 'task' in sheet && <TaskSheet task={sheet.task} onClose={() => setSheet(null)}
        onSave={(v) => run(() => saveTask({ ...v, id: sheet.task?.id, training_id: t.id, position: tasks.length }))} />}
      {sheet && typeof sheet === 'object' && 'todo' in sheet && <TodoSheet todo={sheet.todo} onClose={() => setSheet(null)}
        onSave={(v) => run(() => saveTodo({ ...v, id: sheet.todo?.id, training_id: t.id }))}
        onArchive={sheet.todo ? () => run(() => archiveTodo(sheet.todo!.id)) : undefined} />}
      {sheet && typeof sheet === 'object' && 'module' in sheet && <ModuleReview module={sheet.module} onClose={() => setSheet(null)}
        onArchive={() => run(() => archiveModule(sheet.module.id))} />}
    </View>
  );
}

function SumCard({ title, line, onView }: { title: string; line: string; onView: () => void }) {
  return (
    <View style={styles.sum}>
      <Text style={styles.h}>{title}</Text>
      <Text style={styles.small}>{line}</Text>
      <Pressable onPress={onView} hitSlop={6} accessibilityRole="button"><Text style={styles.link}>Gör</Text></Pressable>
    </View>
  );
}

function AddPrompt({ title, text, onPress }: { title: string; text: string; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={styles.prompt} accessibilityRole="button">
      <Text style={[styles.h, { color: colors.navy }]}>{title}</Text>
      <Text style={styles.small}>{text}</Text>
    </Pressable>
  );
}

// Ölçüt metnindeki ilk yüzde grafikte kesikli çizgi olur ("fırsatların %80'inde")
const targetOf = (c: string | null) => { const m = c?.match(/%\s?(\d{1,3})/); return m ? Math.min(100, +m[1]) : null; };

function DataView({ data, onDelete, target }: { data: { id: string; day: string; value: number }[]; onDelete: (id: string) => void; target?: number | null }) {
  const [view, setView] = useState<'chart' | 'table'>('chart');
  if (!data.length) return <Text style={styles.small}>Henüz gözlem verisi yok. Seansta "+ Veri ekle" ile yüzdeyi gir.</Text>;
  return (
    <View style={{ gap: 8 }}>
      <View style={{ maxWidth: 220 }}><Segmented options={[{ id: 'chart', label: 'Grafik' }, { id: 'table', label: 'Tablo' }]} value={view} onChange={setView} /></View>
      {view === 'chart' ? <PercentArea points={data} target={target} /> : (
        <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 10 }}>
          {[...data].reverse().map((d) => (
            <View key={d.id} style={styles.trow}>
              <Text style={[styles.body, { width: 90 }]}>{shortDate(d.day)}</Text>
              <Text style={[styles.body, { flex: 1, fontWeight: '700' }]}>%{d.value}</Text>
              <IconButton name="trash-outline" label="Sil" size={16} onPress={() => onDelete(d.id)} />
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function TaskRow({ task, logs, fresh, onMenu }: { task: TTask; logs: Detail['logs']; fresh: boolean; onMenu: (e: any) => void }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<'table' | 'chart'>('table');
  const val = (l: Detail['logs'][number]) => (task.measure === 'frequency' ? l.count ?? 0 : task.measure === 'accuracy' ? (l.attempts ? Math.round(((l.successes ?? 0) / l.attempts) * 100) : 0) : task.measure === 'duration' ? l.minutes ?? 0 : 0);
  const max = Math.max(1, ...logs.map(val));
  return (
    <View style={[styles.tcard, { flexDirection: 'column', alignItems: 'stretch', gap: 8 }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Pressable onPress={() => setOpen((o) => !o)} style={{ flex: 1, minWidth: 0, gap: 2 }} accessibilityRole="button" accessibilityState={{ expanded: open }}>
          <Text style={styles.small}>Başlangıç: {shortDate(task.created_at)} · {measureLabel(task.measure)} · {logs.length} kayıt</Text>
          <Text style={styles.tTitle}>{task.title}</Text>
        </Pressable>
        {fresh && <NewDot />}
        <IconButton name={open ? 'chevron-up' : 'chevron-down'} label={open ? 'Kayıtları gizle' : 'Kayıtları göster'} onPress={() => setOpen((o) => !o)} />
        <IconButton name="ellipsis-horizontal" label="Görev menüsü" onPress={onMenu as any} />
      </View>
      {open && (
        <View style={{ gap: 8 }}>
          {!!task.description && <Text style={styles.body}>{task.description}</Text>}
          {logs.length === 0 ? <Text style={styles.small}>Ebeveyn henüz kayıt girmedi.</Text> : (
            <>
              {task.measure !== 'none' && <View style={{ maxWidth: 220 }}><Segmented options={[{ id: 'table', label: 'Tablo' }, { id: 'chart', label: 'Grafik' }]} value={view} onChange={setView} /></View>}
              {view === 'chart' && task.measure !== 'none' ? (
                <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6, height: 120, paddingTop: 8 }}>
                  {[...logs].reverse().map((l) => (
                    <View key={l.id} style={{ flex: 1, alignItems: 'center', gap: 4 }}>
                      <Text style={styles.tiny}>{task.measure === 'accuracy' ? `%${val(l)}` : val(l)}</Text>
                      <View style={{ width: '70%', maxWidth: 26, height: Math.max(4, (val(l) / max) * 70), backgroundColor: colors.navy, borderRadius: 4 }} />
                      <Text style={styles.tiny}>{shortDate(l.day)}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 10 }}>
                  {logs.map((l) => (
                    <View key={l.id} style={styles.trow}>
                      <Text style={[styles.body, { width: 64 }]}>{shortDate(l.day)}</Text>
                      {task.measure !== 'none' && <Text style={[styles.body, { width: 70, fontWeight: '700' }]}>{logValue(l, task.measure)}</Text>}
                      <Text style={[styles.body, { flex: 1, color: l.reflection ? colors.text : colors.muted, fontStyle: l.reflection ? 'normal' : 'italic' }]}>{l.reflection || 'Düşünce yok'}</Text>
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

function ModuleReview({ module: m, onClose, onArchive }: { module: TModule; onClose: () => void; onArchive: () => void }) {
  const it = itemByKey(m.item_key);
  if (!it) return null;
  return (
    <SheetFrame title="Etkileşimli modülü incele" onClose={onClose}
      footer={<GhostButton label="Arşivle" danger onPress={() => { onArchive(); onClose(); }} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><TypeTile type={it.type} /><Text style={[styles.title, { flex: 1, fontSize: 18 }]}>{it.title}</Text></View>
      <View style={styles.result}>
        <Text style={styles.body}><Text style={{ fontWeight: '700' }}>Sonuç: </Text>{m.completed_at ? `✓ ${shortDate(m.completed_at)} tarihinde tamamlandı` : 'Henüz tamamlanmadı'}</Text>
        {m.completed_at && m.total ? <Text style={styles.body}>%{Math.round(((m.correct ?? 0) / m.total) * 100)} ({m.total} sorudan {m.correct ?? 0} doğru)</Text> : null}
      </View>
      <ItemContent item={it} answers={m.answers} completed={!!m.completed_at} />
    </SheetFrame>
  );
}

function PickSheet({ me, exclude, onClose, onAdd }: { me: ClientCtx['me']; exclude: string[]; onClose: () => void; onAdd: (keys: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <SheetFrame wide title="Öğrenme modülü ekle" onClose={onClose}
      footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label={picked.length ? `Ekle (${picked.length})` : 'Ekle'} disabled={!picked.length} onPress={() => { onAdd(picked); onClose(); }} style={FOOT} /></>}>
      <LibraryBrowser me={me} mode="pick" exclude={exclude} picked={picked} onTogglePick={(k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))} />
    </SheetFrame>
  );
}

function TaskSheet({ task, onClose, onSave }: { task: TTask | null; onClose: () => void; onSave: (v: { title: string; description: string; measure: Measure }) => void }) {
  const [title, setTitle] = useState(task?.title ?? '');
  const [desc, setDesc] = useState(task?.description ?? '');
  const [measure, setMeasure] = useState<Measure | null>(task?.measure ?? null);
  return (
    <SheetFrame title={task ? 'Uygulama görevini düzenle' : 'Uygulama görevi ekle'} onClose={onClose}
      footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label={task ? 'Kaydet' : 'Görevi ekle'} disabled={!title.trim() || !measure} onPress={() => { onSave({ title: title.trim(), description: desc.trim(), measure: measure! }); onClose(); }} style={FOOT} /></>}>
      <Text style={styles.label}>Görevin adı</Text>
      <Text style={styles.small}>Ebeveynin evde uygulamasını istediğin becerileri düşün.</Text>
      <Input placeholder="Ad" value={title} onChangeText={setTitle} maxLength={80} />
      <Text style={styles.label}>Ebeveyne açıklama ya da yönerge</Text>
      <Text style={styles.small}>Ne zaman uygulanacağını yaz ya da adım adım yönerge ver.</Text>
      <Input placeholder="Açıklama" value={desc} onChangeText={setDesc} multiline maxLength={600} />
      <Text style={styles.label}>Nasıl ölçülecek?</Text>
      <Text style={styles.small}>Bu hedefe doğru ilerlemeyi nasıl izlemek istersin?</Text>
      {MEASURES.map((m) => (
        <Pressable key={m.key} onPress={() => setMeasure(m.key)} style={[styles.opt, { flexDirection: 'row', alignItems: 'center', gap: 10 }, measure === m.key && styles.optOn]} accessibilityRole="radio" accessibilityState={{ selected: measure === m.key }}>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}><Text style={styles.optTitle}>{m.label}</Text><Text style={styles.small}>{m.hint}</Text></View>
          <Ionicons name={measure === m.key ? 'radio-button-on' : 'radio-button-off'} size={22} color={measure === m.key ? colors.navy : colors.faint} />
        </Pressable>
      ))}
    </SheetFrame>
  );
}

function TodoSheet({ todo, onClose, onSave, onArchive }: { todo: TTodo | null; onClose: () => void; onSave: (v: { title: string; description: string }) => void; onArchive?: () => void }) {
  const [title, setTitle] = useState(todo?.title ?? '');
  const [desc, setDesc] = useState(todo?.description ?? '');
  return (
    <SheetFrame title={todo ? 'Yapılacak' : 'Yapılacak ekle'} onClose={onClose}
      footer={<>{onArchive && <GhostButton label="Arşivle" danger onPress={() => { onArchive(); onClose(); }} />}<View style={{ flex: 1 }} /><GhostButton label="Vazgeç" onPress={onClose} /><Cta label={todo ? 'Kaydet' : 'Ekle'} disabled={!title.trim()} onPress={() => { onSave({ title: title.trim(), description: desc.trim() }); onClose(); }} style={FOOT} /></>}>
      {todo?.done_at && <View style={styles.result}><Text style={styles.body}>✓ {shortDate(todo.done_at)} tarihinde tamamlandı</Text></View>}
      <Text style={styles.label}>Görevin adı</Text>
      <Input placeholder="Ad" value={title} onChangeText={setTitle} maxLength={80} />
      <Text style={styles.label}>Açıklama</Text>
      <Input placeholder="Açıklama" value={desc} onChangeText={(v) => setDesc(v.slice(0, 255))} multiline />
      <Text style={[styles.tiny, { alignSelf: 'flex-end' }]}>{desc.length}/255</Text>
    </SheetFrame>
  );
}

function TextSheet({ title, label, initial, max, multiline, placeholder, onClose, onSave }: { title: string; label: string; initial: string; max: number; multiline?: boolean; placeholder?: string; onClose: () => void; onSave: (v: string) => void }) {
  const [v, setV] = useState(initial);
  return (
    <SheetFrame title={title} onClose={onClose}
      footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label="Kaydet" onPress={() => { onSave(v); onClose(); }} style={FOOT} /></>}>
      <Text style={styles.label}>{label}</Text>
      <Input value={v} onChangeText={setV} maxLength={max} multiline={multiline} placeholder={placeholder} />
    </SheetFrame>
  );
}

function DataSheet({ onClose, onSave }: { onClose: () => void; onSave: (day: string, value: number) => void }) {
  const today = new Date();
  const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const [day, setDay] = useState<string | undefined>(iso);
  const [val, setVal] = useState('');
  const n = Number(val);
  const ok = !!day && val !== '' && n >= 0 && n <= 100;
  return (
    <SheetFrame title="Gözlem verisi ekle" onClose={onClose}
      footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label="Ekle" disabled={!ok} onPress={() => { onSave(day!, Math.round(n)); onClose(); }} style={FOOT} /></>}>
      <Text style={styles.label}>Tarih</Text>
      <DateField mode="date" value={day} onChange={setDay} placeholder="Tarih seç" maximumDate={today} />
      <Text style={styles.label}>Yüzde (0–100)</Text>
      <Text style={styles.small}>Seansta gözlediğin fırsatların yüzde kaçında ebeveyn beceriyi doğru uyguladı?</Text>
      <Input value={val} onChangeText={(v) => setVal(v.replace(/[^0-9]/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="Ör. 80" />
    </SheetFrame>
  );
}

function NoteSheet({ text, onClose }: { text: string; onClose: () => void }) {
  return (
    <SheetFrame title="Not oluştur" onClose={onClose}
      footer={<><GhostButton label="Kapat" onPress={onClose} /><Cta label="Kopyala" onPress={() => Clipboard.setStringAsync(text).then(() => Alert.alert('Kopyalandı'))} style={FOOT} /></>}>
      <Text style={styles.small}>Eğitimin bugünkü durumundan derlendi; seans notuna ya da ilerleme notuna yapıştırabilirsin.</Text>
      <View style={styles.result}><Text style={[styles.body, { lineHeight: 21 }]} selectable>{text}</Text></View>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  h: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20, flexShrink: 1 },
  small: { fontSize: 12.5, color: colors.muted, flexShrink: 1 },
  tiny: { fontSize: 11, color: colors.muted },
  label: { fontSize: 13, fontWeight: '700', color: colors.navy, marginTop: 6 },
  link: { color: colors.navy, fontWeight: '700', textDecorationLine: 'underline', marginTop: 4 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: colors.navy, fontWeight: '600' },
  pchip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6 },
  pchipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  pchipText: { fontSize: 13, color: colors.navy, fontWeight: '600' },
  secBar: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  secText: { fontSize: 13, fontWeight: '700' },
  tcard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14 },
  tTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  newText: { fontSize: 12, color: colors.danger, fontWeight: '600' },
  draft: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F3E9D6', borderRadius: 10, padding: 10 },
  draftText: { fontSize: 13, color: '#7A5A22', flex: 1 },
  tabs: { borderBottomWidth: 1, borderBottomColor: colors.line, flexGrow: 0 },
  tab: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabDot: { position: 'absolute', top: -3, right: -10 },
  tabOn: { borderBottomColor: colors.navy },
  tabText: { fontSize: 13.5, color: colors.muted, fontWeight: '600', textAlign: 'center' },
  tabTextOn: { color: colors.navy, fontWeight: '700' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sum: { flexGrow: 1, flexBasis: 200, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, gap: 2 },
  prompt: { borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint, borderRadius: 12, padding: 14, gap: 4, backgroundColor: '#fff' },
  mrow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  trow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  result: { backgroundColor: '#F2F5FA', borderRadius: 10, padding: 12, gap: 4 },
  opt: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, gap: 2, backgroundColor: '#fff' },
  optOn: { borderColor: colors.navy, backgroundColor: '#EEF1F8' },
  optTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
});
