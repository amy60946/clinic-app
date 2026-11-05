import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert, TextInput, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../theme';
import { SmallButton, Toggle } from '../../components/ui';
import type { ClinicianMe, Member } from '../../lib/clinic';
import { track } from '../../lib/track';
import { WEEKDAY_LONG, hhmmToMin, type Availability, type Room, type SessionSettings } from '../../lib/sessionCore';
import {
  addAvailability, deleteAvailability, updateAvailability, saveRoom, saveSettings, calendarFeed, feedUrl, listSources, addSource, removeSource,
  syncSources, type Feed, type CalendarSource,
} from '../../lib/sessions';
import { SheetHeader, Chips, FieldLabel, TimeInput, s } from './parts';
import { DAY_SHORT } from '../../dates';

// Takvim ayarları (ortak akislar.md 20, 6): çalışma saatlerim ve aileye açık saatler (D), odalar ve kurallar (sahip, D),
// takvim aboneliği ve dış takvim (E).
export default function CalendarSettingsSheet(p: {
  open: boolean; me: ClinicianMe; team: Member[]; rooms: Room[]; availability: Availability[]; settings: SessionSettings;
  onClose: () => void; onChanged: () => void;
}) {
  return (
    <Modal visible={p.open} animationType="slide" presentationStyle="pageSheet" onRequestClose={p.onClose}>
      {p.open && <Body {...p} />}
    </Modal>
  );
}

const REMINDERS = [{ id: 1440, label: '1 gün önce' }, { id: 120, label: '2 saat önce' }, { id: 60, label: '1 saat önce' }, { id: 30, label: '30 dk önce' }];

function Body({ me, rooms, availability, settings, onClose, onChanged }: Parameters<typeof CalendarSettingsSheet>[0]) {
  const owner = me.role === 'owner';
  const mine = availability.filter((a) => a.clinician_id === me.id);
  const [wd, setWd] = useState(1);
  const [from, setFrom] = useState('09:00');
  const [to, setTo] = useState('17:00');
  const [bookable, setBookable] = useState(false);
  const [room, setRoom] = useState<string | null>(null);
  const [roomName, setRoomName] = useState('');
  const [roomLoc, setRoomLoc] = useState('');
  const [st, setSt] = useState<SessionSettings>(settings);
  const [feed, setFeed] = useState<Feed | undefined>(undefined);
  const [sources, setSources] = useState<CalendarSource[] | null>(null);
  const [srcUrl, setSrcUrl] = useState('');
  const [srcLabel, setSrcLabel] = useState('');
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    listSources().then(setSources).catch(() => setSources([]));
    // abonelik varsa göster (oluşturmadan): tablodan okunur; yoksa "Bağlantı oluştur"
    import('../../lib/supabase').then(({ supabase }) => supabase.from('clinic_calendar_feeds').select('token, show_initials').maybeSingle())
      .then((r) => setFeed((r.data as Feed) ?? null)).catch(() => setFeed(null));
  }, []);

  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    try { await fn(); onChanged(); if (ok) Alert.alert(ok); } catch (e) { Alert.alert('Kaydedilemedi', (e as Error).message); }
  };
  const addSlot = () => {
    if (hhmmToMin(to) <= hhmmToMin(from)) return Alert.alert('Saatleri kontrol et', 'Bitiş saati başlangıçtan sonra olmalı.');
    run(() => addAvailability(me.clinic_id, { clinician_id: me.id, weekday: wd, start_time: from, end_time: to, room_id: room, bookable }));
    track('calendar.availability', { bookable });
  };
  const saveSt = (patch: Partial<SessionSettings>) => {
    const next = { ...st, ...patch };
    setSt(next);
    run(() => saveSettings(patch));
  };
  const copy = async (text: string) => {
    try {
      if (Platform.OS === 'web') await navigator.clipboard.writeText(text);
      else { const { Share } = await import('react-native'); await Share.share({ message: text }); return; }
      Alert.alert('Kopyalandı', "Takvim uygulamanda \"Abone ol / URL'den ekle\" seçeneğine yapıştır.");
    } catch { Alert.alert('Bağlantı', text); }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
      <View style={s.column}>
        <SheetHeader title="Takvim ayarları" onClose={onClose} />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48, gap: 14 }} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>

          <View style={s.card}>
            <Text style={s.label}>Çalışma saatlerim</Text>
            <Text style={s.small}>Yeni seans penceresindeki uygun saatler bu saatlerden çıkar. “Aileye açık” saatlerden ebeveyn ParentApp'te randevu alabilir (klinik açtıysa).</Text>
            {mine.length === 0 && <Text style={s.small}>Henüz saat eklenmedi.</Text>}
            {mine.map((a) => (
              <View key={a.id} style={[s.row, { paddingVertical: 4 }]}>
                <Text style={[s.body, { width: 92 }]}>{WEEKDAY_LONG[a.weekday - 1]}</Text>
                <Text style={[s.body, { flex: 1 }]}>{a.start_time}–{a.end_time}{a.room_id ? ` · ${rooms.find((r) => r.id === a.room_id)?.name ?? ''}` : ''}</Text>
                <Pressable onPress={() => run(() => updateAvailability(a.id, { bookable: !a.bookable }))} accessibilityRole="switch" accessibilityState={{ checked: a.bookable }}
                  style={[s.row, { gap: 4 }]}>
                  <Ionicons name={a.bookable ? 'people' : 'people-outline'} size={16} color={a.bookable ? colors.ok : colors.muted} />
                  <Text style={{ fontSize: 12, color: a.bookable ? colors.ok : colors.muted, fontWeight: '600' }}>{a.bookable ? 'Aileye açık' : 'Yalnız ben'}</Text>
                </Pressable>
                <Pressable onPress={() => run(() => deleteAvailability(a.id))} hitSlop={8} accessibilityLabel="Sil"><Ionicons name="trash-outline" size={18} color={colors.muted} /></Pressable>
              </View>
            ))}
            <FieldLabel>Saat ekle</FieldLabel>
            <Chips options={DAY_SHORT.map((d, i) => ({ id: i + 1, label: d }))} value={wd} onChange={setWd} />
            <View style={[s.row, { marginTop: 8 }]}>
              <TimeInput value={from} onChange={setFrom} label="Başlangıç" />
              <Text style={s.body}>–</Text>
              <TimeInput value={to} onChange={setTo} label="Bitiş" />
            </View>
            {rooms.filter((r) => r.active).length > 0 && (
              <View style={{ marginTop: 8 }}><Chips options={[{ id: '', label: 'Oda yok' }, ...rooms.filter((r) => r.active).map((r) => ({ id: r.id, label: r.name }))]}
                value={room ?? ''} onChange={(v) => setRoom(v || null)} /></View>
            )}
            <View style={[s.row, { marginTop: 8 }]}>
              <Toggle value={bookable} onChange={setBookable} /><Text style={[s.body, { flex: 1 }]}>Aileye açık</Text>
              <SmallButton label="Ekle" onPress={addSlot} />
            </View>
          </View>

          {owner && (
            <View style={s.card}>
              <Text style={s.label}>Odalar ve şubeler</Text>
              <Text style={s.small}>Oda seçilen seanslarda çakışma uyarısı verilir; ailede "yer" olarak görünür.</Text>
              {rooms.map((r) => (
                <View key={r.id} style={[s.row, { paddingVertical: 3 }]}>
                  <Text style={[s.body, { flex: 1, color: r.active ? colors.text : colors.muted }]}>{r.name}{r.location ? ` · ${r.location}` : ''}</Text>
                  <SmallButton label={r.active ? 'Kullanımdan kaldır' : 'Geri al'} onPress={() => run(() => saveRoom(r.id, r.name, r.location ?? '', !r.active))} />
                </View>
              ))}
              <View style={[s.row, { flexWrap: 'wrap' }]}>
                <TextInput value={roomName} onChangeText={setRoomName} placeholder="Oda adı" placeholderTextColor={colors.muted} maxLength={60} style={[s.input, { flex: 1, minWidth: 120 }]} />
                <TextInput value={roomLoc} onChangeText={setRoomLoc} placeholder="Şube (isteğe bağlı)" placeholderTextColor={colors.muted} maxLength={80} style={[s.input, { flex: 1, minWidth: 140 }]} />
                <SmallButton label="Ekle" onPress={() => { if (!roomName.trim()) return; run(() => saveRoom(null, roomName.trim(), roomLoc.trim())); setRoomName(''); setRoomLoc(''); }} />
              </View>
            </View>
          )}

          <View style={s.card}>
            <Text style={s.label}>Kurallar{owner ? '' : ' (klinik sahibi değiştirir)'}</Text>
            <FieldLabel hint={'Bu süreden kısa kala iptal edilen seans “Geç iptal” yazılır. Uzman bunu kaldırabilir.'}>Geç iptal süresi</FieldLabel>
            <Disabled on={!owner}><Chips options={[0, 12, 24, 48].map((h) => ({ id: h, label: h ? `${h} saat` : 'Yok' }))} value={st.cancel_hours} onChange={(h) => saveSt({ cancel_hours: h })} /></Disabled>
            <FieldLabel>Paketten düşen</FieldLabel>
            <Disabled on={!owner}>
              <View style={s.row}><Toggle value={st.count_no_show} onChange={(v) => saveSt({ count_no_show: v })} /><Text style={s.body}>Gelmedi</Text></View>
              <View style={[s.row, { marginTop: 6 }]}><Toggle value={st.count_late_cancel} onChange={(v) => saveSt({ count_late_cancel: v })} /><Text style={s.body}>Geç iptal</Text></View>
            </Disabled>
            <FieldLabel hint="ParentApp, aileye görünür her seans için cihazda bildirim kurar">Aileye hatırlatma</FieldLabel>
            <Disabled on={!owner}>
              <Chips multi options={REMINDERS} value={st.reminders}
                onChange={(m) => saveSt({ reminders: st.reminders.includes(m) ? st.reminders.filter((x) => x !== m) : [...st.reminders, m].sort((a, b) => b - a) })} />
            </Disabled>
            <FieldLabel hint={'Ebeveyn, sorumlu uzmanın “Aileye açık” saatlerinden en çok 2 randevu alabilir.'}>Aile uygulamadan randevu alabilir</FieldLabel>
            <Disabled on={!owner}>
              <View style={s.row}><Toggle value={st.booking_enabled} onChange={(v) => saveSt({ booking_enabled: v })} /><Text style={s.body}>{st.booking_enabled ? 'Açık' : 'Kapalı'}</Text></View>
              {st.booking_enabled && (
                <View style={{ gap: 8, marginTop: 8 }}>
                  <Text style={s.small}>En az önceden</Text>
                  <Chips options={[2, 12, 24, 48].map((h) => ({ id: h, label: `${h} saat` }))} value={st.booking_notice_hours} onChange={(h) => saveSt({ booking_notice_hours: h })} />
                  <Text style={s.small}>Kaç gün ileriye</Text>
                  <Chips options={[7, 14, 21, 30].map((d) => ({ id: d, label: `${d} gün` }))} value={st.booking_horizon_days} onChange={(d) => saveSt({ booking_horizon_days: d })} />
                  <Text style={s.small}>Randevu süresi</Text>
                  <Chips options={[30, 45, 50, 60].map((d) => ({ id: d, label: `${d} dk` }))} value={st.slot_minutes} onChange={(d) => saveSt({ slot_minutes: d })} />
                </View>
              )}
            </Disabled>
          </View>

          <View style={s.card}>
            <Text style={s.label}>Kendi takvimime aktar</Text>
            <Text style={s.small}>Seansların Google, Apple ya da Outlook takviminde görünür (tek yönlü, 30 dakikada bir yenilenir). Çocuk adı gitmez; yalnız tür, saat ve yer.</Text>
            {feed === undefined ? <ActivityIndicator color={colors.navy} /> : feed ? (
              <>
                <Text selectable style={[s.small, { color: colors.text }]} numberOfLines={2}>{feedUrl(feed.token)}</Text>
                <View style={[s.row, { flexWrap: 'wrap' }]}>
                  <SmallButton label="Bağlantıyı kopyala" onPress={() => copy(feedUrl(feed.token))} />
                  <SmallButton label="Yenile" onPress={() => Alert.alert('Bağlantı yenilensin mi?', 'Eski bağlantı çalışmaz; takviminde yenisiyle yeniden abone ol.', [
                    { text: 'Vazgeç', style: 'cancel' }, { text: 'Yenile', onPress: () => calendarFeed('rotate').then(setFeed).catch((e) => Alert.alert('Olmadı', e.message)) }])} />
                  <SmallButton label="Kapat" danger onPress={() => calendarFeed('delete').then(() => setFeed(null)).catch((e) => Alert.alert('Olmadı', e.message))} />
                </View>
                <View style={s.row}><Toggle value={feed.show_initials} onChange={(v) => calendarFeed('set', v).then(setFeed).catch(() => {})} /><Text style={s.body}>Baş harfi göster (ör. "Bireysel seans · N.")</Text></View>
              </>
            ) : (
              <SmallButton label="Bağlantı oluştur" onPress={() => calendarFeed('get').then((f) => { setFeed(f); track('calendar.feed'); }).catch((e) => Alert.alert('Olmadı', e.message))} />
            )}
          </View>

          <View style={s.card}>
            <Text style={s.label}>Dış takvimimi göster</Text>
            <Text style={s.small}>Google Takvim › Ayarlar › takvim › "iCal biçiminde gizli adres"; Apple Takvim › paylaş › Herkese açık takvim; Outlook › Ayarlar › Takvimler › Takvim yayımla. Adres yalnız sende kalır; etkinlikler takvimde gri görünür, istersen seansa çevirirsin.</Text>
            {sources === null ? <ActivityIndicator color={colors.navy} /> : sources.map((x) => (
              <View key={x.id} style={[s.row, { paddingVertical: 3 }]}>
                <Ionicons name="calendar-outline" size={16} color={colors.navy} />
                <View style={{ flex: 1 }}>
                  <Text style={s.body}>{x.label || hostOf(x.url)}</Text>
                  <Text style={[s.small, x.last_error ? { color: colors.danger } : null]}>{x.last_error ? `Okunamadı (${x.last_error})` : x.last_synced_at ? `Son eşitleme ${new Date(x.last_synced_at).toLocaleString('tr-TR')}` : 'Henüz eşitlenmedi'}</Text>
                </View>
                <Pressable onPress={() => run(async () => { await removeSource(x.id); setSources((l) => (l ?? []).filter((y) => y.id !== x.id)); })} hitSlop={8} accessibilityLabel="Kaldır">
                  <Ionicons name="trash-outline" size={18} color={colors.muted} />
                </Pressable>
              </View>
            ))}
            <TextInput value={srcUrl} onChangeText={setSrcUrl} placeholder="https://calendar.google.com/calendar/ical/…/basic.ics" placeholderTextColor={colors.muted}
              autoCapitalize="none" autoCorrect={false} style={s.input} />
            <View style={s.row}>
              <TextInput value={srcLabel} onChangeText={setSrcLabel} placeholder="Ad (isteğe bağlı)" placeholderTextColor={colors.muted} maxLength={40} style={[s.input, { flex: 1 }]} />
              <SmallButton label="Ekle" onPress={() => run(async () => { await addSource(srcUrl.trim(), srcLabel.trim()); setSrcUrl(''); setSrcLabel(''); setSources(await listSources()); track('calendar.source'); })} />
            </View>
            {!!sources?.length && (
              <SmallButton label={syncing ? 'Eşitleniyor…' : 'Şimdi eşitle'} busy={syncing} onPress={async () => {
                setSyncing(true);
                const r = await syncSources();
                setSyncing(false);
                setSources(await listSources().catch(() => sources));
                onChanged();
                Alert.alert(r ? 'Eşitlendi' : 'Eşitlenemedi', r ? `${r.events} etkinlik okundu${r.failed ? `, ${r.failed} takvim okunamadı` : ''}.` : 'Dış takvim işlevi henüz yayında değil.');
              }} />
            )}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const hostOf = (u: string) => { try { return new URL(u).host; } catch { return 'Takvim'; } };
const Disabled = ({ on, children }: { on: boolean; children: React.ReactNode }) => (
  <View pointerEvents={on ? 'none' : 'auto'} style={on ? { opacity: 0.5 } : undefined}>{children}</View>
);
