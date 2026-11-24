import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, Alert, ActivityIndicator } from 'react-native';
import { colors } from '../../theme';
import { Notice, SmallButton } from '../../components/ui';
import type { Client, Member } from '../../lib/clinic';
import { observations, addDays } from '../../lib/metrics';
import {
  DEFAULT_SETTINGS, KIND_LABEL, STATUS_META, RESPONSE_LABEL, attendance, weeklyCells, hasNote, isOfferLeftover, shortDay, trDay, timeRange,
  type Session, type SessionRecord, type Room, type Availability, type SessionSettings, feeText } from '../../lib/sessionCore';
import { SessionsNotInstalled, loadLinkSessions, loadRecords, loadSettings, listRooms, listAvailability } from '../../lib/sessions';
import SessionSheet, { type SessionPreset } from '../calendar/SessionSheet';
import SessionDetailSheet from '../calendar/SessionDetailSheet';
import { StatusChip, s } from '../calendar/parts';
import type { ClientCtx, Tab } from './ClientScreen';
import { errorText } from '../../lib/errors';

// Danışan › Seanslar (ortak akislar.md 20, 5): iki sayaç (seans yapıldı / yapılmadı), son 10 hafta, her seansın ara döneminde evden gelenler.
// Paket, bekleme listesi ve geç iptal yok (kullanıcı kararı 23 Kasım 2026).
export default function SessionsTab({ client, me, data, today, team, clients, onOpenTab }: ClientCtx & {
  team: Member[]; clients: Client[]; onOpenTab: (t: Tab) => void;
}) {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [records, setRecords] = useState<Record<string, SessionRecord>>({});
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [avail, setAvail] = useState<Availability[]>([]);
  const [missing, setMissing] = useState(false);
  const [form, setForm] = useState<{ editing?: Session | null; preset?: SessionPreset | null } | null>(null);
  const [detail, setDetail] = useState<Session | null>(null);
  const now = new Date();

  const load = useCallback(async () => {
    try {
      const [ss, st, rm, av] = await Promise.all([loadLinkSessions(client.link_id), loadSettings(), listRooms(), listAvailability()]);
      setSessions(ss.filter((x) => !isOfferLeftover(x))); setSettings(st); setRooms(rm); setAvail(av);
      setRecords(await loadRecords(ss.filter((x) => x.status === 'done').map((x) => x.id)).catch(() => ({})));
    } catch (e) {
      if (e instanceof SessionsNotInstalled) setMissing(true); else Alert.alert('Yüklenemedi', errorText(e));
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
    <View style={{ gap: 12, marginTop: 6 }}>
      <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
        <Tile n={String(att.done)} t="Seans yapıldı" />
        <Tile n={String(att.missed)} t="Seans yapılmadı" />
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
              style={{ flex: 1, height: 26, borderRadius: 5, backgroundColor: m ? m.bg : '#F5F6F8', borderWidth: 1, borderColor: m ? m.line : colors.faint,
                borderStyle: m ? 'solid' : 'dashed' }} />;
          })}
        </View>
        <View style={[s.row, { flexWrap: 'wrap', gap: 10 }]}>
          {(['done', 'no_show', 'planned'] as const).map((k) => (
            <View key={k} style={[s.row, { gap: 4 }]}><View style={{ width: 12, height: 12, borderRadius: 3, backgroundColor: STATUS_META[k].bg, borderWidth: 1, borderColor: STATUS_META[k].line }} />
              <Text style={s.small}>{STATUS_META[k].label}</Text></View>
          ))}
          <View style={[s.row, { gap: 4 }]}><View style={{ width: 12, height: 12, borderRadius: 3, borderWidth: 1, borderColor: colors.faint, borderStyle: 'dashed' }} /><Text style={s.small}>Seans yok</Text></View>
        </View>
      </View>

      <View style={s.card}>
        {rows.length === 0 && <Text style={s.small}>Henüz seans yok. "+ Seans" ile ilk seansı planla.</Text>}
        {[{ key: 'up', title: 'Yaklaşan', list: rows.filter((r) => Date.parse(r.x.starts_at) > now.getTime()).reverse() },
          { key: 'past', title: 'Geçmiş', list: rows.filter((r) => Date.parse(r.x.starts_at) <= now.getTime()).slice(0, 30) }].filter((g) => g.list.length).map((g) => (
          <View key={g.key}>
        <Text style={[s.label, { marginTop: g.key === 'past' ? 10 : 0, marginBottom: 2 }]}>{g.title}</Text>
        {g.list.map(({ x, rate, abc }) => (
          <Pressable key={x.id} onPress={() => setDetail(x)} style={[s.row, { paddingVertical: 8, borderTopWidth: 1, borderTopColor: colors.line, alignItems: 'flex-start' }]}>
            {/* 375 px telefonda 128 + 140 + durum çipi ekrandan taşıyordu (5 Kasım 2026) */}
            <View style={{ width: 100 }}>
              <Text style={[s.body, { fontWeight: '600' }]}>{shortDay(trDay(x.starts_at))}</Text>
              <Text style={s.small}>{timeRange(x)}</Text>
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'baseline' }}>
                <Text style={[s.body, { flexShrink: 1 }]} numberOfLines={1}>{KIND_LABEL[x.kind]}</Text>
                {!!feeText(x.fee) && <Text style={[s.body, { flexShrink: 0 }]}>{feeText(x.fee)}</Text>}
              </View>
              <Text style={s.small}>
                {[x.status === 'done' && (hasNote(records[x.id]) ? 'Not yazıldı' : 'Not yok'), x.family_response && RESPONSE_LABEL[x.family_response],
                  rate !== null && `arada evde: rutin\u00a0%${rate}`, abc !== null && `${abc}\u00a0davranış kaydı`].filter(Boolean).join(', ')}
              </Text>
            </View>
            <StatusChip status={x.status} />
          </Pressable>
        ))}
          </View>
        ))}
      </View>

      <SessionSheet open={!!form} me={me} team={team} clients={clients.length ? clients : [client]} rooms={rooms} availability={avail} settings={settings}
        editing={form?.editing} preset={form?.preset} onClose={() => setForm(null)} onSaved={() => { setForm(null); load(); }} />
      <SessionDetailSheet session={detail} client={client} me={me} team={team} rooms={rooms}
        onClose={() => setDetail(null)} onChanged={load}
        onEdit={(x) => { setDetail(null); setTimeout(() => setForm({ editing: x }), 250); }}
        onOpenClient={(_c, t) => { setDetail(null); onOpenTab(t); }} />
    </View>
  );
}

const Tile = ({ n, t }: { n: string; t: string }) => (
  <View style={s.tile}><Text style={s.tileNum}>{n}</Text><Text style={s.small}>{t}</Text></View>
);
