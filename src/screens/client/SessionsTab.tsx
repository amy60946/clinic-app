import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Notice, SmallButton } from '../../components/ui';
import type { Client, Member } from '../../lib/clinic';
import { observations, addDays } from '../../lib/metrics';
import { track } from '../../lib/track';
import {
  DEFAULT_SETTINGS, KIND_LABEL, STATUS_META, RESPONSE_LABEL, attendance, packageUsage, weeklyCells, hasNote, shortDay, trDay, timeRange,
  type Session, type SessionRecord, type SessionPackage, type WaitItem, type Room, type Availability, type SessionSettings,
} from '../../lib/sessionCore';
import {
  SessionsNotInstalled, loadLinkSessions, loadRecords, listPackages, savePackage, listWaitlist, saveWaitlist, loadSettings, listRooms, listAvailability,
} from '../../lib/sessions';
import SessionSheet, { type SessionPreset } from '../calendar/SessionSheet';
import SessionDetailSheet from '../calendar/SessionDetailSheet';
import { OfferSheet } from '../calendar/SmallSheets';
import { StatusChip, Chips, s } from '../calendar/parts';
import type { ClientCtx, Tab } from './ClientScreen';

// Danışan › Seanslar (ortak akislar.md 20, 5): devam, son 10 hafta, her seansın ara döneminde evden gelenler, paket, bekleme listesi.
export default function SessionsTab({ client, me, data, today, team, clients, onOpenTab }: ClientCtx & {
  team: Member[]; clients: Client[]; onOpenTab: (t: Tab) => void;
}) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [records, setRecords] = useState<Record<string, SessionRecord>>({});
  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [wait, setWait] = useState<WaitItem | null>(null);
  const [allWait, setAllWait] = useState<WaitItem[]>([]);
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [avail, setAvail] = useState<Availability[]>([]);
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState<{ editing?: Session | null; preset?: SessionPreset | null } | null>(null);
  const [detail, setDetail] = useState<Session | null>(null);
  const [offer, setOffer] = useState<Session | null>(null);
  const [pkgForm, setPkgForm] = useState(false);
  const [pkgTotal, setPkgTotal] = useState(10);
  const [pkgTitle, setPkgTitle] = useState('');
  const [waitNote, setWaitNote] = useState('');
  const now = new Date();

  const load = useCallback(async () => {
    try {
      const [ss, pk, wl, st, rm, av] = await Promise.all([loadLinkSessions(client.link_id), listPackages(client.link_id), listWaitlist(), loadSettings(), listRooms(), listAvailability()]);
      setSessions(ss); setPackages(pk); setAllWait(wl); setWait(wl.find((w) => w.link_id === client.link_id) ?? null); setSettings(st); setRooms(rm); setAvail(av);
      setWaitNote(wl.find((w) => w.link_id === client.link_id)?.note ?? '');
      setRecords(await loadRecords(ss.filter((x) => x.status === 'done').map((x) => x.id)).catch(() => ({})));
    } catch (e) {
      if (e instanceof SessionsNotInstalled) setMissing(true); else Alert.alert('Yüklenemedi', (e as Error).message);
    }
  }, [client.link_id]);
  useEffect(() => { load(); }, [load]);

  const att = useMemo(() => (sessions ? attendance(sessions, now) : null), [sessions]); // eslint-disable-line react-hooks/exhaustive-deps
  const cells = useMemo(() => (sessions ? weeklyCells(sessions, today, 10) : []), [sessions, today]);
  // her yapılan seansın ara dönemi: önceki yapılandan bu seansa kadar rutin oranı ve davranış kaydı sayısı
  const rows = useMemo(() => {
    if (!sessions) return [];
    const asc = [...sessions].sort((a, b) => a.starts_at.localeCompare(b.starts_at));
    let prevDone: string | null = null;
    return asc.map((x) => {
      const d = trDay(x.starts_at);
      const from = prevDone ?? addDays(d, -14), to = addDays(d, -1);
      const o = Date.parse(x.starts_at) <= now.getTime() && to >= from ? observations(data.tasks, data.completions, from, to) : null;
      const abc = data.abc.filter((e) => { const z = trDay(e.occurred_at); return z >= from && z <= to; }).length;
      if (x.status === 'done') prevDone = d;
      return { x, rate: o?.rate ?? null, abc: o ? abc : null };
    }).reverse();
  }, [sessions, data]); // eslint-disable-line react-hooks/exhaustive-deps

  if (missing) return <Notice icon="construct-outline" text="Seans planlama için veritabanı güncellemesi bekleniyor (ortak 20261105100000_sessions.sql)." />;
  if (!sessions || !att) return <ActivityIndicator color={colors.navy} style={{ marginTop: 30 }} />;

  return (
    <View style={{ gap: 12 }}>
      <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
        <Tile n={String(att.done)} t="seans yapıldı" />
        <Tile n={String(att.noShow)} t="gelmedi" />
        <Tile n={String(att.late)} t="geç iptal" />
        <Tile n={att.next ? shortDay(trDay(att.next.starts_at)).replace(/ \S+$/, '') : '–'} t={att.next ? `sonraki · ${timeRange(att.next).slice(0, 5)}` : 'sonraki seans yok'} />
      </View>
      <View style={[s.row, { flexWrap: 'wrap' }]}>
        <SmallButton label="+ Seans" onPress={() => setForm({ preset: { link_id: client.link_id } })} />
        {att.next && <SmallButton label="Sonraki seansı aç" onPress={() => setDetail(att.next)} />}
      </View>

      <View style={s.card}>
        <Text style={s.label}>Son 10 hafta</Text>
        <View style={[s.row, { gap: 4, alignItems: 'flex-end' }]}>
          {cells.map((c) => {
            const m = c.status ? STATUS_META[c.status] : null;
            return <View key={c.start} accessibilityLabel={`${shortDay(c.start)} haftası: ${m?.label ?? 'seans yok'}`}
              style={{ flex: 1, height: 30, borderRadius: 4, backgroundColor: m ? (c.status === 'planned' ? '#fff' : m.line) : '#ECEEF3', borderWidth: c.status === 'planned' ? 1.5 : 0, borderColor: colors.navy }} />;
          })}
        </View>
        <Text style={s.small}>Yeşil yapıldı · kırmızı gelmedi · sarı geç iptal · gri iptal ya da seans yok · çerçeve planlı</Text>
      </View>

      <View style={s.card}>
        <View style={s.row}><Text style={[s.label, { flex: 1 }]}>Seans paketi</Text>{!pkgForm && <SmallButton label="+ Paket" onPress={() => setPkgForm(true)} />}</View>
        {packages.length === 0 && !pkgForm && <Text style={s.small}>Paket yok. Seans sayısını izlemek için ekle (ödeme alınmaz, yalnız sayı).</Text>}
        {packages.map((p) => {
          const u = packageUsage(p, sessions, settings, now);
          return (
            <View key={p.id} style={[s.row, { paddingVertical: 4 }]}>
              <View style={{ flex: 1 }}>
                <Text style={[s.body, p.closed_at && { color: colors.muted }]}>{p.title}{p.closed_at ? ' · kapandı' : ''}</Text>
                <Text style={[s.small, u.over && { color: colors.danger }]}>{u.used} / {p.total} kullanıldı · {u.planned} planlı · {u.left} kaldı</Text>
              </View>
              <View style={{ width: 90, height: 8, borderRadius: 4, backgroundColor: '#ECEEF3', overflow: 'hidden' }}>
                <View style={{ width: `${Math.min(100, (u.used / p.total) * 100)}%`, height: 8, backgroundColor: u.over ? colors.danger : colors.ok }} />
              </View>
              {!p.closed_at && <SmallButton label="Kapat" onPress={() => savePackage({ ...p, closed: true }).then(load).catch((e) => Alert.alert('Olmadı', e.message))} />}
            </View>
          );
        })}
        {pkgForm && (
          <View style={{ gap: 8 }}>
            <TextInput value={pkgTitle} onChangeText={setPkgTitle} placeholder={`${pkgTotal} seans`} placeholderTextColor={colors.muted} maxLength={60} style={s.input} />
            <Chips options={[4, 8, 10, 12, 20].map((n) => ({ id: n, label: `${n}` }))} value={pkgTotal} onChange={setPkgTotal} />
            <View style={s.row}>
              <SmallButton label="Kaydet" onPress={async () => {
                try { await savePackage({ link_id: client.link_id, title: pkgTitle.trim() || `${pkgTotal} seans`, total: pkgTotal }); track('session.package', { total: pkgTotal }); setPkgForm(false); setPkgTitle(''); load(); }
                catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); }
              }} />
              <SmallButton label="Vazgeç" onPress={() => setPkgForm(false)} />
            </View>
            <Text style={s.small}>Seansı bu pakete bağlamak için seans penceresinde "Paket" seç.</Text>
          </View>
        )}
      </View>

      <View style={s.card}>
        <View style={s.row}>
          <Ionicons name={wait ? 'hourglass' : 'hourglass-outline'} size={16} color={colors.navy} />
          <Text style={[s.label, { flex: 1 }]}>{wait ? (wait.status === 'offered' ? 'Bekleme listesinde · teklif gönderildi' : 'Bekleme listesinde') : 'Bekleme listesi'}</Text>
        </View>
        <Text style={s.small}>Daha erken ya da ek saat isteyen aile. Bir seans iptal olunca boşalan saati teklif edebilirsin; aile ParentApp'te kabul eder.</Text>
        <TextInput value={waitNote} onChangeText={setWaitNote} placeholder="Uygun günler / saatler (ör. salı öğleden sonra)" placeholderTextColor={colors.muted} maxLength={300} style={s.input} />
        <View style={s.row}>
          <SmallButton label={wait ? 'Notu kaydet' : 'Bekleme listesine al'} onPress={() => saveWaitlist(client.link_id, waitNote).then(() => { track('waitlist.add'); load(); }).catch((e) => Alert.alert('Olmadı', e.message))} />
          {wait && <SmallButton label="Listeden çıkar" onPress={() => saveWaitlist(client.link_id, '', true).then(load).catch((e) => Alert.alert('Olmadı', e.message))} />}
        </View>
      </View>

      <View style={s.card}>
        <Text style={s.label}>Seanslar</Text>
        {rows.length === 0 && <Text style={s.small}>Henüz seans yok. "+ Seans" ile ilk seansı planla.</Text>}
        {rows.slice(0, 40).map(({ x, rate, abc }) => (
          <Pressable key={x.id} onPress={() => setDetail(x)} style={[s.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, flexWrap: 'wrap' }]}>
            <View style={{ width: 128 }}>
              <Text style={[s.body, { fontWeight: '600' }]}>{shortDay(trDay(x.starts_at))}</Text>
              <Text style={s.small}>{timeRange(x)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 140 }}>
              <Text style={s.body} numberOfLines={1}>{KIND_LABEL[x.kind]}</Text>
              <Text style={s.small} numberOfLines={1}>
                {[x.status === 'done' && (hasNote(records[x.id]) ? 'not var' : 'not yok'), x.family_response && RESPONSE_LABEL[x.family_response],
                  rate !== null && `ara dönem: rutin %${rate}`, abc !== null && `${abc} davranış kaydı`].filter(Boolean).join(' · ')}
              </Text>
            </View>
            <StatusChip status={x.status} small />
          </Pressable>
        ))}
      </View>

      <SessionSheet open={!!form} me={me} team={team} clients={clients.length ? clients : [client]} rooms={rooms} availability={avail} settings={settings} packages={packages}
        editing={form?.editing} preset={form?.preset} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />
      <SessionDetailSheet session={detail} client={client} me={me} team={team} rooms={rooms} settings={settings}
        onClose={() => setDetail(null)} onChanged={load}
        onEdit={(x) => { setDetail(null); setTimeout(() => setForm({ editing: x }), 250); }}
        onNext={(x) => { setDetail(null); setTimeout(() => setForm({ preset: { link_id: x.link_id, kind: x.kind, duration_min: x.duration_min, starts_at: new Date(Date.parse(x.starts_at) + 7 * 864e5).toISOString() } }), 250); }}
        onOffer={(x) => { setDetail(null); setTimeout(() => setOffer(x), 250); }}
        onOpenClient={(_c, t) => { setDetail(null); onOpenTab(t); }} />
      <OfferSheet slot={offer} waitlist={allWait} clients={clients} onClose={() => setOffer(null)} onDone={() => { setOffer(null); load(); }} />
    </View>
  );
}

const Tile = ({ n, t }: { n: string; t: string }) => (
  <View style={s.tile}><Text style={s.tileNum}>{n}</Text><Text style={s.small}>{t}</Text></View>
);
