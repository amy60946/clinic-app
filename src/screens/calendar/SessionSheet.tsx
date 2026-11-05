import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Cta, Toggle } from '../../components/ui';
import DateField from '../../components/DateField';
import type { Client, ClinicianMe, Member } from '../../lib/clinic';
import { track } from '../../lib/track';
import {
  KIND_LABEL, MODE_LABEL, trDay, trTime, trToIso, freeStarts, seriesDates, shortDay,
  type Session, type SessionKind, type SessionMode, type Room, type Availability, type SessionSettings, type SessionPackage, type Busy,
} from '../../lib/sessionCore';
import { createSession, updateSession, loadBusy, type Conflict } from '../../lib/sessions';
import { SheetHeader, Chips, FieldLabel, TimeInput, s } from './parts';

// Yeni seans / seansı düzelt (ortak akislar.md 20, 1). Tekrar: her hafta / iki haftada bir; aileye göster: tarih, saat, yer ve tür
// ParentApp'te görünür, not ve gündem görünmez. Çakışma (oda / uzman) kaydı engellemez, sonradan uyarır.
export type SessionPreset = { link_id?: string | null; starts_at?: string; kind?: SessionKind; duration_min?: number };

const DURATIONS = [30, 40, 45, 50, 60, 90];
const COUNTS = [4, 8, 12, 16];

export default function SessionSheet(p: {
  open: boolean; me: ClinicianMe; team: Member[]; clients: Client[]; rooms: Room[]; availability: Availability[]; settings: SessionSettings;
  packages: SessionPackage[]; editing?: Session | null; preset?: SessionPreset | null; onClose: () => void; onSaved: (ids: string[]) => void;
}) {
  return (
    <Modal visible={p.open} animationType="slide" presentationStyle="pageSheet" onRequestClose={p.onClose}>
      {p.open && <Body {...p} />}
    </Modal>
  );
}

function Body({ me, team, clients, rooms, availability, settings, packages, editing, preset, onClose, onSaved }: Parameters<typeof SessionSheet>[0]) {
  const start0 = editing?.starts_at ?? preset?.starts_at ?? nextHour();
  const [linkId, setLinkId] = useState<string | null>(editing ? editing.link_id : preset?.link_id ?? clients[0]?.link_id ?? null);
  const [title, setTitle] = useState(editing?.title ?? '');
  const [clinician, setClinician] = useState(editing?.clinician_id ?? me.id);
  const [kind, setKind] = useState<SessionKind>(editing?.kind ?? preset?.kind ?? 'individual');
  const [mode, setMode] = useState<SessionMode>(editing?.mode ?? 'in_person');
  const [room, setRoom] = useState<string | null>(editing?.room_id ?? null);
  const [day, setDay] = useState(trDay(start0));
  const [time, setTime] = useState(trTime(start0));
  const [dur, setDur] = useState(editing?.duration_min ?? preset?.duration_min ?? settings.slot_minutes ?? 45);
  const [repeat, setRepeat] = useState<'none' | 'weekly' | 'biweekly'>('none');
  const [count, setCount] = useState(8);
  const [visible, setVisible] = useState(editing ? editing.visible_to_family : true);
  const [pkg, setPkg] = useState<string | null>(editing?.package_id ?? null);
  const [picking, setPicking] = useState(!editing && !preset?.link_id && clients.length > 1);
  const [q, setQ] = useState('');
  const [busy, setBusy] = useState<Busy[] | null>(null);
  const [saving, setSaving] = useState(false);
  const owner = me.role === 'owner';
  const client = clients.find((c) => c.link_id === linkId) ?? null;
  const activeRooms = rooms.filter((r) => r.active || r.id === room);
  const myPackages = packages.filter((x) => x.link_id === linkId && !x.closed_at);

  useEffect(() => {
    let alive = true;
    const from = trToIso(day, '00:00'), to = trToIso(day, '23:59');
    loadBusy(from, to).then((b) => { if (alive) setBusy(b.filter((x) => !editing || x.starts_at !== editing.starts_at || x.clinician_id !== editing.clinician_id)); })
      .catch(() => { if (alive) setBusy([]); });
    return () => { alive = false; };
  }, [day, editing]);
  // bugün için geçmiş saatler önerilmez
  const free = useMemo(() => (busy ? freeStarts(day, availability, busy, clinician ?? me.id, dur, room).filter((t) => Date.parse(trToIso(day, t)) > Date.now()) : []),
    [busy, day, availability, clinician, dur, room, me.id]);
  const valid = /^([01]\d|2[0-3]):[0-5]\d$/.test(time) && (!!linkId || title.trim().length > 0);
  const startsAt = valid ? trToIso(day, time.padStart(5, '0')) : null;
  const dates = startsAt ? seriesDates(startsAt, editing ? 'none' : repeat, count) : [];
  const shown = clients.filter((c) => !q || c.child_name.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')) || c.label.toLocaleLowerCase('tr-TR').includes(q.toLocaleLowerCase('tr-TR')));

  const warn = (conf: Conflict[]) => {
    if (!conf.length) return;
    const room = conf.some((c) => c.room), cl = conf.some((c) => c.clinician);
    Alert.alert('Çakışma var', `${conf.length} seans ${[room && 'aynı odada', cl && 'aynı uzmanda'].filter(Boolean).join(' ve ')} başka bir seansla çakışıyor. Takvimde kontrol et.`);
  };
  const save = async (scope: 'one' | 'following' = 'one') => {
    if (!startsAt) return;
    setSaving(true);
    try {
      const input = { link_id: linkId, title: linkId ? null : title.trim(), clinician_id: clinician, starts_at: startsAt, duration_min: dur, kind, mode,
                      room_id: mode === 'in_person' ? room : null, visible_to_family: !!linkId && visible, package_id: linkId ? pkg : null };
      if (editing) {
        const { link_id: _l, ...patch } = input;   // danışan sonradan değişmez
        const r = await updateSession(editing.id, patch, scope);
        track('session.update', { scope, n: r.updated });
        warn(r.conflicts);
        onSaved([editing.id]);
      } else {
        const r = await createSession({ ...input, repeat, count });
        track('session.create', { repeat, n: r.ids.length, visible: input.visible_to_family, client: !!linkId });
        warn(r.conflicts);
        onSaved(r.ids);
      }
    } catch (e) {
      Alert.alert('Kaydedilemedi', (e as Error).message);
    } finally {
      setSaving(false);
    }
  };
  const ask = () => {
    if (editing?.series_id) {
      Alert.alert('Tekrarlayan seans', 'Değişiklik hangi seanslara uygulansın?', [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Yalnız bu seans', onPress: () => save('one') },
        { text: 'Bu ve sonrakiler', onPress: () => save('following') },
      ]);
    } else save();
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.column}>
        <SheetHeader title={editing ? 'Seansı düzelt' : 'Yeni seans'} onClose={onClose} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <FieldLabel>Danışan</FieldLabel>
          {editing ? (
            <Text style={s.body}>{client ? client.child_name : editing.title || 'Danışansız blok'}</Text>
          ) : picking ? (
            <View style={[s.card, { padding: 8, gap: 2 }]}>
              {clients.length > 5 && (
                <TextInput value={q} onChangeText={setQ} placeholder="Ara" placeholderTextColor={colors.muted} style={[s.input, { marginBottom: 4 }]} />
              )}
              {shown.slice(0, 30).map((c) => (
                <Pressable key={c.link_id} onPress={() => { setLinkId(c.link_id); setPicking(false); }} style={{ paddingVertical: 9, paddingHorizontal: 8, borderRadius: 8 }}>
                  <Text style={s.body}>{c.child_name}{c.label ? <Text style={s.small}>  ·  {c.label}</Text> : null}</Text>
                </Pressable>
              ))}
              <Pressable onPress={() => { setLinkId(null); setPicking(false); setKind('other'); }} style={{ paddingVertical: 9, paddingHorizontal: 8 }}>
                <Text style={[s.body, { color: colors.muted }]}>Danışansız blok (toplantı, süpervizyon, yeni aile…)</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setPicking(true)} style={[s.card, s.row, { paddingVertical: 12 }]} accessibilityRole="button">
              <Ionicons name={client ? 'person-outline' : 'calendar-clear-outline'} size={18} color={colors.navy} />
              <Text style={[s.body, { flex: 1 }]}>{client ? client.child_name : 'Danışansız blok'}{client?.label ? <Text style={s.small}>  ·  {client.label}</Text> : null}</Text>
              <Text style={s.link}>Değiştir</Text>
            </Pressable>
          )}
          {!linkId && (
            <>
              <FieldLabel hint="Yalnız sende ve takvim aboneliğinde görünür">Başlık</FieldLabel>
              <TextInput value={title} onChangeText={setTitle} maxLength={80} placeholder="Ör. Ekip toplantısı" placeholderTextColor={colors.muted} style={s.input} />
            </>
          )}

          {owner && team.length > 1 && (
            <>
              <FieldLabel>Uzman</FieldLabel>
              <Chips options={team.map((m) => ({ id: m.id, label: m.id === me.id ? `${m.name} (sen)` : m.name }))} value={clinician ?? me.id} onChange={setClinician} />
            </>
          )}

          <FieldLabel>Tür</FieldLabel>
          <Chips options={(Object.keys(KIND_LABEL) as SessionKind[]).filter((k) => (linkId ? k !== 'other' : true)).map((k) => ({ id: k, label: KIND_LABEL[k] }))}
            value={kind} onChange={setKind} />

          <FieldLabel>Tarih ve saat</FieldLabel>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            <View style={{ flex: 1, minWidth: 180 }}><DateField mode="date" value={day} onChange={(v) => v && setDay(v.slice(0, 10))} placeholder="Tarih" /></View>
            <TimeInput value={time} onChange={setTime} label="Saat" />
          </View>
          {busy === null ? <ActivityIndicator style={{ marginTop: 8, alignSelf: 'flex-start' }} color={colors.navy} />
            : free.length > 0 && (
              <View style={{ marginTop: 8 }}>
                <Text style={[s.small, { marginBottom: 6 }]}>Uygun saatler · {shortDay(day)}</Text>
                <Chips options={free.slice(0, 12).map((t) => ({ id: t, label: t }))} value={time} onChange={setTime} />
              </View>
            )}

          <FieldLabel>Süre</FieldLabel>
          <Chips options={DURATIONS.map((d) => ({ id: d, label: `${d} dk` }))} value={dur} onChange={setDur} />

          <FieldLabel>Yer</FieldLabel>
          <Chips options={(Object.keys(MODE_LABEL) as SessionMode[]).map((m) => ({ id: m, label: MODE_LABEL[m] }))} value={mode} onChange={setMode} />
          {mode === 'in_person' && activeRooms.length > 0 && (
            <View style={{ marginTop: 8 }}>
              <Chips options={[{ id: '', label: 'Oda yok' }, ...activeRooms.map((r) => ({ id: r.id, label: r.location ? `${r.name} · ${r.location}` : r.name }))]}
                value={room ?? ''} onChange={(v) => setRoom(v || null)} />
            </View>
          )}

          {!editing && (
            <>
              <FieldLabel>Tekrar</FieldLabel>
              <Chips options={[{ id: 'none', label: 'Tek seans' }, { id: 'weekly', label: 'Her hafta' }, { id: 'biweekly', label: 'İki haftada bir' }]}
                value={repeat} onChange={(v) => setRepeat(v as typeof repeat)} />
              {repeat !== 'none' && (
                <View style={{ marginTop: 8, gap: 6 }}>
                  <Chips options={COUNTS.map((n) => ({ id: n, label: `${n} seans` }))} value={count} onChange={setCount} />
                  {dates.length > 1 && <Text style={s.small}>{shortDay(trDay(dates[0]))} → {shortDay(trDay(dates[dates.length - 1]))} · {time}</Text>}
                </View>
              )}
            </>
          )}

          {!!linkId && (
            <>
              <View style={[s.card, s.row, { marginTop: 14 }]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.label}>Aile uygulamasında göster</Text>
                  <Text style={s.small}>Tarih, saat, yer ve tür ParentApp › Uzmanım'da görünür; ebeveyn hatırlatma alır. Not ve gündem görünmez.</Text>
                </View>
                <Toggle value={visible} onChange={setVisible} />
              </View>
              {myPackages.length > 0 && (
                <>
                  <FieldLabel hint="Paketten düşer: yapılan seans; ayara göre gelmedi ve geç iptal de.">Paket</FieldLabel>
                  <Chips options={[{ id: '', label: 'Paketsiz' }, ...myPackages.map((x) => ({ id: x.id, label: x.title }))]}
                    value={pkg ?? ''} onChange={(v) => setPkg(v || null)} />
                </>
              )}
            </>
          )}

          <Cta label={editing ? 'Kaydet' : dates.length > 1 ? `${dates.length} seansı kaydet` : 'Kaydet'} onPress={ask} busy={saving} disabled={!valid}
            style={{ marginTop: 22 }} />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

// Bir sonraki tam saat (Türkiye), en erken 09:00
function nextHour(): string {
  const now = Date.now();
  const d = trDay(new Date(now).toISOString());
  const m = Math.max(9 * 60, Math.ceil((((now + 3 * 3600e3) % 864e5) / 60e3 + 1) / 60) * 60);
  return m >= 20 * 60 ? trToIso(nextDay(d), '09:00') : trToIso(d, `${String(Math.floor(m / 60)).padStart(2, '0')}:00`);
}
const nextDay = (d: string) => new Date(Date.parse(`${d}T12:00:00Z`) + 864e5).toISOString().slice(0, 10);
