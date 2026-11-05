import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../../theme';
import { IconButton, Segmented, SmallButton, Notice } from '../../components/ui';
import type { Client, ClinicianMe, Member } from '../../lib/clinic';
import { addDays } from '../../lib/metrics';
import { track } from '../../lib/track';
import {
  STATUS_META, KIND_LABEL, DEFAULT_SETTINGS, layoutDay, noteDue, trDay, trMinutes, trToIso, mondayOfDay, shortDay, longDay, timeRange,
  minToHhmm, isClosed,
  type Session, type SessionRecord, type Room, type Availability, type SessionSettings, type SessionPackage, type WaitItem, type ExternalEvent,
} from '../../lib/sessionCore';
import {
  SessionsNotInstalled, loadSessions, loadSession, loadRecords, loadSettings, listRooms, listAvailability, listWaitlist, listPackages, loadExternal,
} from '../../lib/sessions';
import type { Tab } from '../client/ClientScreen';
import SessionSheet, { type SessionPreset } from './SessionSheet';
import SessionDetailSheet from './SessionDetailSheet';
import CalendarSettingsSheet from './CalendarSettingsSheet';
import { OfferSheet, ExternalSheet } from './SmallSheets';
import { StatusChip, s } from './parts';

// Takvim (ortak akislar.md 20): gün / hafta; geniş ekranda haftalık ızgara + sağda "Bugün", dar ekranda gün gün liste.
// Durum renkleri STATUS_META; dış takvim etkinlikleri gri kesikli; sahip için uzman süzgeci.
export default function CalendarScreen({ me, team, clients, initialSessionId, onBack, onOpenClient }: {
  me: ClinicianMe; team: Member[]; clients: Client[]; initialSessionId?: string | null;
  onBack: () => void; onOpenClient: (c: Client, tab: Tab) => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 900;
  const today = trDay(new Date().toISOString());
  const [view, setView] = useState<'day' | 'week'>(wide ? 'week' : 'day');
  const [anchor, setAnchor] = useState(today);
  const [who, setWho] = useState<string>('all');
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [records, setRecords] = useState<Record<string, SessionRecord>>({});
  const [external, setExternal] = useState<ExternalEvent[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [avail, setAvail] = useState<Availability[]>([]);
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS);
  const [packages, setPackages] = useState<SessionPackage[]>([]);
  const [waitlist, setWaitlist] = useState<WaitItem[]>([]);
  const [missing, setMissing] = useState(false);
  const [error, setError] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [detail, setDetail] = useState<Session | null>(null);
  const [form, setForm] = useState<{ editing?: Session | null; preset?: SessionPreset | null } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [offer, setOffer] = useState<Session | null>(null);
  const [ext, setExt] = useState<ExternalEvent | null>(null);
  const owner = me.role === 'owner';
  const clientOf = useCallback((linkId: string | null) => (linkId ? clients.find((c) => c.link_id === linkId) ?? null : null), [clients]);

  const days = useMemo(() => {
    const monday = mondayOfDay(anchor);
    return view === 'week' ? Array.from({ length: 7 }, (_, i) => addDays(monday, i)) : [anchor];
  }, [anchor, view]);
  const rangeFrom = trToIso(days[0], '00:00'), rangeTo = trToIso(addDays(days[days.length - 1], 1), '00:00');

  const loadStatic = useCallback(async () => {
    const [st, r, a, w, p] = await Promise.all([loadSettings(), listRooms(), listAvailability(), listWaitlist(), listPackages()]);
    setSettings(st); setRooms(r); setAvail(a); setWaitlist(w); setPackages(p);
  }, []);
  const load = useCallback(async () => {
    try {
      const from = new Date(Math.min(Date.parse(rangeFrom), Date.now() - 15 * 864e5)).toISOString();
      const [ss, ex] = await Promise.all([loadSessions(from, rangeTo), loadExternal(rangeFrom, rangeTo).catch(() => [] as ExternalEvent[])]);
      setSessions(ss); setExternal(ex.filter((e) => !e.session_id && !e.ignored));
      const doneIds = ss.filter((x) => x.status === 'done').map((x) => x.id);
      setRecords(await loadRecords(doneIds).catch(() => ({})));
      setError('');
    } catch (e) {
      if (e instanceof SessionsNotInstalled) setMissing(true); else setError((e as Error).message);
    }
  }, [rangeFrom, rangeTo]);
  useEffect(() => { loadStatic().catch((e) => { if (e instanceof SessionsNotInstalled) setMissing(true); }); track('screen.calendar'); }, [loadStatic]);
  useEffect(() => { load(); }, [load]);
  // bildirimden: seansı aç (gerekirse o güne git)
  useEffect(() => {
    if (!initialSessionId) return;
    loadSession(initialSessionId).then((x) => { if (x) { setAnchor(trDay(x.starts_at)); setDetail(x); } }).catch(() => {});
  }, [initialSessionId]);

  const refresh = async () => { setRefreshing(true); await Promise.all([load(), loadStatic().catch(() => {})]); setRefreshing(false); };
  const changed = () => { load(); loadStatic().catch(() => {}); };
  const shown = useMemo(() => (sessions ?? []).filter((x) => who === 'all' || (who === 'mine' ? x.clinician_id === me.id : x.clinician_id === who)), [sessions, who, me.id]);
  const inRange = shown.filter((x) => x.starts_at >= rangeFrom && x.starts_at < rangeTo);
  const due = useMemo(() => noteDue(shown, records, new Date()), [shown, records]);
  const todayList = shown.filter((x) => trDay(x.starts_at) === today).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const weekStats = useMemo(() => {
    const wk = shown.filter((x) => trDay(x.starts_at) >= mondayOfDay(today) && trDay(x.starts_at) < addDays(mondayOfDay(today), 7));
    return { planned: wk.filter((x) => !isClosed(x.status) && x.status !== 'offered').length, done: wk.filter((x) => x.status === 'done').length,
             noShow: wk.filter((x) => x.status === 'no_show').length, cancelled: wk.filter((x) => isClosed(x.status)).length };
  }, [shown, today]);
  const waiting = waitlist.filter((w) => w.status === 'waiting');

  const step = (n: number) => setAnchor(addDays(anchor, n * (view === 'week' ? 7 : 1)));
  const label = view === 'week' ? `${shortDay(days[0])} – ${shortDay(days[6])}` : longDay(anchor);
  const newAt = (day: string, hhmm: string) => setForm({ preset: { starts_at: trToIso(day, hhmm) } });
  const openClient = (c: Client, tab: Tab) => { setDetail(null); onOpenClient(c, tab); };
  const nameOf = (x: Session) => clientOf(x.link_id)?.child_name ?? (x.link_id ? 'Paylaşım bitti' : x.title || 'Blok');

  if (missing) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={[s.header, { maxWidth: 900, width: '100%', alignSelf: 'center' }]}><IconButton name="chevron-back" onPress={onBack} label="Geri" /><Text style={s.title}>Takvim</Text></View>
        <View style={{ padding: 20, maxWidth: 900, width: '100%', alignSelf: 'center' }}>
          <Notice icon="construct-outline" text="Seans planlama için veritabanı güncellemesi bekleniyor (ortak 20261105100000_sessions.sql). Kurulunca takvim burada açılır." />
        </View>
      </SafeAreaView>
    );
  }

  const side = (
    <View style={{ gap: 12, width: wide ? 300 : '100%' }}>
      <View style={s.card}>
        <Text style={s.label}>Bugün · {shortDay(today)}</Text>
        {todayList.length === 0 && <Text style={s.small}>Bugün seans yok.</Text>}
        {todayList.map((x) => (
          <Pressable key={x.id} onPress={() => setDetail(x)} style={[s.row, { paddingVertical: 6, borderTopWidth: 1, borderTopColor: colors.line }]}>
            <Text style={[s.body, { width: 48, fontWeight: '700', fontVariant: ['tabular-nums'] }]}>{timeRange(x).slice(0, 5)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={s.body} numberOfLines={1}>{nameOf(x)}</Text>
              <Text style={s.small} numberOfLines={1}>{KIND_LABEL[x.kind]}{x.family_response === 'unavailable' ? ' · aile: uygun değil' : ''}</Text>
            </View>
            <StatusChip status={x.status} small />
          </Pressable>
        ))}
      </View>
      <View style={s.card}>
        <Text style={s.label}>Bu hafta</Text>
        <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
          <Mini n={weekStats.planned} t="seans" /><Mini n={weekStats.done} t="yapıldı" /><Mini n={weekStats.noShow} t="gelmedi" /><Mini n={weekStats.cancelled} t="iptal/erteleme" />
        </View>
      </View>
      {due.length > 0 && (
        <View style={[s.card, { borderColor: '#EADFC9', backgroundColor: '#FFFCF6' }]}>
          <Text style={s.label}>Notu bekleyen {due.length} seans</Text>
          {due.slice(0, 6).map((x) => (
            <Pressable key={x.id} onPress={() => setDetail(x)} style={{ paddingVertical: 4 }}>
              <Text style={s.body}>{nameOf(x)} <Text style={s.small}>· {shortDay(trDay(x.starts_at))}</Text></Text>
            </Pressable>
          ))}
        </View>
      )}
      {waiting.length > 0 && (
        <View style={s.card}>
          <Text style={s.label}>Bekleme listesi · {waiting.length}</Text>
          {waiting.slice(0, 5).map((w) => <Text key={w.id} style={s.small}>{clientOf(w.link_id)?.child_name ?? 'Danışan'}{w.note ? ` · ${w.note}` : ''}</Text>)}
          <Text style={s.small}>İptal edilen bir seansta "Bekleme listesine teklif et".</Text>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <View style={{ flex: 1, width: '100%', maxWidth: 1400, alignSelf: 'center' }}>
        <View style={[s.header, { flexWrap: 'wrap' }]}>
          <IconButton name="chevron-back" onPress={onBack} label="Geri" />
          <View style={{ flex: 1, minWidth: 160 }}>
            <Text style={s.title}>Takvim</Text>
            <Text style={s.small}>{label}</Text>
          </View>
          <IconButton name="settings-outline" onPress={() => setSettingsOpen(true)} label="Takvim ayarları" />
          <Pressable onPress={() => setForm({ preset: null })} style={{ backgroundColor: colors.navy, borderRadius: radius.pill, paddingHorizontal: 14, paddingVertical: 8 }}
            accessibilityRole="button"><Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>+ Seans</Text></Pressable>
        </View>
        <View style={[s.row, { paddingHorizontal: 16, flexWrap: 'wrap', gap: 10, marginBottom: 8 }]}>
          <View style={{ width: 170 }}><Segmented options={[{ id: 'day', label: 'Gün' }, { id: 'week', label: 'Hafta' }]} value={view} onChange={setView} /></View>
          <View style={s.row}>
            <IconButton name="chevron-back-outline" onPress={() => step(-1)} label="Önceki" />
            <SmallButton label="Bugün" onPress={() => setAnchor(today)} />
            <IconButton name="chevron-forward-outline" onPress={() => step(1)} label="Sonraki" />
          </View>
          {owner && team.length > 1 && (
            <View style={[s.row, { flexWrap: 'wrap', gap: 6 }]}>
              {[{ id: 'all', label: 'Hepsi' }, { id: 'mine', label: 'Benim' }, ...team.filter((m) => m.id !== me.id).map((m) => ({ id: m.id, label: m.name }))].map((o) => (
                <Pressable key={o.id} onPress={() => setWho(o.id)} style={[s.opt, who === o.id && s.optOn, { paddingVertical: 5 }]}>
                  <Text style={[s.optText, who === o.id && { color: '#fff' }]}>{o.label}</Text>
                </Pressable>
              ))}
            </View>
          )}
        </View>
        {!!error && <Text style={[s.small, { color: colors.danger, paddingHorizontal: 16 }]}>{error}</Text>}
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}>
          {sessions === null ? <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} /> : (
            <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16, alignItems: 'flex-start' }}>
              <View style={{ flex: 1, minWidth: 0, width: '100%' }}>
                {wide || view === 'week' && width >= 700
                  ? <Grid days={days} today={today} sessions={inRange} external={external} nameOf={nameOf} onOpen={setDetail} onExt={setExt} onNew={newAt} />
                  : <Agenda days={days} today={today} sessions={inRange} external={external} nameOf={nameOf} onOpen={setDetail} onExt={setExt} onNew={(d) => newAt(d, '10:00')} />}
                <Legend />
              </View>
              {(wide || view === 'day') && side}
            </View>
          )}
        </ScrollView>
      </View>

      <SessionSheet open={!!form} me={me} team={team} clients={clients} rooms={rooms} availability={avail} settings={settings} packages={packages}
        editing={form?.editing} preset={form?.preset} onClose={() => setForm(null)} onSaved={() => { setForm(null); changed(); }} />
      <SessionDetailSheet session={detail} client={detail ? clientOf(detail.link_id) : null} me={me} team={team} rooms={rooms} settings={settings}
        onClose={() => setDetail(null)} onChanged={changed}
        onEdit={(x) => { setDetail(null); setTimeout(() => setForm({ editing: x }), 250); }}
        onNext={(x) => { setDetail(null); setTimeout(() => setForm({ preset: { link_id: x.link_id, kind: x.kind, duration_min: x.duration_min, starts_at: new Date(Date.parse(x.starts_at) + 7 * 864e5).toISOString() } }), 250); }}
        onOffer={(x) => { setDetail(null); setTimeout(() => setOffer(x), 250); }}
        onOpenClient={openClient} />
      <CalendarSettingsSheet open={settingsOpen} me={me} team={team} rooms={rooms} availability={avail} settings={settings}
        onClose={() => setSettingsOpen(false)} onChanged={changed} />
      <OfferSheet slot={offer} waitlist={waitlist} clients={clients} onClose={() => setOffer(null)} onDone={() => { setOffer(null); changed(); }} />
      <ExternalSheet event={ext} clients={clients} onClose={() => setExt(null)} onDone={() => { setExt(null); changed(); }} />
    </SafeAreaView>
  );
}

const Mini = ({ n, t }: { n: number; t: string }) => (
  <View style={{ minWidth: 112, flex: 1 }}><Text style={{ fontSize: 20, fontWeight: '700', color: colors.navy }}>{n}</Text><Text style={s.small}>{t}</Text></View>
);

function Legend() {
  const items: [string, string, string][] = [['planned', 'Planlandı', ''], ['done', 'Yapıldı', ''], ['no_show', 'Gelmedi', ''], ['late_cancel', 'Geç iptal', ''], ['cancelled', 'İptal', '']];
  return (
    <View style={[s.row, { flexWrap: 'wrap', gap: 12, marginTop: 10 }]}>
      {items.map(([k, t]) => {
        const m = STATUS_META[k as keyof typeof STATUS_META];
        return <View key={k} style={[s.row, { gap: 5 }]}><View style={{ width: 13, height: 13, borderRadius: 4, backgroundColor: m.bg, borderWidth: 1, borderColor: m.line }} /><Text style={s.small}>{t}</Text></View>;
      })}
      <View style={[s.row, { gap: 5 }]}><View style={{ width: 13, height: 13, borderRadius: 4, borderWidth: 1, borderColor: colors.faint, borderStyle: 'dashed' }} /><Text style={s.small}>Dış takvim</Text></View>
      <View style={[s.row, { gap: 5 }]}><Ionicons name="eye-outline" size={13} color={colors.muted} /><Text style={s.small}>Ailede görünür</Text></View>
    </View>
  );
}

const PX = 1.05;   // dakika başına piksel
type GridProps = { days: string[]; today: string; sessions: Session[]; external: ExternalEvent[]; nameOf: (x: Session) => string;
  onOpen: (x: Session) => void; onExt: (e: ExternalEvent) => void; onNew: (day: string, hhmm: string) => void };

function Grid({ days, today, sessions, external, nameOf, onOpen, onExt, onNew }: GridProps) {
  const mins = [...sessions.map((x) => trMinutes(x.starts_at)), ...external.map((e) => trMinutes(e.starts_at))];
  const ends = [...sessions.map((x) => trMinutes(x.starts_at) + x.duration_min), ...external.map((e) => trMinutes(e.ends_at))];
  const h0 = Math.min(8, ...mins.map((m) => Math.floor(m / 60))), h1 = Math.max(20, ...ends.map((m) => Math.ceil(m / 60)));
  const hours = Array.from({ length: h1 - h0 }, (_, i) => h0 + i);
  const height = (h1 - h0) * 60 * PX;
  const nowMin = trMinutes(new Date().toISOString());
  return (
    <ScrollView horizontal contentContainerStyle={{ minWidth: '100%' }}>
      <View style={{ flex: 1, minWidth: 720, backgroundColor: '#fff', borderRadius: radius.md, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' }}>
        <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line }}>
          <View style={{ width: 46 }} />
          {days.map((d) => (
            <View key={d} style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: d === today ? colors.today : undefined }}>
              <Text style={{ fontSize: 12, color: colors.muted, fontWeight: '600' }}>{shortDay(d).split(' ').slice(2).join(' ')}</Text>
              <Text style={{ fontSize: 16, fontWeight: '700', color: d === today ? '#2C4A9A' : colors.navy }}>{Number(d.slice(8))}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ width: 46 }}>
            {hours.map((h) => <Text key={h} style={{ height: 60 * PX, fontSize: 11, color: colors.muted, textAlign: 'right', paddingRight: 6, paddingTop: 2 }}>{`${String(h).padStart(2, '0')}:00`}</Text>)}
          </View>
          {days.map((d) => {
            const placed = layoutDay(sessions.filter((x) => trDay(x.starts_at) === d), h0 * 60, PX, 30);
            const ext = external.filter((e) => trDay(e.starts_at) === d);
            return (
              <View key={d} style={{ flex: 1, height, borderLeftWidth: 1, borderLeftColor: colors.line, backgroundColor: d === today ? '#FAFBFE' : undefined }}>
                {hours.map((h) => (
                  <Pressable key={h} onPress={() => onNew(d, minToHhmm(h * 60))} accessibilityLabel={`${shortDay(d)} ${h}:00 yeni seans`}
                    style={{ position: 'absolute', top: (h - h0) * 60 * PX, left: 0, right: 0, height: 60 * PX, borderTopWidth: h === h0 ? 0 : 1, borderTopColor: '#F0F2F6' }} />
                ))}
                {ext.map((e) => {
                  const st = trMinutes(e.starts_at), en = trMinutes(e.ends_at);
                  return (
                    <Pressable key={e.id} onPress={() => onExt(e)} style={{ position: 'absolute', top: (st - h0 * 60) * PX, height: Math.max(22, (en - st) * PX - 2), left: 3, right: 3,
                      borderRadius: 7, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.faint, backgroundColor: '#F7F8FA', padding: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.muted }} numberOfLines={2}>{e.summary || 'Dış takvim'}</Text>
                    </Pressable>
                  );
                })}
                {placed.map(({ item: x, top, height: hh, col, cols }) => <Block key={x.id} x={x} name={nameOf(x)} onPress={() => onOpen(x)}
                  style={{ position: 'absolute', top, height: hh, left: `${(col / cols) * 100}%`, width: `${100 / cols}%` }} />)}
                {d === today && nowMin >= h0 * 60 && nowMin <= h1 * 60 && (
                  <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: (nowMin - h0 * 60) * PX, height: 2, backgroundColor: colors.danger }} />
                )}
              </View>
            );
          })}
        </View>
      </View>
    </ScrollView>
  );
}

function Block({ x, name, onPress, style }: { x: Session; name: string; onPress: () => void; style: object }) {
  const m = STATUS_META[x.status];
  const planned = x.status === 'planned' || x.status === 'offered';
  return (
    <View style={[style, { padding: 2 }]}>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${name}, ${timeRange(x)}, ${m.label}`}
        style={{ flex: 1, borderRadius: 8, backgroundColor: m.bg, borderWidth: planned ? 1.5 : 0, borderColor: m.line, paddingHorizontal: 6, paddingVertical: 4, overflow: 'hidden' }}>
        <View style={[s.row, { gap: 4 }]}>
          <Text style={{ flex: 1, fontSize: 12.5, fontWeight: '700', color: x.status === 'cancelled' || x.status === 'postponed' ? colors.muted : colors.navy,
            textDecorationLine: isClosed(x.status) ? 'line-through' : 'none' }} numberOfLines={1}>{name}</Text>
          {x.visible_to_family && <Ionicons name="eye-outline" size={11} color={colors.muted} />}
          {x.family_response === 'unavailable' && <Ionicons name="alert-circle" size={12} color="#9A6B00" />}
        </View>
        <Text style={{ fontSize: 11, color: m.fg }} numberOfLines={1}>{timeRange(x)} · {KIND_LABEL[x.kind]}</Text>
      </Pressable>
    </View>
  );
}

function Agenda({ days, today, sessions, external, nameOf, onOpen, onExt, onNew }: Omit<GridProps, 'onNew'> & { onNew: (day: string) => void }) {
  return (
    <View style={{ gap: 12 }}>
      {days.map((d) => {
        const list = sessions.filter((x) => trDay(x.starts_at) === d).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
        const ext = external.filter((e) => trDay(e.starts_at) === d);
        if (days.length > 1 && !list.length && !ext.length) return null;
        return (
          <View key={d} style={{ gap: 6 }}>
            {days.length > 1 && <Text style={[s.label, d === today && { color: '#2C4A9A' }]}>{shortDay(d)}{d === today ? ' · bugün' : ''}</Text>}
            {list.length === 0 && ext.length === 0 && (
              <Pressable onPress={() => onNew(d)} style={[s.card, { borderStyle: 'dashed', alignItems: 'center' }]}><Text style={s.small}>Seans yok · dokun, ekle</Text></Pressable>
            )}
            {list.map((x) => (
              <Pressable key={x.id} onPress={() => onOpen(x)} style={[s.card, s.row, { borderLeftWidth: 4, borderLeftColor: STATUS_META[x.status].line, paddingVertical: 10 }]}>
                <Text style={{ width: 54, fontWeight: '700', color: colors.navy, fontVariant: ['tabular-nums'] }}>{timeRange(x).slice(0, 5)}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[s.body, { fontWeight: '600' }, isClosed(x.status) && { textDecorationLine: 'line-through', color: colors.muted }]} numberOfLines={1}>{nameOf(x)}</Text>
                  <Text style={s.small} numberOfLines={1}>{timeRange(x)} · {KIND_LABEL[x.kind]}{x.family_response === 'unavailable' ? ' · aile: uygun değil' : ''}</Text>
                </View>
                {x.visible_to_family && <Ionicons name="eye-outline" size={14} color={colors.muted} />}
                <StatusChip status={x.status} small />
              </Pressable>
            ))}
            {ext.map((e) => (
              <Pressable key={e.id} onPress={() => onExt(e)} style={[s.card, s.row, { borderStyle: 'dashed', backgroundColor: '#F7F8FA', paddingVertical: 8 }]}>
                <Ionicons name="calendar-outline" size={14} color={colors.muted} />
                <Text style={[s.small, { flex: 1 }]} numberOfLines={1}>{e.summary || 'Dış takvim'} · {timeRange({ starts_at: e.starts_at, duration_min: (Date.parse(e.ends_at) - Date.parse(e.starts_at)) / 60e3 })}</Text>
              </Pressable>
            ))}
          </View>
        );
      })}
      {days.length > 1 && sessions.length === 0 && external.length === 0 && <Text style={s.small}>Bu hafta seans yok.</Text>}
    </View>
  );
}
