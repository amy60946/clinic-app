import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { Cta, Segmented, SmallButton } from '../../components/ui';
import { loadClientData, type Client, type ClientData, type ClinicianMe, type Member } from '../../lib/clinic';
import { DECLINE_LABELS, observations, addDays } from '../../lib/metrics';
import { track } from '../../lib/track';
import {
  KIND_LABEL, MODE_LABEL, RESPONSE_LABEL, STATUS_META, prepSummary, sessionWhen, trDay, wouldBeLate, canMarkDone, isClosed, hasNote,
  type Session, type SessionRecord, type Room, type SessionSettings, type AgendaItem, type HomeworkItem, type Prep,
} from '../../lib/sessionCore';
import { loadLinkSessions, loadRecords, saveRecord, setSessionStatus, deleteSession } from '../../lib/sessions';
import { loadHomework, sendHomework, type Homework } from '../../lib/homework';
import PublishSheet from '../plan/PublishSheet';
import type { Tab } from '../client/ClientScreen';
import { SheetHeader, StatusChip, Chips, FieldLabel, Private, s } from './parts';

// Seans ayrıntısı (ortak akislar.md 20, 2–4): Hazırlık = son yapılan seanstan bu yana evde olanlar + kendiliğinden gündem (C);
// Kayıt = durum, katılanlar, gözlem / çalışılan / sonraki adım (yalnız klinik), aileye ev ödevi (Takip Planı'nın "Aileye gönder"i),
// sonraki seans. Danışansız blokta yalnız durum ve düzeltme.
export default function SessionDetailSheet(p: {
  session: Session | null; client: Client | null; me: ClinicianMe; team: Member[]; rooms: Room[]; settings: SessionSettings;
  onClose: () => void; onChanged: () => void; onEdit: (s: Session) => void; onNext: (s: Session) => void; onOffer: (s: Session) => void;
  onOpenClient: (c: Client, tab: Tab) => void;
}) {
  return (
    <Modal visible={!!p.session} animationType="slide" presentationStyle="pageSheet" onRequestClose={p.onClose}>
      {p.session && <Body key={p.session.id} {...p} session={p.session} />}
    </Modal>
  );
}

const ATTENDEES = ['Çocuk', 'Anne', 'Baba', 'Bakım veren', 'Kardeş'];

function Body({ session, client, me, team, rooms, settings, onClose, onChanged, onEdit, onNext, onOffer, onOpenClient }:
  Parameters<typeof SessionDetailSheet>[0] & { session: Session }) {
  const [view, setView] = useState<'prep' | 'record'>(session.status === 'planned' && Date.parse(session.starts_at) > Date.now() ? 'prep' : 'record');
  const [data, setData] = useState<ClientData | null>(null);
  const [linkSessions, setLinkSessions] = useState<Session[]>([]);
  const [record, setRecord] = useState<SessionRecord | null>(null);
  const [prevRecord, setPrevRecord] = useState<SessionRecord | null>(null);
  const [hw, setHw] = useState<Homework | null>(null);
  const [loadErr, setLoadErr] = useState('');
  const [status, setStatus] = useState(session.status);
  const [attendees, setAttendees] = useState<string[]>([]);
  const [observation, setObservation] = useState('');
  const [worked, setWorked] = useState('');
  const [nextStep, setNextStep] = useState('');
  const [agenda, setAgenda] = useState<AgendaItem[]>([]);
  const [homework, setHomework] = useState<HomeworkItem[]>([]);
  const [own, setOwn] = useState('');
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pub, setPub] = useState(false);
  const now = new Date();
  const today = trDay(now.toISOString());
  const room = rooms.find((r) => r.id === session.room_id);
  const who = team.find((m) => m.id === session.clinician_id);
  const clientName = client?.child_name ?? session.title ?? 'Danışansız blok';

  const load = useCallback(async () => {
    try {
      const [ls, rec] = await Promise.all([client ? loadLinkSessions(client.link_id) : Promise.resolve([] as Session[]), loadRecords([session.id])]);
      setLinkSessions(ls);
      const r = rec[session.id] ?? null;
      setRecord(r);
      if (r) {
        setAttendees(r.attendees); setObservation(r.observation ?? ''); setWorked(r.worked ?? ''); setNextStep(r.next_step ?? '');
        setAgenda(r.agenda ?? []); setHomework(r.homework ?? []);
      }
      if (client) {
        const prev = ls.filter((x) => x.id !== session.id && x.status === 'done' && x.starts_at < session.starts_at).sort((a, b) => b.starts_at.localeCompare(a.starts_at))[0];
        if (prev) loadRecords([prev.id]).then((m) => setPrevRecord(m[prev.id] ?? null)).catch(() => {});
        const from = addDays(trDay(session.starts_at), -70);
        const d = await loadClientData(client.child_id, from);
        setData(d);
        loadHomework(client, d.tasks, today).then(setHw).catch(() => setHw(null));
      }
    } catch (e) {
      setLoadErr((e as Error).message);
    }
  }, [client, session.id, session.starts_at, today]);
  useEffect(() => { load(); }, [load]);

  const prep: Prep | null = useMemo(() => {
    if (!client || !data) return null;
    const declines = observations(data.tasks, data.completions, addDays(today, -21), addDays(today, -1)).declineReasons;
    const top = (Object.entries(declines) as [keyof typeof DECLINE_LABELS, number][]).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0];
    return prepSummary(session, linkSessions, data, { pending: hw?.pending ?? [], reviewDue: hw?.reviewDue ?? [], declineTop: top ? DECLINE_LABELS[top[0]] : null }, now);
  }, [client, data, linkSessions, hw, session]); // eslint-disable-line react-hooks/exhaustive-deps
  // kayıtta gündem yoksa özetin gündemiyle başlar
  useEffect(() => { if (prep && !record && !agenda.length) setAgenda(prep.agenda); }, [prep]); // eslint-disable-line react-hooks/exhaustive-deps

  const change = async (next: Exclude<typeof status, 'offered'>) => {
    const apply = async (waive: boolean) => {
      try {
        const v = await setSessionStatus(session.id, next, null, waive);
        setStatus(v);
        track('session.status', { status: v, waive });
        onChanged();
        if ((v === 'cancelled' || v === 'late_cancel' || v === 'postponed') && client && Date.parse(session.starts_at) > Date.now()) {
          Alert.alert('Saat boşaldı', 'Bekleme listesindeki bir aileye bu saati teklif edebilirsin.', [
            { text: 'Şimdi değil', style: 'cancel' }, { text: 'Teklif et', onPress: () => onOffer(session) },
          ]);
        }
      } catch (e) { Alert.alert('Değiştirilemedi', (e as Error).message); }
    };
    if (next === 'cancelled' && wouldBeLate(session.starts_at, new Date(), settings.cancel_hours)) {
      Alert.alert('Geç iptal', `Seansa ${settings.cancel_hours} saatten az kaldı; kural gereği "Geç iptal" yazılır${settings.count_late_cancel ? ' ve paketten düşer' : ''}.`, [
        { text: 'Vazgeç', style: 'cancel' }, { text: 'Geç iptal sayma', onPress: () => apply(true) }, { text: 'Geç iptal', onPress: () => apply(false) },
      ]);
      return;
    }
    if ((next === 'done' || next === 'no_show') && !canMarkDone(session.starts_at, new Date())) {
      Alert.alert('Seans henüz başlamadı', '"Yapıldı" ve "Gelmedi" seans saatinden sonra yazılır.');
      return;
    }
    apply(false);
  };

  const save = async () => {
    setSaving(true);
    try {
      await saveRecord(session.id, { attendees, observation, worked, next_step: nextStep, agenda, homework });
      track('session.record', { note: !!(observation || worked || nextStep), agenda: agenda.length, homework: homework.length });
      setDirty(false);
      onChanged();
      Alert.alert('Kaydedildi', 'Seans kaydı yalnız klinikte görünür.');
    } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); } finally { setSaving(false); }
  };
  const remove = () => {
    const run = async (scope: 'one' | 'following') => {
      try { await deleteSession(session.id, scope); track('session.delete', { scope }); onChanged(); onClose(); }
      catch (e) { Alert.alert('Silinemedi', (e as Error).message); }
    };
    Alert.alert('Seansı sil', session.visible_to_family && Date.parse(session.starts_at) > Date.now() ? 'Aileye "randevu iptal edildi" bildirimi gider.' : 'Seans takvimden kalkar.',
      session.series_id ? [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Yalnız bu', style: 'destructive', onPress: () => run('one') }, { text: 'Bu ve sonrakiler', style: 'destructive', onPress: () => run('following') }]
        : [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Sil', style: 'destructive', onPress: () => run('one') }]);
  };
  const touch = <T,>(set: (v: T) => void) => (v: T) => { set(v); setDirty(true); };
  const future = Date.parse(session.starts_at) > Date.now();

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.column}>
        <SheetHeader title={clientName} sub={`${sessionWhen(session)} · ${KIND_LABEL[session.kind]} · ${session.mode === 'in_person' ? (room ? `${room.name}${room.location ? ` · ${room.location}` : ''}` : MODE_LABEL.in_person) : MODE_LABEL[session.mode]}${who && who.id !== me.id ? ` · ${who.name}` : ''}`}
          onClose={() => { if (dirty) Alert.alert('Kaydedilmedi', 'Kayıttaki değişiklikler kaybolsun mu?', [{ text: 'Vazgeç', style: 'cancel' }, { text: 'Kapat', style: 'destructive', onPress: onClose }]); else onClose(); }}
          right={<View style={{ alignSelf: 'center' }}><StatusChip status={status} /></View>} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 12 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
          <View style={[s.row, { flexWrap: 'wrap' }]}>
            {session.visible_to_family ? <Tag icon="eye-outline" text="Ailede görünür" /> : client ? <Tag icon="eye-off-outline" text="Aileye gösterilmiyor" /> : null}
            {session.series_id && <Tag icon="repeat-outline" text="Tekrarlayan" />}
            {session.booked_by === 'family' && <Tag icon="phone-portrait-outline" text="Aile aldı" />}
            {session.family_response && <Tag icon={session.family_response === 'ok' ? 'checkmark-circle-outline' : 'alert-circle-outline'}
              text={RESPONSE_LABEL[session.family_response]} warn={session.family_response === 'unavailable'} />}
          </View>
          {!!session.family_note && <View style={[s.card, { backgroundColor: '#FFF3D6', borderColor: '#F1DFAE' }]}><Text style={s.small}>Ailenin notu</Text><Text style={s.body}>{session.family_note}</Text></View>}
          {!!session.cancel_reason && isClosed(status) && <Text style={s.small}>Neden: {session.cancel_reason}</Text>}

          {client && <Segmented options={[{ id: 'prep', label: 'Hazırlık' }, { id: 'record', label: 'Kayıt' }]} value={view} onChange={setView} />}
          {!!loadErr && <Text style={[s.small, { color: colors.danger }]}>{loadErr}</Text>}

          {client && view === 'prep' && (
            !prep ? <ActivityIndicator color={colors.navy} style={{ marginTop: 20 }} /> : (
              <>
                <Text style={s.small}>{prep.sinceSession ? `Son seanstan bu yana (${prep.days} gün)` : `Son ${prep.days} gün (önceki seans kaydı yok)`} · aile verisi</Text>
                <View style={[s.row, { flexWrap: 'wrap', gap: 8 }]}>
                  <Tile num={prep.rate === null ? '–' : `%${prep.rate}`} text={`rutin tamamlandı${prep.prevRate !== null ? ` (önceki %${prep.prevRate})` : ''}`} />
                  <Tile num={String(prep.abc.length)} text="davranış kaydı" />
                  <Tile num={String(prep.declined)} text={'"Yapamam"'} />
                  <Tile num={String(prep.pending)} text="öneri ebeveyn kararı bekliyor" />
                </View>
                {prep.abc.slice(0, 3).map((e) => (
                  <View key={e.id} style={[s.card, { gap: 3 }]}>
                    <Text style={s.small}>{new Date(e.occurred_at).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' })} · şiddet {e.intensity}/5</Text>
                    <Text style={s.body}><Text style={{ fontWeight: '700' }}>Öncesi </Text>{e.antecedent}</Text>
                    <Text style={s.body}><Text style={{ fontWeight: '700' }}>Davranış </Text>{e.behavior}</Text>
                    <Text style={s.body}><Text style={{ fontWeight: '700' }}>Sonucu </Text>{e.consequence}</Text>
                  </View>
                ))}
                <AgendaBox agenda={agenda} setAgenda={touch(setAgenda)} own={own} setOwn={setOwn} />
                {hasNote(prevRecord ?? undefined) && (
                  <View style={[s.card, { backgroundColor: '#F6EFE3', borderColor: '#EADFC9' }]}>
                    <Private text="Son seans notu · yalnız sen" />
                    {!!prevRecord?.observation && <Text style={s.body}>{prevRecord.observation}</Text>}
                    {!!prevRecord?.next_step && <Text style={s.body}><Text style={{ fontWeight: '700' }}>Sonraki adım: </Text>{prevRecord.next_step}</Text>}
                  </View>
                )}
                <View style={[s.row, { flexWrap: 'wrap' }]}>
                  <SmallButton label="Seansa başla" onPress={() => setView('record')} />
                  <SmallButton label="Ev rutinlerini aç" onPress={() => onOpenClient(client, 'routine')} />
                  <SmallButton label="Davranış kayıtları" onPress={() => onOpenClient(client, 'abc')} />
                </View>
              </>
            )
          )}

          {(view === 'record' || !client) && (
            <>
              <FieldLabel>Durum</FieldLabel>
              <Chips options={[{ id: 'planned', label: 'Planlandı' }, { id: 'done', label: 'Yapıldı' }, { id: 'no_show', label: 'Gelmedi' },
                               { id: 'cancelled', label: 'İptal' }, { id: 'late_cancel', label: 'Geç iptal' }, { id: 'postponed', label: 'Ertelendi' }]}
                value={status} onChange={(v) => { if (v !== status) change(v as Exclude<typeof status, 'offered'>); }} />
              {status === 'late_cancel' && <Text style={[s.small, { color: STATUS_META.late_cancel.fg }]}>Geç iptal olarak kayıtlı{settings.count_late_cancel ? '; paketten düşer' : ''}.</Text>}
              {client && (
                <>
                  <FieldLabel>Katılanlar</FieldLabel>
                  <Chips multi options={ATTENDEES.map((a) => ({ id: a, label: a === 'Çocuk' ? client.child_name : a }))} value={attendees}
                    onChange={(a) => touch(setAttendees)(attendees.includes(a) ? attendees.filter((x) => x !== a) : [...attendees, a])} />
                  <View style={[s.row, { marginTop: 10 }]}><Text style={s.label}>Seans notu</Text><Private /></View>
                  <Note label="Gözlem" value={observation} onChange={touch(setObservation)} placeholder="Seansta ne gözlendi?" />
                  <Note label="Çalışılan" value={worked} onChange={touch(setWorked)} placeholder="Neler çalışıldı?" />
                  <Note label="Sonraki adım" value={nextStep} onChange={touch(setNextStep)} placeholder="Bir sonraki seansta ya da evde" />
                  <AgendaBox agenda={agenda} setAgenda={touch(setAgenda)} own={own} setOwn={setOwn} />

                  <View style={s.card}>
                    <Text style={s.label}>Aileye bu haftanın ev ödevi</Text>
                    {homework.length > 0 && homework.map((h) => (
                      <View key={`${h.kind}:${h.id}`} style={s.row}><Ionicons name="paper-plane-outline" size={14} color={colors.ok} /><Text style={s.body}>{h.title}</Text></View>
                    ))}
                    {hw === null ? <Text style={s.small}>Takip Planı okunuyor…</Text>
                      : hw.items && hw.items.length > 0 ? (
                        <>
                          <Text style={s.small}>Takip Planı'nda aileye gönderilmemiş {hw.items.length} madde var. Seçtiklerin tek bildirimle ParentApp › Uzmanım'a gider.</Text>
                          <SmallButton label={`Aileye gönder (${hw.items.length})`} onPress={() => setPub(true)} />
                        </>
                      ) : (
                        <Text style={s.small}>{homework.length ? 'Gönderildi.' : 'Gönderilmemiş madde yok. Takip Planı\'nda rutin, macera ya da program ekleyince burada seçebilirsin.'}</Text>
                      )}
                    <Pressable onPress={() => onOpenClient(client, 'goals')}><Text style={s.link}>Takip Planı'nı aç</Text></Pressable>
                  </View>
                  <Cta label="Kaydet" onPress={save} busy={saving} disabled={!dirty} />
                  {!dirty && <Text style={[s.small, { textAlign: 'center' }]}>{record ? 'Kayıt güncel.' : 'Not ya da gündem yazınca kaydedebilirsin.'}</Text>}
                </>
              )}
            </>
          )}

          <View style={[s.row, { flexWrap: 'wrap', marginTop: 8 }]}>
            {client && <SmallButton label="Sonraki seansı planla" onPress={() => onNext(session)} />}
            {(status === 'planned' || status === 'offered') && <SmallButton label="Düzelt" onPress={() => onEdit(session)} />}
            {isClosed(status) && future && client && <SmallButton label="Bekleme listesine teklif et" onPress={() => onOffer(session)} />}
            {client && <SmallButton label="Danışanı aç" onPress={() => onOpenClient(client, 'summary')} />}
            {!record && <SmallButton label="Sil" danger onPress={remove} />}
          </View>
        </ScrollView>
      </View>
      {client && hw?.items && (
        <PublishSheet items={pub ? hw.items : null} groups={hw.groups} onClose={() => setPub(false)}
          onSend={async (hold) => {
            await sendHomework(client.link_id, hold, false);
            const sent = (hw.items ?? []).filter((i) => !i.hold.every((id) => hold.includes(id)))
              .map((i): HomeworkItem => ({ kind: i.kind === 'module' ? 'module' : i.kind === 'goal' ? 'goal' : 'suggestion', id: i.key, title: i.title }));
            const next = [...homework.filter((h) => !sent.some((x) => x.id === h.id)), ...sent];
            setHomework(next);
            await saveRecord(session.id, { attendees, observation, worked, next_step: nextStep, agenda, homework: next });
            track('session.homework', { n: sent.length, held: hold.length });
            setPub(false);
            loadHomework(client, data?.tasks ?? [], today).then(setHw).catch(() => {});
            Alert.alert('Aileye gönderildi', 'Ebeveyn tek bildirim alır; seans kaydına da yazıldı.');
          }} />
      )}
    </SafeAreaView>
  );
}

function Tag({ icon, text, warn }: { icon: keyof typeof Ionicons.glyphMap; text: string; warn?: boolean }) {
  return (
    <View style={[s.row, { gap: 4, backgroundColor: warn ? '#FFF3D6' : '#ECEEF3', borderRadius: 99, paddingHorizontal: 9, paddingVertical: 3 }]}>
      <Ionicons name={icon} size={13} color={warn ? '#9A6B00' : colors.muted} />
      <Text style={{ fontSize: 12, fontWeight: '600', color: warn ? '#9A6B00' : '#5D6680' }}>{text}</Text>
    </View>
  );
}
function Tile({ num, text }: { num: string; text: string }) {
  return <View style={s.tile}><Text style={s.tileNum}>{num}</Text><Text style={s.small}>{text}</Text></View>;
}
function Note({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <View style={{ marginTop: 6 }}>
      <Text style={[s.small, { fontWeight: '700', marginBottom: 4 }]}>{label}</Text>
      <TextInput value={value} onChangeText={onChange} multiline maxLength={4000} placeholder={placeholder} placeholderTextColor={colors.muted}
        style={[s.input, { minHeight: 64, textAlignVertical: 'top', backgroundColor: '#FFFCF6', borderColor: '#EADFC9' }]} />
    </View>
  );
}
function AgendaBox({ agenda, setAgenda, own, setOwn }: { agenda: AgendaItem[]; setAgenda: (a: AgendaItem[]) => void; own: string; setOwn: (v: string) => void }) {
  return (
    <View style={s.card}>
      <View style={s.row}><Text style={[s.label, { flex: 1 }]}>Seans gündemi</Text><Private /></View>
      {agenda.length === 0 && <Text style={s.small}>Evden dikkat çeken bir şey yok. Kendi maddeni ekleyebilirsin.</Text>}
      {agenda.map((a, i) => (
        <Pressable key={i} onPress={() => setAgenda(agenda.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))} style={[s.row, { alignItems: 'flex-start' }]}
          accessibilityRole="checkbox" accessibilityState={{ checked: a.done }}>
          <Ionicons name={a.done ? 'checkbox' : 'square-outline'} size={20} color={colors.navy} />
          <View style={{ flex: 1 }}>
            <Text style={[s.body, a.done && { color: colors.muted, textDecorationLine: 'line-through' }]}>{a.text}</Text>
            {!!a.source && <Text style={s.small}>{a.source}</Text>}
          </View>
        </Pressable>
      ))}
      <View style={s.row}>
        <TextInput value={own} onChangeText={setOwn} placeholder="Madde ekle…" placeholderTextColor={colors.muted} style={[s.input, { flex: 1 }]} maxLength={160}
          onSubmitEditing={() => { if (own.trim()) { setAgenda([...agenda, { text: own.trim(), done: false }]); setOwn(''); } }} />
        <SmallButton label="Ekle" onPress={() => { if (own.trim()) { setAgenda([...agenda, { text: own.trim(), done: false }]); setOwn(''); } }} />
      </View>
    </View>
  );
}
