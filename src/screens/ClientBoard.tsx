import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { colors, radius } from '../theme';
import { Label, Notice } from '../components/ui';
import Bell from '../components/Bell';
import { Client, ClinicianMe, Member, loadAttention } from '../lib/clinic';
import { Attention, BoardRow, Section, buildBoard } from '../lib/attention';
import { OnceHint, BOARD_HINT } from './SampleTour';
import { track } from '../lib/track';

// Tüm danışanlar (kullanıcı kararı 2 Kasım 2026: dikkat panosu "liste + neden"; ortak clinic_attention_summary, veritabani.md 23).
// Danışan başına tek satır; bölümler Senin sıran · Aileden yeni · Sessiz kalanlar · Diğer danışanlar. Neden çipleri yalnız olgu
// söyler, hepsi aynı nötr renkte: puan, renkli risk ve "en kötüden iyiye" sıralama yok; bölüm içinde sıra ailenin son kaydına göre.
// "Gördüm" (ya da danışanı açmak) Aileden yeni'yi o danışan için yeni bir şey gelene kadar kapatır (bu cihazda).
// Sahip için uzman süzgeci (uzmanlar karşılaştırılmaz, sayı gösterilmez). Sunucuda işlev yoksa düz liste (eski davranış).
const SEEN_KEY = (id: string) => `clinic.attention.seen.v1.${id}`;
const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

const SECTIONS: { id: Section; title: string; info: string }[] = [
  { id: 'mine', title: 'Senin sıran', info: 'Aileye gönderilmemiş değişikliğin, değerlendirme zamanı gelen hedefin ya da takip planı henüz olmayan danışanlar.' },
  { id: 'family', title: 'Aileden yeni', info: 'Son 7 günde ailenin girdiği davranış kayıtları ve öneri kararları. "Gördüm" dersen ya da danışanı açarsan, yeni bir şey gelene kadar bu bölümden çıkar (bu cihazda).' },
  { id: 'quiet', title: 'Sessiz kalanlar', info: 'Ailenin 7 gündür hiç kaydı yok: görev, davranış kaydı, program uygulaması, öneri kararı.' },
  { id: 'rest', title: 'Diğer danışanlar', info: 'Şu an bir şey beklemeyen danışanlar.' },
];

export default function ClientBoard({ clients, unread, me, team, onOpen, onAttention }: {
  clients: Client[]; unread: Record<string, number>; me: ClinicianMe; team: Member[]; onOpen: (c: Client) => void;
  onAttention?: (a: Record<string, Attention> | null) => void;      // ana ekrandaki Başlarken kartı aynı özeti kullanır
}) {
  const [q, setQ] = useState('');
  const [att, setAtt] = useState<Record<string, Attention> | null>(null);
  const [seen, setSeen] = useState<Record<string, string>>({});
  const [who, setWho] = useState<string>('all');
  useEffect(() => {
    loadAttention().then((a) => { setAtt(a); onAttention?.(a); }).catch(() => { setAtt(null); onAttention?.(null); });
  }, [clients]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    AsyncStorage.getItem(SEEN_KEY(me.id)).then((v) => { if (v) setSeen(JSON.parse(v)); }).catch(() => {});
  }, [me.id]);
  const markSeen = (linkId: string) => {
    const next = { ...seen, [linkId]: new Date().toISOString() };
    setSeen(next);
    AsyncStorage.setItem(SEEN_KEY(me.id), JSON.stringify(next)).catch(() => {});
  };
  const open = (c: Client) => { if (att) markSeen(c.link_id); onOpen(c); };

  const ownerFilter = me.role === 'owner' && team.length > 1;
  const mineOf = (c: Client, id: string) => c.clinician_id === id || (c.assigned ?? []).includes(id);
  const scoped = ownerFilter && who !== 'all' ? clients.filter((c) => mineOf(c, who)) : clients;
  const query = q.trim().toLocaleLowerCase('tr');
  const searched = query ? scoped.filter((c) => `${c.child_name} ${c.parents} ${c.label}`.toLocaleLowerCase('tr').includes(query)) : scoped;
  const board = useMemo(() => (att && !query ? buildBoard(searched, att, seen, new Date()) : null), [att, query, searched, seen]);
  const sections = board ? SECTIONS.filter((s) => board[s.id].length > 0) : [];
  const onlyRest = sections.length === 1 && sections[0].id === 'rest';

  const row = (r: BoardRow<Client> | { client: Client; reasons: []; fresh: false }, i: number) => {
    const c = r.client;
    return (
      <Pressable key={c.link_id} onPress={() => open(c)} accessibilityRole="button"
        style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: '#F7F8FA' }]}>
        <View style={styles.initial}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.navy }}>{(c.child_name || '?').slice(0, 1).toLocaleUpperCase('tr-TR')}</Text>
        </View>
        <View style={{ flex: 1, gap: 3, minWidth: 0 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <Text style={styles.clientName}>{c.child_name || 'Adsız'}</Text>
            {!!c.label && <Text style={styles.tag} numberOfLines={1}>{c.label}</Text>}
          </View>
          {!!c.parents && (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Ionicons name="person-outline" size={13} color={colors.muted} />
              <Text style={styles.parents} numberOfLines={1}>{c.parents}</Text>
            </View>
          )}
          {r.reasons.length > 0 && (
            <View style={styles.reasons}>
              {r.reasons.map((x) => (
                <View key={x.key} style={styles.reason}>
                  <Ionicons name={x.icon as keyof typeof Ionicons.glyphMap} size={12} color={colors.navy} />
                  <Text style={styles.reasonText}>{x.text}</Text>
                </View>
              ))}
              {r.fresh && (
                <Pressable onPress={() => { markSeen(c.link_id); track('board.seen'); }} hitSlop={8} accessibilityRole="button"
                  accessibilityLabel={`${c.child_name}: gördüm`}>
                  <Text style={styles.seen}>Gördüm</Text>
                </Pressable>
              )}
            </View>
          )}
          <Text style={styles.small}>
            {!r.reasons.length || !att ? `Ebeveyn onayı: ${dateText(c.consent_at)}` : ''}
            {me.role === 'owner' && team.length > 1 && c.clinician_id && c.clinician_id !== me.id ? `${!r.reasons.length || !att ? ' · ' : ''}Sorumlu: ${c.clinician_name || 'ekip üyesi'}` : ''}
            {me.role === 'member' && c.clinician_id !== me.id && (c.assigned ?? []).includes(me.id) ? ' · Sana atandı' : ''}
          </Text>
        </View>
        <Bell count={unread[c.child_id] ?? 0} small />
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
            <View style={{ marginTop: 10 }}><OnceHint userId={me.id} id="board" hint={BOARD_HINT} /></View>
            {sections.map((s) => (
              <View key={s.id} style={{ gap: 6, marginTop: 10 }}>
                <SectionHead title={s.title} count={board[s.id].length} info={s.info} />
                <View style={styles.list}>{board[s.id].map(row)}</View>
              </View>
            ))}
            </>
          ) : (
            <View style={styles.list}>{(board ? board.rest : searched.map((c) => ({ client: c, reasons: [] as [], fresh: false as const }))).map(row)}</View>
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
      <Pressable onPress={() => setOpen((v) => !v)} hitSlop={8} accessibilityRole="button" accessibilityLabel={`${title}: açıklama`}
        style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start' }}>
        <Text style={styles.secTitle}>{title} · {count}</Text>
        <Ionicons name={open ? 'information-circle' : 'information-circle-outline'} size={14} color={colors.muted} />
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
  parents: { fontSize: 13, color: colors.text, flexShrink: 1 },
  small: { fontSize: 12, color: colors.muted },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14, height: 44, marginBottom: 8 },
  reasons: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginTop: 2 },
  reason: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#F1F3F7', borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  reasonText: { fontSize: 11.5, fontWeight: '600', color: colors.navy },
  seen: { fontSize: 12, fontWeight: '700', color: colors.navy, textDecorationLine: 'underline' },
  secTitle: { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', color: '#6B7387' },
  info: { fontSize: 12, color: colors.text, lineHeight: 17, backgroundColor: '#F3F5FA', borderRadius: radius.sm, padding: 10 },
  filter: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 4 },
  fchip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, maxWidth: 180 },
  fchipOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  fchipText: { fontSize: 12.5, fontWeight: '600', color: colors.navy },
});
