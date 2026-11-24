import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Label, Notice } from '../components/ui';
import Bell from '../components/Bell';
import { Client, ClinicianMe, Member, loadAttention } from '../lib/clinic';
import { Attention, BoardRow, Section, TrainingStat, buildBoard } from '../lib/attention';
import { loadSeen, markSeen as storeSeen, peekSeen } from '../lib/boardSeen';
import { useNotifications } from '../lib/notificationsContext';
import { notificationChildren } from '../lib/notifications';
import { loadTrainingsFor, loadDetail, type Training } from '../lib/training';
import { track } from '../lib/track';

// Tüm danışanlar (kullanıcı kararı 2 Kasım 2026: dikkat panosu "liste + neden"; ortak clinic_attention_summary, veritabani.md 23).
// Danışan başına tek satır; bölümler Senin sıran · Ebeveynden yeni · Sessiz kalanlar · Diğer danışanlar. Neden çipleri yalnız olgu
// söyler, hepsi aynı nötr renkte: puan, renkli risk ve "en kötüden iyiye" sıralama yok; bölüm içinde sıra ailenin son kaydına göre.
// "Gördüm" (ya da danışanın sayfasına girmek) Ebeveynden yeni'yi o danışan için yeni bir şey gelene kadar kapatır (bu cihazda;
// lib/boardSeen.ts) ve o danışanın okunmamış bildirimlerini okunmuş sayar: satırdaki zil işareti de söner.
// Zil (24 Kasım 2026): yeni bir şeyi olan satırda dolu zil + sarı sayı (okunmamış bildirim) ya da sarı nokta (bildirimi okunmuş
// ama Ebeveynden yeni'de); öteki satırlarda soluk çizgi zil. Renk tek başına değil: sayı ve erişilebilirlik etiketi var.
// Sahip için uzman süzgeci (uzmanlar karşılaştırılmaz, sayı gösterilmez). Sunucuda işlev yoksa düz liste (eski davranış).
const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

// Takip Planı kapalıyken (lansman odağı "A") "Senin sıran" açıklaması
const MINE_TRAINING_INFO = 'Ebeveynin bitirdiği ve senin henüz açmadığın yanıtlar, ebeveynin göremediği taslak eğitimler ya da henüz eğitimi olmayan danışanlar.';
const SECTIONS: { id: Section; title: string; info: string }[] = [
  { id: 'mine', title: 'Senin sıran', info: 'Aileye gönderilmemiş değişikliğin, değerlendirme zamanı gelen davranış hedefinin ya da takip planı henüz olmayan danışanlar.' },
  { id: 'family', title: 'Ebeveynden yeni', info: 'Son 7 günde ebeveynin girdiği davranış kaydını ve diğer iletileri listeler. Danışanın sayfasına girdiğinde normal listeye döner.' },
  { id: 'quiet', title: 'Sessiz kalanlar', info: 'Ebeveynin 7 gündür hiç kaydı yok: adım onayı, davranış kaydı, program uygulaması, öneri kararı.' },
  { id: 'rest', title: 'Diğer danışanlar', info: 'Şu an bir şey beklemeyen danışanlar.' },
];

export default function ClientBoard({ clients, unread, me, team, onOpen, onAttention, plan = true, training: trainingOn = true, onTraining, onTrainings }: {
  clients: Client[]; unread: Record<string, number>; me: ClinicianMe; team: Member[]; onOpen: (c: Client) => void;
  onAttention?: (a: Record<string, Attention> | null) => void;      // ana ekrandaki Başlarken kartı aynı özeti kullanır
  plan?: boolean;                                                   // Takip Planı açık mı (uzaktan ayar care_plan); kapalıyken nedenler eğitimden
  training?: boolean;                                               // ebeveyn eğitimi açık mı (parent_training); kapalıyken eğitim okunmaz, nedeni yok
  onTraining?: (s: { any: boolean; active: boolean }) => void;      // Başlarken: ilk eğitim / Etkin eğitim var mı
  onTrainings?: (ts: Training[] | null) => void;                    // yüklenen eğitim listesi (hatırlatma planı yeniden okumasın); null: okunamadı
}) {
  const [q, setQ] = useState('');
  const [att, setAtt] = useState<Record<string, Attention> | null>(null);
  const [seen, setSeen] = useState<Record<string, string>>(() => peekSeen(me.id));
  const { items: notes, markRead } = useNotifications();
  const [who, setWho] = useState<string>('all');
  useEffect(() => {
    loadAttention().then((a) => { setAtt(a); onAttention?.(a); }).catch(() => { setAtt(null); onAttention?.(null); });
  }, [clients]); // eslint-disable-line react-hooks/exhaustive-deps
  // Takip Planı kapalıyken danışan başına eğitim özeti (sunucuda eğitim tabloları yoksa neden eklenmez)
  const [training, setTraining] = useState<Record<string, TrainingStat> | null>(null);
  useEffect(() => {
    if (plan || !trainingOn) { setTraining(null); return; }
    let live = true;
    (async () => {
      try {
        const ts = await loadTrainingsFor(clients.map((c) => c.link_id));
        if (live) onTrainings?.(ts);
        const d = await loadDetail(ts.map((t) => t.id));
        const stat: Record<string, TrainingStat> = {};
        clients.forEach((c) => { stat[c.link_id] = { total: 0, drafts: 0, review: 0 }; });
        const linkOf: Record<string, string> = {};
        ts.forEach((t) => { linkOf[t.id] = t.link_id; const x = stat[t.link_id]; if (x) { x.total += 1; if (t.status === 'draft') x.drafts += 1; } });
        [...d.modules.filter((m) => !m.archived && m.completed_at && !m.reviewed_at), ...d.todos.filter((k) => !k.archived && k.done_at && !k.reviewed_at)]
          .forEach((r) => { const x = stat[linkOf[r.training_id]]; if (x) x.review += 1; });
        if (!live) return;
        setTraining(stat);
        onTraining?.({ any: ts.length > 0, active: ts.some((t) => t.status !== 'draft') });
      } catch { if (live) setTraining(null); }
    })();
    return () => { live = false; };
  }, [clients, plan, trainingOn]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    let live = true;
    loadSeen(me.id).then((v) => { if (live) setSeen(v); });
    return () => { live = false; };
  }, [me.id]);
  // "Gördüm": satır bölümden çıkar, zili söner. Danışanı açınca aynısını danışan sayfası yapar (her yoldan açılışta).
  const markSeen = (c: Client) => {
    storeSeen(me.id, c.link_id).then(setSeen);
    const ids = notes.filter((n) => !n.readAt && notificationChildren(n).includes(c.child_id)).map((n) => n.id);
    if (ids.length) markRead(ids);
  };

  const ownerFilter = me.role === 'owner' && team.length > 1;
  const mineOf = (c: Client, id: string) => c.clinician_id === id || (c.assigned ?? []).includes(id);
  const scoped = ownerFilter && who !== 'all' ? clients.filter((c) => mineOf(c, who)) : clients;
  const query = q.trim().toLocaleLowerCase('tr');
  const searched = query ? scoped.filter((c) => `${c.child_name} ${c.parents} ${c.label}`.toLocaleLowerCase('tr').includes(query)) : scoped;
  const built = useMemo(() => (att ? buildBoard(searched, att, seen, new Date(), { plan, training }) : null), [att, searched, seen, plan, training]);
  const board = query ? null : built;
  // arama listesinde de (bölümsüz düz liste) ebeveynden yenisi olan satırın zili işaretli
  const freshIds = useMemo(() => new Set(built ? Object.values(built).flat().filter((r) => r.fresh).map((r) => r.client.link_id) : []), [built]);
  const sections = board ? SECTIONS.filter((s) => board[s.id].length > 0).map((s) => (s.id === 'mine' && !plan ? { ...s, info: MINE_TRAINING_INFO } : s)) : [];
  const onlyRest = sections.length === 1 && sections[0].id === 'rest';

  const row = (r: BoardRow<Client> | { client: Client; reasons: []; fresh: boolean }, i: number) => {
    const c = r.client;
    return (
      <Pressable key={c.link_id} onPress={() => onOpen(c)} accessibilityRole="button"
        style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: '#F7F8FA' }]}>
        <View style={styles.initial}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.navy }}>{(c.child_name || '?').slice(0, 1).toLocaleUpperCase('tr-TR')}</Text>
        </View>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.clientName}>{c.child_name || 'Adsız'}</Text>
            {!!c.label && <Text style={styles.tag} numberOfLines={1}>{c.label}</Text>}
          </View>
          {!!c.parents && <Text style={styles.parents} numberOfLines={1}>Ebeveyn: {c.parents}</Text>}
          {r.reasons.length > 0 && (
            <View style={styles.reasons}>
              {r.reasons.map((x) => (
                <View key={x.key} style={styles.reason}>
                  <Ionicons name={x.icon as keyof typeof Ionicons.glyphMap} size={12} color={colors.navy} />
                  <Text style={styles.reasonText}>{x.text}</Text>
                </View>
              ))}
              {r.fresh && (
                <Pressable onPress={() => { markSeen(c); track('board.seen'); }} hitSlop={8} accessibilityRole="button"
                  accessibilityLabel={`${c.child_name}: gördüm`}>
                  <Text style={styles.seen}>Gördüm</Text>
                </Pressable>
              )}
            </View>
          )}
          <Text style={styles.small}>
            {!r.reasons.length || !att ? `Ebeveyn onayı: ${dateText(c.consent_at)}` : ''}
            {me.role === 'owner' && team.length > 1 && c.clinician_id && c.clinician_id !== me.id ? `${!r.reasons.length || !att ? ' · ' : ''}Uzman: ${c.clinician_name || 'ekip üyesi'}` : ''}
            {me.role === 'member' && c.clinician_id !== me.id && (c.assigned ?? []).includes(me.id) ? ' · Sana atandı' : ''}
          </Text>
        </View>
        <Bell count={unread[c.child_id] ?? 0} small dot={r.fresh} />
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Pressable>
    );
  };

  return (
    <>
      <Label>{`Danışanlar (${clients.length})`}</Label>
      {clients.length === 0 ? (
        <Notice icon="people-outline" text={me.role === 'member'
          ? 'Henüz danışanın yok. Aileyi davet et ya da klinik sahibinin atamasını bekle.'
          : 'Henüz danışanın yok. Aileyi davet et; ebeveyn onaylayınca çocuk burada görünür.'} />
      ) : (
        <>
          {clients.length > 3 && (
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Çocuk ya da ebeveyn adı ara" placeholderTextColor={colors.muted}
                style={{ flex: 1, fontSize: 15, color: colors.navy }} autoCorrect={false} />
            </View>
          )}
          {ownerFilter && (
            <View style={styles.filter} accessibilityRole="radiogroup" accessibilityLabel="Uzmana göre süz">
              {[{ id: 'all', name: 'Hepsi' }, { id: me.id, name: 'Benim' }, ...team.filter((m) => m.id !== me.id)].map((m) => (
                <Pressable key={m.id} onPress={() => { setWho(m.id); track('board.filter', { all: m.id === 'all' }); }} accessibilityRole="radio"
                  accessibilityState={{ selected: who === m.id }} style={[styles.fchip, who === m.id && styles.fchipOn]}>
                  <Text style={[styles.fchipText, who === m.id && { color: '#fff' }]} numberOfLines={1}>{m.name || 'Uzman'}</Text>
                </Pressable>
              ))}
            </View>
          )}
          {searched.length === 0 ? (
            <View style={styles.list}><Text style={[styles.small, { padding: 16 }]}>{query ? 'Sonuç bulunamadı.' : 'Bu uzmana bağlı danışan yok.'}</Text></View>
          ) : board && !onlyRest ? (
            <>
            {/* bölümlerin açıklaması başlıklardaki (i)'de (kullanıcı isteği 24 Kasım 2026: listenin üstündeki açıklama kalktı) */}
            {sections.map((s, i) => (
              <View key={s.id} style={{ gap: 6, marginTop: i ? 10 : 6 }}>
                <SectionHead title={s.title} count={board[s.id].length} info={s.info} />
                <View style={styles.list}>{board[s.id].map(row)}</View>
              </View>
            ))}
            </>
          ) : (
            <View style={styles.list}>{(board ? board.rest : searched.map((c) => ({ client: c, reasons: [] as [], fresh: freshIds.has(c.link_id) }))).map(row)}</View>
          )}
        </>
      )}
    </>
  );
}

function SectionHead({ title, count, info }: { title: string; count: number; info: string }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={{ gap: 4 }}>
      <Pressable onPress={() => setOpen((v) => !v)} hitSlop={10} accessibilityRole="button" accessibilityLabel={`${title}: açıklama`}
        accessibilityState={{ expanded: open }} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
        <Text style={styles.secTitle}>{title} · {count}</Text>
        <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={17} color={colors.navy} />
      </Pressable>
      {open && <Text style={styles.info}>{info}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  initial: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.today, alignItems: 'center', justifyContent: 'center' },
  clientName: { fontSize: 15, fontWeight: '600', color: colors.text },
  tag: { fontSize: 11, fontWeight: '600', color: colors.navy, backgroundColor: colors.today, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', maxWidth: 180 },
  parents: { fontSize: 13, color: colors.text },
  small: { fontSize: 12, color: colors.muted },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14, height: 44, marginBottom: 8 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 2 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F3F7', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3, flexShrink: 1, maxWidth: '100%' },
  reasonText: { fontSize: 11.5, fontWeight: '600', color: colors.navy, flexShrink: 1 },
  seen: { fontSize: 12, fontWeight: '700', color: colors.navy, textDecorationLine: 'underline' },
  secTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#6B7387' },
  info: { fontSize: 12, color: colors.text, lineHeight: 17, backgroundColor: '#F3F5FA', borderRadius: radius.sm, padding: 10 },
  filter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  fchip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, maxWidth: 180 },
  fchipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  fchipText: { fontSize: 12.5, fontWeight: '600', color: colors.navy },
});
