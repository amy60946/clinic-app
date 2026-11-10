// Danışan › Ebeveyn Eğitimi (rakipteki "Parent training"e sadık; kullanıcı isteği 9 Kasım 2026: "örneklere sadık kal, ekstra sistem geliştirme").
// Liste: ebeveyn seçici, "+ Eğitim ekle" (ebeveyn + eğitim hedefi), Taslaklar / Etkin eğitimler / Ustalaşılmış eğitimler, "Yeni etkinlik".
// Eğitim sayfası: durum (Taslak → Etkin onayla gönderilir → Ustalaştı), Not oluştur (tarih aralığı), ayarlar; sekmeler Özet · Öğrenme modülleri ·
// Uygulama görevleri · Hızlı yapılacaklar. Ebeveynin tamamladığı modül ve yapılacak "incelemeye hazır"; açınca incelenmiş sayılır.
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Alert, useWindowDimensions, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { colors, radius } from '../../theme';
import { Card, Cta, Input, Notice, SmallButton, IconButton, Segmented, Empty } from '../../components/ui';
import { useActionMenu, confirmSpec } from '../../components/ActionMenu';
import DateField from '../../components/DateField';
import { saveTextFile } from '../../lib/saveFile';
import { toCsv } from '../../lib/csv';
import type { ClientCtx } from '../client/ClientScreen';
import {
  Training, Detail, TModule, TTask, TTodo, TrainingStatus, STATUS_META, SECTION_TONE, MEASURES, Measure, measureLabel, itemByKey, Parent,
  loadTrainings, loadDetail, loadParents, createTraining, updateTraining, deleteTraining, addModules, moveModule, archiveModule, saveTask, archiveTask,
  saveTodo, archiveTodo, addData, deleteData, isNew, logValue, logRows, trainingNote, markReviewed, remindTraining, RATING_LABELS, RATING_COLORS,
  TrainingNotInstalled, ITEMS,
} from '../../lib/training';
import { TypeTile, StatusChip, NewDot, SheetFrame, PercentArea, ItemContent, shortDate, GhostButton, ConfirmDialog, useToast } from './parts';
import { LibraryBrowser } from './Library';
import ParentPreview from './ParentPreview';
import { ExplainCard, ExampleChips, TASK_EXAMPLES, TODO_EXAMPLES, TaskExample, TodoExample } from './Explain';
import { CoachTarget, useCoachEmit } from '../../lib/coach';

const EMPTY_DETAIL: Detail = { modules: [], tasks: [], logs: [], todos: [], data: [] };
const ORDER: TrainingStatus[] = ['draft', 'active', 'mastered'];
const FOOT = { height: 48, marginTop: 0, paddingHorizontal: 18 };
const year = (iso: string) => (iso.length <= 10 ? new Date(`${iso}T12:00:00`) : new Date(iso)).getFullYear();
const longDate = (iso: string) => `${shortDate(iso)} ${year(iso)}`;
const todayIso = () => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };
const daysAgoIso = (n: number) => { const d = new Date(Date.now() - n * 864e5); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; };

// Ebeveynin incelenmemiş etkinliği: tamamlanıp incelenmemiş modül / yapılacak, uzmanın son bakışından sonraki uygulama kaydı
export function pendingOf(t: Training, d: Detail) {
  const modules = d.modules.filter((m) => m.training_id === t.id && !m.archived && m.completed_at && !m.reviewed_at).length;
  const todos = d.todos.filter((x) => x.training_id === t.id && !x.archived && x.done_at && !x.reviewed_at).length;
  const logs = d.logs.filter((l) => l.training_id === t.id && isNew(l.created_at, t.seen_at)).length;
  return { modules, todos, logs, any: modules + todos + logs > 0 };
}

async function download(name: string, header: string[], rows: string[][]) {
  if (!rows.length) return Alert.alert('İndirilecek kayıt yok.');
  try { await saveTextFile(name, toCsv([header, ...rows])); } catch (e) { Alert.alert('Dosya oluşturulamadı', (e as Error).message); }
}

export default function TrainingTab({ client, me, sample }: ClientCtx & { sample?: boolean }) {
  const [list, setList] = useState<Training[] | null>(null);
  const [detail, setDetail] = useState<Detail>(EMPTY_DETAIL);
  const [parents, setParents] = useState<Parent[]>([]);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [parent, setParent] = useState<string>('');
  const [create, setCreate] = useState(false);
  const emit = useCoachEmit();

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
  useEffect(() => {
    loadParents(client.link_id, client.parents).then((ps) => { setParents(ps); setParent((p) => p || ps[0]?.name || ''); });
  }, [client.link_id, client.parents]);

  if (missing) return <Notice icon="cloud-offline-outline" text="Ebeveyn eğitimi için veritabanı güncellemesi bekleniyor." />;
  if (!list) return <ActivityIndicator color={colors.navy} style={{ marginTop: 30 }} />;

  const open = list.find((t) => t.id === openId);
  if (open) {
    return <TrainingDetail key={open.id} training={open} detail={detail} me={me} onBack={() => { setOpenId(null); reload(); }} onChanged={reload} />;
  }
  const mine = list.filter((t) => !parent || t.parent_name === parent);
  return (
    <View style={{ gap: 14 }}>
      {error && <Notice icon="alert-circle-outline" text={`Yüklenemedi: ${error}`} />}
      <View style={styles.headRow}>
        <Text style={styles.title}>Ebeveyn eğitimleri</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, flexShrink: 1 }}>
          {parents.map((p) => (
            <Pressable key={p.name} onPress={() => setParent(p.name)} style={[styles.pchip, p.name === parent && styles.pchipOn]} accessibilityRole="radio" accessibilityState={{ selected: p.name === parent }}>
              <Ionicons name="person-outline" size={13} color={p.name === parent ? '#fff' : colors.navy} />
              <Text style={[styles.pchipText, p.name === parent && { color: '#fff' }]}>{p.name}</Text>
            </Pressable>
          ))}
        </View>
        <View style={{ flexGrow: 1 }} />
        <Cta label="+ Eğitim ekle" onPress={() => setCreate(true)} style={{ paddingHorizontal: 16, alignSelf: 'flex-start' }} />
      </View>
      {mine.length === 0 && <Empty text={`${parent || 'Bu ebeveyn'} için henüz eğitim yok. "+ Eğitim ekle" ile başla ya da Ana ekran › Kaynak kütüphanesi'nden bir kaynak ata.`} />}
      {ORDER.map((st) => {
        const rows = mine.filter((t) => t.status === st);
        if (!rows.length) return null;
        return (
          <View key={st} style={{ gap: 8 }}>
            <Text style={styles.secHead}>{STATUS_META[st].section}</Text>
            {rows.map((t) => {
              const fresh = pendingOf(t, detail).any;
              const card = (
                <Pressable key={t.id} onPress={() => { setOpenId(t.id); emit('training_open'); }} style={({ pressed }) => [styles.tcard, { borderLeftWidth: 5, borderLeftColor: SECTION_TONE[st].bar }, pressed && { opacity: 0.85 }]}
                  accessibilityRole="button" accessibilityLabel={t.title}>
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.tTitle} numberOfLines={2}>{t.title}</Text>
                    <Text style={styles.small}>Başlangıç: {shortDate(t.started_at)}</Text>
                  </View>
                  {fresh && <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}><NewDot /><Text style={styles.newText}>Yeni etkinlik</Text></View>}
                  <Ionicons name="chevron-forward" size={18} color={colors.muted} />
                </Pressable>
              );
              // ilk kullanım turu: etkin ilk eğitim vurgulanır
              return st === 'active' && rows[0].id === t.id ? <CoachTarget key={t.id} id="training.card">{card}</CoachTarget> : card;
            })}
          </View>
        );
      })}
      {create && (
        <CreateSheet parents={parents} initial={parent} onClose={() => setCreate(false)}
          onCreate={async (p, goal) => {
            const t = await createTraining({ clinic_id: client.clinic_id, link_id: client.link_id, parent: p, goal, created_by: me.id });
            setCreate(false); setParent(p.name); await reload(); setOpenId(t.id);
          }} />
      )}
    </View>
  );
}

// "Yeni eğitim oluştur": ebeveyn + eğitim hedefi → İleri (Taslak eğitim, hedef başlık olur)
function CreateSheet({ parents, initial, onClose, onCreate }: { parents: Parent[]; initial: string; onClose: () => void; onCreate: (p: Parent, goal: string) => Promise<void> }) {
  const [who, setWho] = useState(parents.find((p) => p.name === initial) ?? parents[0] ?? null);
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const next = async () => {
    if (!who) return;
    setBusy(true);
    try { await onCreate(who, goal); } catch (e) { Alert.alert('Oluşturulamadı', (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <SheetFrame title="Yeni eğitim oluştur" onClose={onClose}
      footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label="İleri" onPress={next} busy={busy} disabled={!who || !goal.trim()} style={FOOT} /></>}>
      <Pressable onPress={() => setPreview(true)} accessibilityRole="button" style={styles.linkRow}>
        <Text style={styles.link}>Ebeveyn deneyimini önizle</Text><Ionicons name="open-outline" size={14} color={colors.navy} />
      </Pressable>
      <Text style={styles.body}>Oluşturduktan sonra ebeveynlere doğrudan uygulama görevleri ve öğrenme modülleri atayabilirsin.</Text>
      <Text style={styles.label}>Bu eğitim kimin için?</Text>
      {parents.map((p) => (
        <Pressable key={p.name} onPress={() => setWho(p)} style={[styles.opt, { flexDirection: 'row', alignItems: 'center', gap: 10 }, who?.name === p.name && styles.optOn]} accessibilityRole="radio" accessibilityState={{ selected: who?.name === p.name }}>
          <Ionicons name={who?.name === p.name ? 'radio-button-on' : 'radio-button-off'} size={20} color={who?.name === p.name ? colors.navy : colors.faint} />
          <Text style={styles.optTitle}>{p.name}</Text>
        </Pressable>
      ))}
      <Text style={styles.label}>Eğitim hedefi</Text>
      <Text style={styles.small}>Bu eğitimden beklenen sonuç ne? Bu, eğitimin adı olur.</Text>
      <Input value={goal} onChangeText={setGoal} placeholder="ör. Ebeveyn jeton sistemini kendi başına kurar ve yönetir." multiline maxLength={200} />
      {preview && <ParentPreview items={ITEMS.filter((i) => ['baslarken_r', 'abc_q'].includes(i.key))} onClose={() => setPreview(false)} />}
    </SheetFrame>
  );
}

type TabId = 'summary' | 'modules' | 'tasks' | 'todos';
type Sheet = null | 'note' | 'edit' | 'criterion' | 'data' | 'pick' | 'preview' | 'activate' | { task: TTask | null; example?: TaskExample } | { todo: TTodo | null; example?: TodoExample } | { todoReview: TTodo } | { module: TModule };

function TrainingDetail({ training: t, detail, me, onBack, onChanged }: { training: Training; detail: Detail; me: ClientCtx['me']; onBack: () => void; onChanged: () => Promise<void> }) {
  const [tab, setTab] = useState<TabId>('summary');
  const { width } = useWindowDimensions();
  const narrow = width < 640;
  const emit = useCoachEmit();
  const [menu, openMenu] = useActionMenu();
  const [toast, showToast] = useToast();
  const seenAt = useRef(t.seen_at).current;          // uygulama kayıtlarında "yeni": açılıştaki son bakış
  const [sheet, setSheet] = useState<Sheet>(null);
  useEffect(() => { updateTraining(t.id, { seen_at: new Date().toISOString() }).catch(() => {}); }, [t.id]);
  const mods = detail.modules.filter((m) => m.training_id === t.id && !m.archived);
  const tasks = detail.tasks.filter((k) => k.training_id === t.id && !k.archived);
  const todos = detail.todos.filter((k) => k.training_id === t.id && !k.archived);
  const data = detail.data.filter((x) => x.training_id === t.id);
  const pend = pendingOf({ ...t, seen_at: seenAt }, detail);
  const dots: Record<TabId, boolean> = { summary: false, modules: pend.modules > 0, tasks: pend.logs > 0, todos: pend.todos > 0 };
  const remaining = mods.filter((m) => !m.completed_at).length;
  const run = async (fn: () => Promise<unknown>) => { try { await fn(); await onChanged(); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); } };
  const setStatus = (s: TrainingStatus) => {
    if (s === t.status) return;
    if (t.status === 'draft' && s === 'active') return setSheet('activate');
    run(() => updateTraining(t.id, { status: s }));
  };
  const statusMenu = (e: any) => openMenu({ title: 'Durum', items: ORDER.map((s) => ({ label: STATUS_META[s].label, checked: s === t.status,
    info: s === 'draft' ? `${t.parent_name} taslak eğitimi görmez.` : s === 'active' ? `${t.parent_name} eğitimi aile uygulamasında görür.` : 'Eğitim tamamlandı; ebeveyn ustalaştı.',
    onPress: () => setStatus(s) })) }, e);
  const gearMenu = (e: any) => openMenu({ items: [
    { label: 'Ayrıntıları düzenle', icon: 'create-outline', onPress: () => setSheet('edit') },
    { label: 'Ebeveyn deneyimini önizle', icon: 'phone-portrait-outline', onPress: () => setSheet('preview') },
    { label: 'Sil', icon: 'trash-outline', destructive: true, onPress: () => openMenu(confirmSpec('Eğitim silinsin mi?', 'Modüller, görevler ve ebeveynin kayıtları da silinir.', 'Sil', () => run(async () => { await deleteTraining(t.id); onBack(); }))) },
  ] }, e);
  const remind = async () => {
    try {
      const r = await remindTraining(t.id);
      if (r === 'sample') { Alert.alert('Örnek ailede gönderilmez', 'Gerçek ailede ebeveyne uygulama görevleri için bildirim gider.'); return; }
      Alert.alert(r === 'sent' ? 'Hatırlatma gönderildi' : r === 'recent' ? 'Son 12 saatte hatırlatma gönderildi' : 'Hatırlatma için veritabanı güncellemesi bekleniyor',
        r === 'sent' ? `${t.parent_name} uygulama görevleri için bildirim aldı.` : '');
    } catch (e) { Alert.alert('Gönderilemedi', (e as Error).message); }
  };

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
          <Text style={styles.small}>Başlangıç: {shortDate(t.started_at)}{'\u00a0'}· Atanan: {t.parent_name}</Text>
        </View>
        <StatusChip status={t.status} onPress={statusMenu} />
        <SmallButton label="Not oluştur" onPress={() => setSheet('note')} />
        <IconButton name="settings-outline" label="Eğitim ayarları" onPress={gearMenu as any} />
      </View>
      {t.status === 'draft' && (
        <View style={styles.draft}>
          <Ionicons name="eye-off-outline" size={16} color="#7A5A00" />
          <Text style={styles.draftText}>
            Bu eğitim taslak; {t.parent_name} henüz göremez. Görünmesi için{' '}
            <Text style={{ fontWeight: '700', textDecorationLine: 'underline' }} onPress={() => setSheet('activate')} accessibilityRole="link">durumu Etkin yap</Text>.
          </Text>
        </View>
      )}
      {/* dar ekranda 2 × 2, kaydırma yok (yan kaydırmada dördüncü sekme ekran dışında kalıyordu) */}
      <View style={styles.tabs} accessibilityRole="tablist">
        {(narrow ? [TABS.slice(0, 2), TABS.slice(2)] : [TABS]).map((row, ri) => (
          <View key={ri} style={{ flexDirection: 'row' }}>
            {row.map((x) => (
              <CoachTarget key={x.id} id={`training.tab.${x.id}`} style={{ flex: 1 }}>
                <Pressable onPress={() => { setTab(x.id); emit(`training_tab_${x.id}`); }} style={[styles.tab, tab === x.id && styles.tabOn]} accessibilityRole="tab" accessibilityState={{ selected: tab === x.id }}>
                  <View>
                    <Text style={[styles.tabText, tab === x.id && styles.tabTextOn]} numberOfLines={1}>{x.label}</Text>
                    {dots[x.id] && <View style={styles.tabDot}><NewDot /></View>}
                  </View>
                </Pressable>
              </CoachTarget>
            ))}
          </View>
        ))}
      </View>

      {tab === 'summary' && (
        <View style={{ gap: 12 }}>
          <View style={styles.cards}>
            {mods.length > 0
              ? <SumCard title="Öğrenme modülleri" dot={pend.modules > 0}
                  line={pend.modules ? `${pend.modules} incelemeye hazır` : remaining ? `${remaining} kaldı` : `${mods.length} atanmış modül`}
                  action={pend.modules ? 'İncele' : 'Gör'} onAction={() => setTab('modules')} />
              : <AddCard title="+ Etkileşimli öğrenme modülü ekle" text="En uygun: kavramları tanıtmak ve ebeveynin konuyu ne kadar anladığını görmek." onPress={() => setSheet('pick')} />}
            {tasks.length > 0
              ? <SumCard title="Uygulama görevleri" line={`${tasks.length} uygulama görevi`} action={t.status === 'active' ? 'Hatırlatma gönder' : 'Gör'}
                  onAction={t.status === 'active' ? remind : () => setTab('tasks')} />
              : <AddCard title="+ Uygulama görevi ekle" text="En uygun: öğrenilenleri evde uygulamak ve yeni bir alışkanlık kurmak. Bir hedef koyup ebeveynden bu hedefe doğru ilerlemeyi kaydetmesini de isteyebilirsin." onPress={() => setSheet({ task: null })} />}
            {todos.length > 0
              ? <SumCard title="Hızlı yapılacaklar" dot={pend.todos > 0} line={`${todos.filter((x) => !x.done_at).length} etkin görev`} action="Gör" onAction={() => setTab('todos')} />
              : <AddCard title="+ Hızlı yapılacak ekle" text="En uygun: ebeveynin seans dışında bir kez yapmasını istediğin her iş." onPress={() => setSheet({ todo: null })} />}
          </View>
          <Card style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <Text style={[styles.h, { flexGrow: 1, flexShrink: 1, minWidth: 180 }]}>Ustalık ölçütüne doğru gözlem verisi</Text>
              <Pressable onPress={() => t.criterion && setSheet('data')} disabled={!t.criterion} style={[styles.smallBtn, !t.criterion && { opacity: 0.4 }]} accessibilityRole="button" accessibilityState={{ disabled: !t.criterion }}>
                <Text style={styles.smallBtnText}>+ Veri ekle</Text>
              </Pressable>
              <IconButton name="download-outline" label="Gözlem verisini indir" onPress={() => download(`gozlem-${t.id.slice(0, 6)}.csv`, ['Tarih', 'Yüzde'], data.map((x) => [x.day, String(x.value)]))} />
            </View>
            <Pressable onPress={() => setSheet('criterion')} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }} accessibilityRole="button" accessibilityLabel="Ustalık ölçütünü düzenle">
              <Text style={[styles.body, { flex: 1 }, !t.criterion && { fontWeight: '700' }]}>{t.criterion || 'Henüz ustalık ölçütü yok!'}</Text>
              <Ionicons name="pencil-outline" size={16} color={colors.muted} />
            </Pressable>
            {t.criterion ? <DataView data={data} target={targetOf(t.criterion)} onDelete={(id) => run(() => deleteData(id))} /> : (
              <View style={styles.placeholder}>
                <Text style={styles.h}>Takip için ölçüm türü ekle</Text>
                <Text style={[styles.small, { textAlign: 'center' }]}>Ayarlandığında bu eğitim için gözlem verisini grafikte görebilirsin.</Text>
                <SmallButton label="Ustalık ölçütü ekle" onPress={() => setSheet('criterion')} />
              </View>
            )}
          </Card>
        </View>
      )}

      {tab === 'modules' && (
        <View style={{ gap: 8 }}>
          <View style={styles.listHead}>
            <Text style={[styles.h, { flex: 1 }]}>{mods.length} etkin modül</Text>
            <SmallButton label="+ Daha fazla ekle" onPress={() => setSheet('pick')} />
          </View>
          {mods.length === 0 && <AddCard title="+ Etkileşimli öğrenme modülü ekle" text="En uygun: kavramları tanıtmak ve ebeveynin konuyu ne kadar anladığını görmek." onPress={() => setSheet('pick')} />}
          {mods.map((m, i) => {
            const it = itemByKey(m.item_key);
            const status = m.completed_at ? (m.total ? `Tamamlandı (${m.correct ?? 0}/${m.total})` : 'Tamamlandı') : t.status === 'draft' ? 'Önizle' : 'Başlamadı';
            return (
              <View key={m.id} style={styles.mrow}>
                <View style={{ width: 32 }}>
                  <View style={styles.arrowSlot}>{i > 0 && <IconButton name="chevron-up" label="Yukarı taşı" size={16} onPress={() => run(() => moveModule(mods, m.id, -1))} />}</View>
                  <View style={styles.arrowSlot}>{i < mods.length - 1 && <IconButton name="chevron-down" label="Aşağı taşı" size={16} onPress={() => run(() => moveModule(mods, m.id, 1))} />}</View>
                </View>
                <Pressable onPress={() => setSheet({ module: m })} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, minWidth: 0 }} accessibilityRole="button" accessibilityLabel={`${it?.title ?? m.item_key} incele`}>
                  {it && <TypeTile type={it.type} />}
                  <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
                    <Text style={styles.tTitle}>{it?.title ?? m.item_key}</Text>
                    <Text style={[styles.small, !!m.completed_at && { color: colors.ok, fontWeight: '600' }]}>{status}</Text>
                  </View>
                  {!!m.completed_at && !m.reviewed_at && <NewDot />}
                </Pressable>
              </View>
            );
          })}
        </View>
      )}

      {tab === 'tasks' && (
        <View style={{ gap: 8 }}>
          <View style={styles.listHead}>
            <Text style={[styles.h, { flex: 1 }]}>{tasks.length} uygulama görevi</Text>
            <SmallButton label="+ Uygulama görevi" onPress={() => setSheet({ task: null })} />
            <IconButton name="download-outline" label="Uygulama kayıtlarını indir" onPress={() => download(`uygulama-${t.id.slice(0, 6)}.csv`, ['Tarih', 'Görev', 'Ölçüm', 'Değer', 'Düşünce'], logRows(t, detail))} />
          </View>
          <CoachTarget id="training.explain.tasks"><ExplainCard kind="tasks" empty={tasks.length === 0} onExample={(e) => setSheet({ task: null, example: e })} /></CoachTarget>
          {tasks.map((k) => (
            <TaskRow key={k.id} task={k} logs={detail.logs.filter((l) => l.task_id === k.id)} fresh={detail.logs.some((l) => l.task_id === k.id && isNew(l.created_at, seenAt))}
              onMenu={(e) => openMenu({ items: [
                { label: 'Düzenle', icon: 'create-outline', onPress: () => setSheet({ task: k }) },
                { label: 'Arşivle', icon: 'archive-outline', destructive: true, onPress: () => run(() => archiveTask(k.id)) },
              ] }, e)} />
          ))}
        </View>
      )}

      {tab === 'todos' && (
        <View style={{ gap: 8 }}>
          <View style={styles.listHead}>
            <Text style={[styles.h, { flex: 1 }]}>{todos.length} hızlı yapılacak</Text>
            <SmallButton label="+ Yapılacak ekle" onPress={() => setSheet({ todo: null })} />
          </View>
          <CoachTarget id="training.explain.todos"><ExplainCard kind="todos" empty={todos.length === 0} onExample={(e) => setSheet({ todo: null, example: e })} /></CoachTarget>
          {todos.map((k) => (
            <Pressable key={k.id} onPress={() => { setSheet({ todoReview: k }); if (k.done_at && !k.reviewed_at) markReviewed('parent_training_todos', k.id).then(onChanged); }} style={styles.mrow} accessibilityRole="button">
              <View style={{ flex: 1, minWidth: 0, gap: 2, paddingLeft: 4 }}>
                <Text style={[styles.small, !!k.done_at && { color: colors.ok, fontWeight: '600' }]}>{k.done_at ? `Tamamlandı\u00a0· ${longDate(k.done_at)}` : 'Tamamlanmadı'}</Text>
                <Text style={styles.upper}>{k.title}</Text>
              </View>
              {!!k.done_at && !k.reviewed_at && <NewDot />}
              {!!k.done_at && <Ionicons name="checkmark-circle" size={22} color={colors.ok} />}
            </Pressable>
          ))}
        </View>
      )}

      {toast}
      {sheet === 'activate' && (
        <ConfirmDialog title="Eğitim Etkin olarak işaretlensin mi?" lead="Bu işlem eğitimi ebeveyne gönderir."
          body={`Atanan ebeveyn (${t.parent_name}) bu eğitime aile uygulamasından doğrudan ulaşır. Durumu daha sonra değiştirebilirsin.`}
          confirm="Durumu güncelle" onCancel={() => setSheet(null)} onConfirm={() => { setSheet(null); run(() => updateTraining(t.id, { status: 'active' })); }} />
      )}
      {sheet === 'note' && <NoteSheet training={t} detail={detail} onClose={() => setSheet(null)} />}
      {sheet === 'edit' && <TextSheet title="Ayrıntıları düzenle" label="Eğitim hedefi" multiline initial={t.title} max={200} onClose={() => setSheet(null)} onSave={(v) => run(() => updateTraining(t.id, { title: v.trim() || 'Adsız eğitim' }))} />}
      {sheet === 'criterion' && <TextSheet title="Ustalık ölçütü" label="Ölçüt" multiline initial={t.criterion ?? ''} max={400}
        placeholder="ör. Ebeveyn, zorlayıcı davranışın öncülünü fırsatların %80'inde doğru belirler; art arda 3 seansta."
        onClose={() => setSheet(null)} onSave={(v) => run(() => updateTraining(t.id, { criterion: v.trim() || null }))} />}
      {sheet === 'data' && <DataSheet onClose={() => setSheet(null)} onSave={(day, v) => run(() => addData(t.id, day, v))} />}
      {sheet === 'pick' && <PickSheet me={me} exclude={mods.map((m) => m.item_key)} onClose={() => setSheet(null)} onAdd={(keys) => run(() => addModules(t.id, keys, detail.modules.filter((m) => m.training_id === t.id)))} />}
      {sheet === 'preview' && <ParentPreview training={t} detail={detail} onClose={() => setSheet(null)} />}
      {sheet && typeof sheet === 'object' && 'task' in sheet && <TaskSheet task={sheet.task} example={sheet.example} onClose={() => setSheet(null)}
        onSave={(v) => run(async () => { await saveTask({ ...v, id: sheet.task?.id, training_id: t.id, position: tasks.length }); if (!sheet.task) showToast('Görev eklendi!'); })} />}
      {sheet && typeof sheet === 'object' && 'todo' in sheet && <TodoSheet todo={sheet.todo} example={sheet.example} onClose={() => setSheet(null)}
        onSave={(v) => run(async () => { await saveTodo({ ...v, id: sheet.todo?.id, training_id: t.id }); if (!sheet.todo) showToast('Görev eklendi!'); })} />}
      {sheet && typeof sheet === 'object' && 'todoReview' in sheet && <TodoReview todo={sheet.todoReview} onClose={() => setSheet(null)}
        onEdit={() => setSheet({ todo: sheet.todoReview })} onArchive={() => { setSheet(null); run(() => archiveTodo(sheet.todoReview.id)); }} />}
      {sheet && typeof sheet === 'object' && 'module' in sheet && <ModuleReview module={sheet.module} onOpen={() => { if (sheet.module.completed_at && !sheet.module.reviewed_at) markReviewed('parent_training_modules', sheet.module.id).then(onChanged); }}
        onClose={() => setSheet(null)} onArchive={() => run(() => archiveModule(sheet.module.id))} />}
    </View>
  );
}

function SumCard({ title, line, action, onAction, dot }: { title: string; line: string; action: string; onAction: () => void; dot?: boolean }) {
  return (
    <View style={styles.sum}>
      <Text style={styles.h}>{title}</Text>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>{dot && <NewDot />}<Text style={styles.small}>{line}</Text></View>
      <Pressable onPress={onAction} hitSlop={6} accessibilityRole="button"><Text style={styles.link}>{action}</Text></Pressable>
    </View>
  );
}

function AddCard({ title, text, onPress }: { title: string; text: string; onPress: () => void }) {
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
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
        <IconButton name={open ? 'caret-down' : 'caret-forward'} label={open ? 'Kayıtları gizle' : 'Kayıtları göster'} size={16} onPress={() => setOpen((o) => !o)} />
        <Pressable onPress={() => setOpen((o) => !o)} style={{ flex: 1, minWidth: 0, gap: 2 }} accessibilityRole="button" accessibilityState={{ expanded: open }}>
          <Text style={styles.upper}>{task.title}</Text>
          <Text style={styles.small}>Başlangıç: {longDate(task.created_at)}{'\u00a0'}· {measureLabel(task.measure)}</Text>
        </Pressable>
        {fresh && <NewDot />}
        {task.measure !== 'none' && (
          <>
            <IconButton name="list-outline" label="Tablo" size={18} onPress={() => { setView('table'); setOpen(true); }} />
            <IconButton name="stats-chart-outline" label="Grafik" size={18} onPress={() => { setView('chart'); setOpen(true); }} />
          </>
        )}
        <IconButton name="settings-outline" label="Görev ayarları" onPress={onMenu as any} />
      </View>
      {open && (
        <View style={{ gap: 8 }}>
          {!!task.description && <Text style={styles.body}>{task.description}</Text>}
          {logs.length === 0 ? <Text style={styles.small}>Henüz kayıt yok.</Text> : view === 'chart' && task.measure !== 'none' ? (
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
        </View>
      )}
    </View>
  );
}

function ModuleReview({ module: m, onClose, onArchive, onOpen }: { module: TModule; onClose: () => void; onArchive: () => void; onOpen: () => void }) {
  const it = itemByKey(m.item_key);
  useEffect(() => { onOpen(); }, []);
  if (!it) return null;
  return (
    <SheetFrame title="Etkileşimli modülü incele" onClose={onClose}
      footer={<GhostButton label="Arşivle" danger onPress={() => { onArchive(); onClose(); }} />}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}><TypeTile type={it.type} /><Text style={[styles.title, { flex: 1, fontSize: 18 }]}>{it.title}</Text></View>
      <View style={styles.result}>
        <Text style={styles.body}><Text style={{ fontWeight: '700' }}>Sonuç: </Text>{m.completed_at ? `✓ ${longDate(m.completed_at)} tarihinde tamamlandı` : 'Henüz tamamlanmadı'}</Text>
        {m.completed_at && m.total ? <Text style={styles.body}>%{Math.round(((m.correct ?? 0) / m.total) * 100)} ({m.total} sorudan {m.correct ?? 0} doğru)</Text> : null}
      </View>
      <ItemContent item={it} answers={m.answers} completed={!!m.completed_at} />
    </SheetFrame>
  );
}

// "Yapılacağı incele": sonuç, ebeveynin "Nasıl geçti?" puanı ve düşüncesi (zaman çizelgesi), Düzenle / Arşivle
function TodoReview({ todo, onClose, onEdit, onArchive }: { todo: TTodo; onClose: () => void; onEdit: () => void; onArchive: () => void }) {
  return (
    <SheetFrame title="Yapılacağı incele" onClose={onClose}
      footer={<><GhostButton label="Arşivle" danger onPress={onArchive} /><View style={{ flex: 1 }} /><GhostButton label="Düzenle" onPress={onEdit} /></>}>
      <Text style={[styles.title, { fontSize: 18 }]}>{todo.title}</Text>
      {!!todo.description && <Text style={styles.body}>{todo.description}</Text>}
      <Text style={styles.label}>Sonuç:</Text>
      {todo.done_at ? (
        <View style={styles.timeline}>
          <Text style={[styles.small, { width: 56 }]}>{shortDate(todo.done_at)}</Text>
          <View style={[styles.tlDot, { backgroundColor: RATING_COLORS[todo.rating ?? 0] || colors.ok }]} />
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <Text style={[styles.body, { fontWeight: '700' }]}>{todo.rating ? RATING_LABELS[todo.rating] : 'Tamamlandı'}</Text>
            {!!todo.reflection && <Text style={styles.body}>{todo.reflection}</Text>}
          </View>
        </View>
      ) : <Text style={styles.small}>Ebeveyn henüz tamamlamadı.</Text>}
    </SheetFrame>
  );
}

// Modül seçici: solda süzgeçler, ortada sonuçlar ("Seç" / "Kaldır"), sağda önizleme; altta "n modül seçildi · Temizle"
function PickSheet({ me, exclude, onClose, onAdd }: { me: ClientCtx['me']; exclude: string[]; onClose: () => void; onAdd: (keys: string[]) => void }) {
  const [picked, setPicked] = useState<string[]>([]);
  return (
    <SheetFrame wide title="Öğrenme modülü ekle" onClose={onClose}
      footer={<>
        <Text style={[styles.small, { flexShrink: 1 }]}>{picked.length} modül seçildi</Text>
        {picked.length > 0 && <Pressable onPress={() => setPicked([])} hitSlop={6}><Text style={styles.link}>Temizle</Text></Pressable>}
        <View style={{ flex: 1 }} />
        <GhostButton label="Vazgeç" onPress={onClose} />
        <Cta label="Modülleri ekle" disabled={!picked.length} onPress={() => { onAdd(picked); onClose(); }} style={FOOT} />
      </>}>
      <LibraryBrowser me={me} mode="pick" exclude={exclude} picked={picked} onTogglePick={(k) => setPicked((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]))} />
    </SheetFrame>
  );
}

function TaskSheet({ task, example, onClose, onSave }: { task: TTask | null; example?: TaskExample; onClose: () => void; onSave: (v: { title: string; description: string; measure: Measure }) => void }) {
  const [title, setTitle] = useState(task?.title ?? example?.title ?? '');
  const [desc, setDesc] = useState(task?.description ?? example?.description ?? '');
  const [measure, setMeasure] = useState<Measure>(task?.measure ?? example?.measure ?? 'frequency');
  const fill = (e: TaskExample) => { setTitle(e.title); setDesc(e.description); setMeasure(e.measure); };
  return (
    <SheetFrame title={task ? 'Uygulama görevini düzenle' : 'Uygulama görevi ekle'} onClose={onClose}
      footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label={task ? 'Kaydet' : 'Görevi ekle'} disabled={!title.trim()} onPress={() => { onSave({ title: title.trim(), description: desc.trim(), measure }); onClose(); }} style={FOOT} /></>}>
      {!task && <ExampleChips items={TASK_EXAMPLES} onPick={fill} />}
      <Text style={styles.label}>Görevin adı</Text>
      <Text style={styles.small}>Ebeveynin evde tekrar tekrar uygulamasını istediğin beceri.</Text>
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

function TodoSheet({ todo, example, onClose, onSave }: { todo: TTodo | null; example?: TodoExample; onClose: () => void; onSave: (v: { title: string; description: string }) => void }) {
  const [title, setTitle] = useState(todo?.title ?? example?.title ?? '');
  const [desc, setDesc] = useState(todo?.description ?? example?.description ?? '');
  return (
    <SheetFrame title={todo ? 'Yapılacağı düzenle' : 'Yapılacak ekle'} onClose={onClose}
      footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label={todo ? 'Kaydet' : 'Yapılacağı ekle'} disabled={!title.trim()} onPress={() => { onSave({ title: title.trim(), description: desc.trim() }); onClose(); }} style={FOOT} /></>}>
      {!todo && <ExampleChips items={TODO_EXAMPLES} onPick={(e) => { setTitle(e.title); setDesc(e.description.slice(0, 255)); }} />}
      <Text style={styles.label}>Yapılacak iş</Text>
      <Text style={styles.small}>Ebeveynin bir kez yapıp işaretleyeceği iş.</Text>
      <Input placeholder="Ad" value={title} onChangeText={setTitle} maxLength={80} />
      <Text style={styles.label}>Ebeveyne açıklama ya da yönerge</Text>
      <Input placeholder="Açıklama" value={desc} onChangeText={(v) => setDesc(v.slice(0, 255))} multiline />
      <Text style={[styles.tiny, { alignSelf: 'flex-end' }]}>{desc.length} / 255</Text>
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
  const [day, setDay] = useState<string | undefined>(todayIso());
  const [val, setVal] = useState('');
  const n = Number(val);
  const ok = !!day && val !== '' && n >= 0 && n <= 100;
  return (
    <SheetFrame title="Gözlem verisi ekle" onClose={onClose}
      footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label="Ekle" disabled={!ok} onPress={() => { onSave(day!, Math.round(n)); onClose(); }} style={FOOT} /></>}>
      <Text style={styles.label}>Tarih</Text>
      <DateField mode="date" value={day} onChange={setDay} placeholder="Tarih seç" maximumDate={new Date()} />
      <Text style={styles.label}>Yüzde (0–100)</Text>
      <Text style={styles.small}>Seansta gözlediğin fırsatların yüzde kaçında ebeveyn beceriyi doğru uyguladı?</Text>
      <Input value={val} onChangeText={(v) => setVal(v.replace(/[^0-9]/g, '').slice(0, 3))} keyboardType="number-pad" placeholder="ör. 80" />
    </SheetFrame>
  );
}

// "Not oluştur": önce tarih aralığı (son 7 gün → bugün), sonra atananlar listesi; "Tarih aralığını değiştir" / "Kopyala"
function NoteSheet({ training, detail, onClose }: { training: Training; detail: Detail; onClose: () => void }) {
  const [from, setFrom] = useState<string | undefined>(daysAgoIso(7));
  const [to, setTo] = useState<string | undefined>(todayIso());
  const [text, setText] = useState<string | null>(null);
  if (text === null) {
    return (
      <SheetFrame title="İlerleme notu oluştur" onClose={onClose}
        footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label="Not oluştur" disabled={!from || !to || from > to} onPress={() => setText(trainingNote(training, detail, from!, to!, longDate))} style={FOOT} /></>}>
        <Text style={styles.label}>Başlangıç tarihi</Text>
        <DateField mode="date" value={from} onChange={setFrom} placeholder="Başlangıç tarihini seç" maximumDate={new Date()} />
        <Text style={styles.label}>Bitiş tarihi</Text>
        <DateField mode="date" value={to} onChange={setTo} placeholder="Bugün" maximumDate={new Date()} />
      </SheetFrame>
    );
  }
  return (
    <SheetFrame title="İlerleme notu" onClose={onClose}
      footer={<><GhostButton label="Tarih aralığını değiştir" onPress={() => setText(null)} /><Cta label="Kopyala" onPress={() => Clipboard.setStringAsync(text).then(() => Alert.alert('Kopyalandı'))} style={FOOT} /></>}>
      <View style={styles.result}><Text style={[styles.body, { lineHeight: 21 }]} selectable>{text}</Text></View>
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  headRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  listHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { fontSize: 20, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  h: { fontSize: 15, fontWeight: '700', color: colors.text, flexShrink: 1 },
  body: { fontSize: 14, color: colors.text, lineHeight: 20, flexShrink: 1 },
  small: { fontSize: 12.5, color: colors.muted, flexShrink: 1 },
  tiny: { fontSize: 11, color: colors.muted },
  upper: { fontSize: 14, fontWeight: '700', color: colors.navy, textTransform: 'uppercase', letterSpacing: 0.3, flexShrink: 1 },
  label: { fontSize: 13, fontWeight: '700', color: colors.navy, marginTop: 6 },
  link: { color: colors.navy, fontWeight: '700', textDecorationLine: 'underline', marginTop: 4 },
  linkRow: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' },
  back: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' },
  backText: { color: colors.navy, fontWeight: '600' },
  pchip: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 6 },
  pchipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  pchipText: { fontSize: 13, color: colors.navy, fontWeight: '600' },
  secHead: { fontSize: 13, fontWeight: '700', color: colors.muted, marginTop: 4 },
  tcard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14 },
  tTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  newText: { fontSize: 12, color: colors.danger, fontWeight: '600' },
  draft: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FFF6DD', borderRadius: 10, padding: 10 },
  draftText: { fontSize: 13, color: '#7A5A00', flex: 1 },
  tabs: { borderBottomWidth: 1, borderBottomColor: colors.line, flexGrow: 0 },
  tab: { alignItems: 'center', justifyContent: 'center', paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabDot: { position: 'absolute', top: -3, right: -10 },
  tabOn: { borderBottomColor: colors.navy },
  tabText: { fontSize: 13.5, color: colors.muted, fontWeight: '600', textAlign: 'center' },
  tabTextOn: { color: colors.navy, fontWeight: '700' },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  sum: { flexGrow: 1, flexBasis: 200, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, gap: 2 },
  prompt: { flexGrow: 1, flexBasis: 200, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint, borderRadius: 12, padding: 14, gap: 4, backgroundColor: '#fff' },
  placeholder: { alignItems: 'center', gap: 6, paddingVertical: 16, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.line, borderRadius: 12 },
  smallBtn: { borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 },
  smallBtnText: { fontSize: 13, fontWeight: '600', color: colors.navy },
  mrow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 10 },
  arrowSlot: { height: 32, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  trow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  result: { backgroundColor: '#F2F5FA', borderRadius: 10, padding: 12, gap: 4 },
  timeline: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#F7F8FB', borderRadius: 10, padding: 12 },
  tlDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  opt: { borderWidth: 1, borderColor: colors.line, borderRadius: 10, padding: 12, gap: 2, backgroundColor: '#fff' },
  optOn: { borderColor: colors.navy, backgroundColor: '#EEF1F8' },
  optTitle: { fontSize: 14, fontWeight: '700', color: colors.navy, flexShrink: 1 },
});
