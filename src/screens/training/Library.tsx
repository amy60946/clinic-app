// Ebeveyn eğitimi kaynak kütüphanesi (rakipteki "Parent training resource library"ye sadık): solda arama, Favoriler, Tür ve Konu
// süzgeçleri; ortada kartlar (tür simgesi, başlık, tek satır açıklama, kalp); öğeye dokununca sağda (dar ekranda pencere) önizleme,
// "Ebeveyn eğitimi olarak ata", ilgili etiketler ve açıklama. İki kullanım: ana ekrandan sayfa (ata) ya da eğitimden seçici (ekle).
import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, useWindowDimensions, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { Input, Cta, SmallButton, IconButton, Empty } from '../../components/ui';
import { ClinicianMe, Client } from '../../lib/clinic';
import {
  ITEMS, TOPICS, TYPES, LibItem, ItemType, topicLabel, loadFavorites, saveFavorites, loadTrainings, createTraining, addModules,
  loadDetail, parentsOf, Training, TrainingNotInstalled,
} from '../../lib/training';
import { TypeTile, ItemContent, SheetFrame, StatusChip, GhostButton } from './parts';
import ParentPreview from './ParentPreview';

type Filters = { q: string; fav: boolean; types: ItemType[]; topics: string[] };
const EMPTY: Filters = { q: '', fav: false, types: [], topics: [] };

export function useLibraryFilter(f: Filters, favs: string[], exclude: string[] = []) {
  return useMemo(() => {
    const q = f.q.trim().toLocaleLowerCase('tr');
    return ITEMS.filter((it) => !exclude.includes(it.key)
      && (!f.fav || favs.includes(it.key))
      && (!f.types.length || f.types.includes(it.type))
      && (!f.topics.length || it.topics.some((t) => f.topics.includes(t)))
      && (!q || `${it.title} ${it.desc}`.toLocaleLowerCase('tr').includes(q)));
  }, [f, favs, exclude]);
}

function Check({ on, label, onPress, icon }: { on: boolean; label: string; onPress: () => void; icon?: React.ReactNode }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked: on }} style={styles.check}>
      <View style={[styles.radio, on && styles.radioOn]}>{on && <Ionicons name="checkmark" size={11} color="#fff" />}</View>
      {icon}
      <Text style={styles.checkText}>{label}</Text>
    </Pressable>
  );
}

function FilterPanel({ f, set }: { f: Filters; set: (f: Filters) => void }) {
  const toggle = <T,>(xs: T[], x: T) => (xs.includes(x) ? xs.filter((y) => y !== x) : [...xs, x]);
  return (
    <View style={{ gap: 4 }}>
      <Check on={f.fav} label="Favoriler" onPress={() => set({ ...f, fav: !f.fav })} icon={<Ionicons name="heart-outline" size={15} color={colors.muted} />} />
      <Text style={styles.fhead}>Tür</Text>
      {TYPES.map((t) => <Check key={t.key} on={f.types.includes(t.key)} label={t.label} onPress={() => set({ ...f, types: toggle(f.types, t.key) })} icon={<TypeTile type={t.key} size={20} />} />)}
      <Text style={styles.fhead}>Konular</Text>
      {TOPICS.map((t) => <Check key={t.key} on={f.topics.includes(t.key)} label={t.label} onPress={() => set({ ...f, topics: toggle(f.topics, t.key) })} />)}
    </View>
  );
}

function ItemCard({ it, on, fav, onPress, onFav, picked }: { it: LibItem; on: boolean; fav: boolean; onPress: () => void; onFav: () => void; picked?: boolean }) {
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={it.title}
      style={({ pressed }) => [styles.card, on && { borderColor: colors.navy }, pressed && { opacity: 0.85 }]}>
      <TypeTile type={it.type} />
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={styles.cardTitle} numberOfLines={2}>{it.title}</Text>
        <Text style={styles.cardDesc} numberOfLines={1}>{it.desc}</Text>
      </View>
      {picked !== undefined && <Ionicons name={picked ? 'checkmark-circle' : 'ellipse-outline'} size={22} color={picked ? colors.ok : colors.faint} />}
      <Pressable onPress={onFav} hitSlop={8} accessibilityRole="button" accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}>
        <Ionicons name={fav ? 'heart' : 'heart-outline'} size={20} color={fav ? colors.danger : colors.muted} />
      </Pressable>
    </Pressable>
  );
}

function Drawer({ it, fav, onFav, onClose, action, inSheet }: { it: LibItem; fav: boolean; onFav: () => void; onClose: () => void; action: React.ReactNode; inSheet?: boolean }) {
  return (
    <View style={{ gap: 12 }}>
      {!inSheet && (
        <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 8 }}>
          <Text style={[styles.cardTitle, { flex: 1, fontSize: 17 }]}>{it.title}</Text>
          <IconButton name="close" label="Kapat" onPress={onClose} />
        </View>
      )}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1 }}>{action}</View>
        <Pressable onPress={onFav} hitSlop={8} accessibilityRole="button" accessibilityLabel={fav ? 'Favorilerden çıkar' : 'Favorilere ekle'}>
          <Ionicons name={fav ? 'heart' : 'heart-outline'} size={22} color={fav ? colors.danger : colors.muted} />
        </Pressable>
      </View>
      <View style={styles.preview}><ItemContent item={it} /></View>
      <Text style={styles.fhead}>İlgili etiketler</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {it.topics.map((t) => <View key={t} style={styles.tag}><Text style={styles.tagText}>{topicLabel(t)}</Text></View>)}
      </View>
      <Text style={styles.fhead}>Açıklama</Text>
      <Text style={styles.body}>{it.desc}</Text>
    </View>
  );
}

// Kütüphane gövdesi: page = ata; pick = seçip eğitime ekle
export function LibraryBrowser({ me, mode, exclude, onAssign, picked, onTogglePick }: {
  me: ClinicianMe; mode: 'page' | 'pick'; exclude?: string[];
  onAssign?: (it: LibItem) => void;
  picked?: string[]; onTogglePick?: (key: string) => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 980;
  const [f, setF] = useState<Filters>(EMPTY);
  const [favs, setFavs] = useState<string[]>([]);
  const [sel, setSel] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => { loadFavorites(me.id).then(setFavs); }, [me.id]);
  const list = useLibraryFilter(f, favs, exclude);
  const it = sel ? ITEMS.find((x) => x.key === sel) ?? null : null;
  const fav = (k: string) => { const next = favs.includes(k) ? favs.filter((x) => x !== k) : [...favs, k]; setFavs(next); saveFavorites(me.id, next); };
  const any = f.fav || f.types.length > 0 || f.topics.length > 0 || !!f.q.trim();
  const action = it && (mode === 'page'
    ? <Cta label="Ebeveyn eğitimi olarak ata" onPress={() => onAssign?.(it)} />
    : <Cta label={picked?.includes(it.key) ? 'Seçildi' : 'Seç'} onPress={() => onTogglePick?.(it.key)} />);
  const drawer = it && <Drawer it={it} fav={favs.includes(it.key)} onFav={() => fav(it.key)} onClose={() => setSel(null)} action={action} inSheet={!wide} />;

  const listCol = (
    <View style={{ flex: 1, minWidth: 0, gap: 8 }}>
      <Input placeholder="Kaynaklarda ara" value={f.q} onChangeText={(q) => setF({ ...f, q })} accessibilityLabel="Kaynaklarda ara" />
      {!wide && (
        <Pressable onPress={() => setFiltersOpen((o) => !o)} style={styles.filterBtn} accessibilityRole="button">
          <Ionicons name="options-outline" size={16} color={colors.navy} />
          <Text style={{ color: colors.navy, fontWeight: '600' }}>Süzgeçler{any ? ` (${f.types.length + f.topics.length + (f.fav ? 1 : 0)})` : ''}</Text>
          <Ionicons name={filtersOpen ? 'chevron-up' : 'chevron-down'} size={14} color={colors.navy} />
        </Pressable>
      )}
      {!wide && filtersOpen && <View style={styles.filterBox}><FilterPanel f={f} set={setF} /></View>}
      {any && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.count}>{list.length} sonuç</Text>
          <Pressable onPress={() => setF(EMPTY)} hitSlop={6}><Text style={styles.reset}>Sıfırla</Text></Pressable>
        </View>
      )}
      {list.length === 0 && <Empty text={f.types.some((t) => t === 'video' || t === 'pdf') ? 'Bu türde henüz kaynak yok.' : 'Aramana uyan kaynak yok.'} />}
      {list.map((x) => (
        <ItemCard key={x.key} it={x} on={x.key === sel} fav={favs.includes(x.key)} onPress={() => setSel(x.key)} onFav={() => fav(x.key)}
          picked={mode === 'pick' ? !!picked?.includes(x.key) : undefined} />
      ))}
    </View>
  );

  if (wide) {
    return (
      <View style={{ flexDirection: 'row', gap: 18, alignItems: 'flex-start' }}>
        <View style={{ width: 230 }}><FilterPanel f={f} set={setF} /></View>
        {listCol}
        {drawer && <View style={styles.drawer}>{drawer}</View>}
      </View>
    );
  }
  return (
    <>
      {listCol}
      {it && (
        <SheetFrame title={it.title} onClose={() => setSel(null)}>
          {drawer}
        </SheetFrame>
      )}
    </>
  );
}

// Ana ekrandan açılan sayfa
export default function LibraryScreen({ me, clients, onBack, onOpenTraining }: {
  me: ClinicianMe; clients: Client[]; onBack: () => void; onOpenTraining: (c: Client) => void;
}) {
  const [assign, setAssign] = useState<LibItem | null>(null);
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView contentContainerStyle={{ padding: 20, paddingBottom: 60 }} keyboardShouldPersistTaps="handled">
        <View style={{ width: '100%', maxWidth: 1240, alignSelf: 'center', gap: 14 }}>
          <Pressable onPress={onBack} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start' }} accessibilityRole="button">
            <Ionicons name="chevron-back" size={16} color={colors.navy} />
            <Text style={{ color: colors.navy, fontWeight: '600' }}>Ana ekran</Text>
          </Pressable>
          <View style={{ gap: 4 }}>
            <Text style={styles.pageTitle}>Ebeveyn eğitimi kaynak kütüphanesi</Text>
            <Text style={styles.body}>Ebeveynlere okuma, test ve açık uçlu sorular gönderin; tamamlama ve ilerlemeyi izleyin.</Text>
          </View>
          <LibraryBrowser me={me} mode="page" onAssign={setAssign} />
        </View>
      </ScrollView>
      {assign && <AssignSheet me={me} item={assign} clients={clients} onClose={() => setAssign(null)}
        onDone={(c) => { setAssign(null); onOpenTraining(c); }} />}
    </SafeAreaView>
  );
}

// "Kaynağı ata": danışan → ebeveyn → eğitim (var olan ya da yeni) → Eğitimi kur
export function AssignSheet({ me, item, clients, onClose, onDone }: {
  me: ClinicianMe; item: LibItem; clients: Client[]; onClose: () => void; onDone: (c: Client) => void;
}) {
  const [client, setClient] = useState<Client | null>(clients.length === 1 ? clients[0] : null);
  const parents = client ? parentsOf(client.parents) : [];
  const [parent, setParent] = useState<string | null>(null);
  const [trainings, setTrainings] = useState<Training[] | null>(null);
  const [target, setTarget] = useState<string | 'new' | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  useEffect(() => { setParent(parents.length === 1 ? parents[0] : null); }, [client?.link_id]);
  useEffect(() => {
    setTrainings(null); setTarget(null);
    if (!client) return;
    loadTrainings(client.link_id).then(setTrainings).catch(() => setTrainings([]));
  }, [client?.link_id]);
  const options = (trainings ?? []).filter((t) => t.parent_name === parent && t.status !== 'mastered');
  const setUp = async () => {
    if (!client || !parent || !target) return;
    setBusy(true);
    try {
      let id = target;
      if (target === 'new') {
        const t = await createTraining({ clinic_id: client.clinic_id, link_id: client.link_id, parent_name: parent, title: newTitle, created_by: me.id });
        id = t.id;
      }
      const d = await loadDetail([id]);
      const n = await addModules(id, [item.key], d.modules);
      if (!n) Alert.alert('Zaten eğitimde', 'Bu kaynak seçtiğin eğitimde var.');
      onDone(client);
    } catch (e) {
      Alert.alert('Kurulamadı', e instanceof TrainingNotInstalled ? 'Veritabanı güncellemesi bekleniyor.' : String((e as Error).message));
    } finally { setBusy(false); }
  };
  return (
    <SheetFrame title="Kaynağı ata" onClose={onClose}
      footer={<><GhostButton label="Vazgeç" onPress={onClose} /><Cta label="Eğitimi kur" onPress={setUp} busy={busy} disabled={!client || !parent || !target} style={{ height: 48, marginTop: 0, paddingHorizontal: 18 }} /></>}>
      <View style={styles.assignItem}><TypeTile type={item.type} /><Text style={[styles.cardTitle, { flex: 1 }]}>{item.title}</Text></View>
      <Pressable onPress={() => setPreview(true)} accessibilityRole="button" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
        <Text style={styles.link}>Ebeveyn deneyimini önizle</Text><Ionicons name="open-outline" size={14} color={colors.navy} />
      </Pressable>
      <Text style={styles.fhead}>Danışan seç</Text>
      {clients.length === 0 && <Text style={styles.body}>Henüz danışanın yok.</Text>}
      <View style={{ gap: 6 }}>
        {clients.map((c) => (
          <Pressable key={c.link_id} onPress={() => setClient(c)} style={[styles.opt, client?.link_id === c.link_id && styles.optOn]} accessibilityRole="radio" accessibilityState={{ selected: client?.link_id === c.link_id }}>
            <Text style={styles.optText}>{c.child_name || 'Adsız'}</Text>
            <Text style={styles.cardDesc}>{c.parents}</Text>
          </Pressable>
        ))}
      </View>
      {client && (
        <>
          <Text style={styles.fhead}>Danışanın ebeveynini seç</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
            {parents.map((p) => (
              <Pressable key={p} onPress={() => { setParent(p); setTarget(null); }} style={[styles.pchip, parent === p && styles.pchipOn]} accessibilityRole="radio" accessibilityState={{ selected: parent === p }}>
                <Text style={[styles.pchipText, parent === p && { color: '#fff' }]}>{p}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}
      {client && parent && (
        <>
          <Text style={styles.fhead}>Eğitim seç</Text>
          {trainings === null ? <ActivityIndicator color={colors.navy} /> : (
            <View style={{ gap: 6 }}>
              {options.map((t) => (
                <Pressable key={t.id} onPress={() => setTarget(t.id)} style={[styles.opt, target === t.id && styles.optOn, { flexDirection: 'row', alignItems: 'center', gap: 8 }]} accessibilityRole="radio" accessibilityState={{ selected: target === t.id }}>
                  <Text style={[styles.optText, { flex: 1 }]}>{t.title}</Text><StatusChip status={t.status} />
                </Pressable>
              ))}
              <Pressable onPress={() => setTarget('new')} style={[styles.opt, target === 'new' && styles.optOn]} accessibilityRole="radio" accessibilityState={{ selected: target === 'new' }}>
                <Text style={styles.optText}>+ Yeni eğitim oluştur</Text>
              </Pressable>
              {target === 'new' && <Input placeholder="Eğitimin adı (boş kalırsa Adsız eğitim)" value={newTitle} onChangeText={setNewTitle} maxLength={80} />}
            </View>
          )}
        </>
      )}
      {preview && <ParentPreview items={[item]} onClose={() => setPreview(false)} />}
    </SheetFrame>
  );
}

const styles = StyleSheet.create({
  pageTitle: { fontSize: 24, fontWeight: '700', color: colors.navy },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  fhead: { fontSize: 12, fontWeight: '700', color: colors.muted, marginTop: 10, marginBottom: 2 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 5 },
  radio: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: colors.faint, alignItems: 'center', justifyContent: 'center' },
  radioOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  checkText: { fontSize: 14, color: colors.text, flexShrink: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.navy, flexShrink: 1 },
  cardDesc: { fontSize: 13, color: colors.muted, flexShrink: 1 },
  drawer: { width: 380, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 16 },
  preview: { borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 14, backgroundColor: '#FAFBFC' },
  tag: { backgroundColor: '#ECEEF3', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  tagText: { fontSize: 12, color: colors.navy, fontWeight: '600' },
  count: { fontSize: 13, color: colors.text, fontWeight: '600' },
  reset: { fontSize: 13, color: colors.navy, textDecorationLine: 'underline' },
  filterBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start', paddingVertical: 6 },
  filterBox: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 12, padding: 12 },
  assignItem: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12 },
  link: { color: colors.navy, fontWeight: '600', textDecorationLine: 'underline' },
  opt: { backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, gap: 2 },
  optOn: { borderColor: colors.navy, backgroundColor: '#EEF1F8' },
  optText: { fontSize: 14, fontWeight: '600', color: colors.navy, flexShrink: 1 },
  pchip: { borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff', borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 7 },
  pchipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  pchipText: { fontSize: 14, color: colors.navy, fontWeight: '600' },
});
