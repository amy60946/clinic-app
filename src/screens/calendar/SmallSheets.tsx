import React, { useMemo, useState } from 'react';
import { View, Text, ScrollView, Modal, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Cta, SmallButton } from '../../components/ui';
import type { Client } from '../../lib/clinic';
import { track } from '../../lib/track';
import { matchClient, trDay, shortDay, trTime, type ExternalEvent } from '../../lib/sessionCore';
import { markExternal } from '../../lib/sessions';
import { SheetHeader, Chips, s } from './parts';
import { errorText } from '../../lib/errors';

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
    catch (e) { Alert.alert('Olmadı', errorText(e)); } finally { setBusy(false); }
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
