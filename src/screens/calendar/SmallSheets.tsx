import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../../theme';
import { Cta, SmallButton } from '../../components/ui';
import type { Client } from '../../lib/clinic';
import { track } from '../../lib/track';
import { sessionWhen, matchClient, trDay, shortDay, trTime, type Session, type WaitItem, type ExternalEvent } from '../../lib/sessionCore';
import { offerSlot, markExternal } from '../../lib/sessions';
import { SheetHeader, Chips, FieldLabel, s } from './parts';

// Boşalan saati bekleme listesindeki bir aileye teklif et (D). Aile ParentApp'te "Kabul et" derse randevu olur.
export function OfferSheet({ slot, waitlist, clients, onClose, onDone }: {
  slot: Session | null; waitlist: WaitItem[]; clients: Client[]; onClose: () => void; onDone: () => void;
}) {
  const [pick, setPick] = useState<string | null>(null);
  const [hours, setHours] = useState(12);
  const [busy, setBusy] = useState(false);
  const rows = waitlist.filter((w) => w.status === 'waiting' && w.link_id !== slot?.link_id)
    .map((w) => ({ w, c: clients.find((c) => c.link_id === w.link_id) })).filter((x) => !!x.c);
  const send = async () => {
    if (!slot || !pick) return;
    setBusy(true);
    try {
      await offerSlot(pick, slot.starts_at, slot.duration_min, slot.room_id, hours);
      track('waitlist.offer', { hours });
      Alert.alert('Teklif gönderildi', 'Aile ParentApp\'te kabul ederse randevu takvimine düşer; sana bildirim gelir.');
      onDone();
    } catch (e) { Alert.alert('Gönderilemedi', (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal visible={!!slot} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {slot && (
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <View style={s.column}>
            <SheetHeader title="Boşalan saati teklif et" sub={sessionWhen(slot)} onClose={onClose} />
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
              {rows.length === 0 ? (
                <Text style={s.body}>Bekleme listesinde aile yok. Danışan › Seanslar › "Bekleme listesine al" ile ekleyebilirsin.</Text>
              ) : (
                <>
                  <FieldLabel hint="Bekleme sırasına göre (en eski en üstte)">Aile</FieldLabel>
                  {rows.map(({ w, c }) => (
                    <Pressable key={w.id} onPress={() => setPick(w.id)} style={[s.card, pick === w.id && { borderColor: colors.navy, borderWidth: 2 }]}
                      accessibilityRole="radio" accessibilityState={{ selected: pick === w.id }}>
                      <Text style={s.label}>{c!.child_name}{c!.label ? <Text style={s.small}>  ·  {c!.label}</Text> : null}</Text>
                      <Text style={s.small}>{w.note || 'Not yok'} · {shortDay(trDay(w.created_at))}'den beri</Text>
                    </Pressable>
                  ))}
                  <FieldLabel>Teklif ne kadar açık kalsın?</FieldLabel>
                  <Chips options={[3, 6, 12, 24].map((h) => ({ id: h, label: `${h} saat` }))} value={hours} onChange={setHours} />
                  <Cta label="Teklif gönder" onPress={send} busy={busy} disabled={!pick} style={{ marginTop: 14 }} />
                </>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      )}
    </Modal>
  );
}

// Dış takvim etkinliği → seans ya da yok say (E)
export function ExternalSheet({ event, clients, onClose, onDone }: { event: ExternalEvent | null; clients: Client[]; onClose: () => void; onDone: () => void }) {
  const guess = useMemo(() => (event ? matchClient(event.summary, clients) : null), [event, clients]);
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const chosen = link ?? guess?.link_id ?? null;
  const run = async (p: { link_id?: string | null; ignore?: boolean }) => {
    if (!event) return;
    setBusy(true);
    try { await markExternal(event.id, p); track('calendar.external', { ignore: !!p.ignore, client: !!p.link_id }); onDone(); }
    catch (e) { Alert.alert('Olmadı', (e as Error).message); } finally { setBusy(false); }
  };
  return (
    <Modal visible={!!event} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      {event && (
        <SafeAreaView style={s.safe} edges={['top', 'bottom']}>
          <View style={s.column}>
            <SheetHeader title={event.summary || 'Dış takvim etkinliği'} sub={`${shortDay(trDay(event.starts_at))} · ${trTime(event.starts_at)}–${trTime(event.ends_at)} · dış takvim`} onClose={onClose} />
            <ScrollView contentContainerStyle={{ padding: 16, gap: 10, paddingBottom: 40 }}>
              <Text style={s.body}>Bu etkinlik bir seanssa danışanı seç; seans olarak takvimine eklenir (aileye gösterilmez, sonra açabilirsin).</Text>
              {guess && <Text style={s.small}>Başlıkta "{guess.child_name}" geçiyor.</Text>}
              <Chips options={clients.map((c) => ({ id: c.link_id, label: c.child_name }))} value={chosen ?? ''} onChange={setLink} />
              <Cta label="Seansa çevir" onPress={() => run({ link_id: chosen })} busy={busy} disabled={!chosen} style={{ marginTop: 10 }} />
              <View style={[s.row, { flexWrap: 'wrap', marginTop: 6 }]}>
                <SmallButton label="Danışansız blok olarak ekle" onPress={() => run({ link_id: null })} />
                <SmallButton label="Yok say" onPress={() => run({ ignore: true })} />
              </View>
            </ScrollView>
          </View>
        </SafeAreaView>
      )}
    </Modal>
  );
}
