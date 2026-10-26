import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Alert, StyleSheet } from 'react-native';
import { colors, radius } from '../../theme';
import { Card, Label, Cta, SmallButton, InfoText } from '../../components/ui';
import { ClinicianMe, Member } from '../../lib/clinic';
import { FamilyInvite, InviteStats, STATUS_TEXT, INVITE_HELP, listInvites, inviteStats, revokeInvite, sweepInvites, leftText, ageGroupLabel } from '../../lib/invites';
import { useNotifications } from '../../lib/notificationsContext';
import InviteSheet, { SheetInvite } from './InviteSheet';

// Ana ekran: "Aileyi davet et" (e-postayla) + davetlerim (durum, e-posta durumu, yeniden gönder, iptal) + sahip için ekip istatistiği (ortak akislar.md 10).
const TONE: Record<string, { bg: string; fg: string }> = {
  sent: { bg: '#EEF0F5', fg: colors.navy },
  opened: { bg: '#E6EAF5', fg: '#2C4A9A' },
  claimed: { bg: '#FFF3D6', fg: '#7A5600' },
  shared: { bg: '#E6F4EA', fg: colors.ok },
  expired: { bg: '#F3F4F6', fg: '#6B7286' },
  revoked: { bg: '#F3F4F6', fg: '#6B7286' },
  declined: { bg: '#FDECEC', fg: '#A23B3B' },
};

export default function InvitesCard({ me, team, reloadKey, onChanged }: {
  me: ClinicianMe; team: Member[]; reloadKey?: number; onChanged: () => void;
}) {
  const [items, setItems] = useState<FamilyInvite[] | null | undefined>(undefined);
  const [stats, setStats] = useState<InviteStats[]>([]);
  const [sheet, setSheet] = useState<{ open: boolean; existing?: SheetInvite | null }>({ open: false });
  const [all, setAll] = useState(false);
  const owner = me.role === 'owner';

  const load = useCallback(async () => {
    await sweepInvites().catch(() => {});
    const list = await listInvites(90).catch(() => null);
    setItems(list);
    if (list) setStats(await inviteStats(30));
  }, []);
  useEffect(() => { load(); }, [load, reloadKey]);
  // davet bildirimi gelince (aile kabul etti / reddetti / süre doldu) liste yenilenir; kalan süre dakikada bir güncellenir
  const { items: notes } = useNotifications();
  const lastInviteNote = notes.find((n) => n.kind.startsWith('invite_'))?.id;
  const seenNote = useRef(lastInviteNote);
  useEffect(() => {
    if (lastInviteNote === seenNote.current) return;   // açılışta değil, yeni bildirimde
    seenNote.current = lastInviteNote;
    load();
  }, [lastInviteNote, load]);
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 60_000); return () => clearInterval(t); }, []);

  const revoke = (i: FamilyInvite) => Alert.alert('Davet iptal edilsin mi?', 'Bağlantı ve kod çalışmaz; davete eklediğin taslak plan silinir.', [
    { text: 'Vazgeç', style: 'cancel' },
    { text: 'İptal et', style: 'destructive', onPress: () => revokeInvite(i.code).then(load).catch((e) => Alert.alert('İptal edilemedi', (e as Error).message)) },
  ]);

  const shown = items ? (all ? items : items.slice(0, 4)) : [];
  const mine = stats.find((s) => s.clinician_id === me.id);
  return (
    <>
      <Label>Aileyi davet et</Label>
      <Card style={{ gap: 12 }}>
        <InfoText text="Aileye e-postayla davet gönder; ebeveyn onaylayınca çocuk danışan listene eklenir." detail={INVITE_HELP} />
        <Cta label="Aileyi davet et" onPress={() => setSheet({ open: true, existing: null })} />
        {mine && mine.sent > 0 && (
          <Text style={styles.small}>Son 30 gün: {mine.sent} davet · {mine.claimed} kayıt · {mine.shared} paylaşım{mine.expired ? ` · ${mine.expired} kullanılmadı` : ''}</Text>
        )}
      </Card>

      {!!items && items.length > 0 && (
        <>
          <Label>{`Davetlerim (${items.length})`}</Label>
          <View style={{ gap: 8 }}>
            {shown.map((i) => {
              const open = ['sent', 'opened', 'claimed'].includes(i.status);
              const tone = TONE[i.status] ?? TONE.sent;
              const child = [i.child_name, ageGroupLabel(i.child_age_group)].filter(Boolean).join(', ');
              const who = [i.parent_name || i.parent_email, child, i.label].filter(Boolean).join(' · ') || 'İsimsiz davet';
              const sheet = { code: i.code, token: i.token, expires_at: i.expires_at, parent_name: i.parent_name, parent_email: i.parent_email,
                label: i.label, child_name: i.child_name, child_age_group: i.child_age_group, email_status: i.email_status };
              return (
                <Card key={i.code} style={{ gap: 6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={[styles.title, { flex: 1 }]} numberOfLines={1}>{who}</Text>
                    <View style={[styles.chip, { backgroundColor: tone.bg }]}><Text style={[styles.chipText, { color: tone.fg }]}>{STATUS_TEXT[i.status]}</Text></View>
                  </View>
                  <Text style={styles.small}>
                    {i.code}
                    {i.status === 'sent' || i.status === 'opened' ? ` · ${leftText(i.expires_at)}` : ''}
                    {owner && i.clinician_id !== me.id ? ` · ${i.clinician}` : ''}
                    {i.email_status === 'sent' ? ' · e-posta gönderildi' : i.email_status === 'failed' ? ' · e-posta gönderilemedi' : i.channel ? ` · ${CH[i.channel] ?? i.channel}` : ''}
                    {i.has_plan ? ' · plan hazır' : ''}
                  </Text>
                  {open && (
                    <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
                      {i.status !== 'claimed' && (
                        <SmallButton label="Yeniden gönder / plan" onPress={() => setSheet({ open: true, existing: sheet })} />
                      )}
                      {i.status === 'claimed' && (
                        <SmallButton label="Plan" onPress={() => setSheet({ open: true, existing: sheet })} />
                      )}
                      <SmallButton label="İptal" danger onPress={() => revoke(i)} />
                    </View>
                  )}
                  {i.status === 'claimed' && <Text style={styles.small}>Ebeveyn kayıt oldu; çocuğunu paylaşınca danışan listende görünür.</Text>}
                </Card>
              );
            })}
          </View>
          {items.length > 4 && (
            <Pressable onPress={() => setAll((v) => !v)} hitSlop={8} style={{ marginTop: 8, alignSelf: 'flex-start' }}>
              <Text style={styles.link}>{all ? 'Daha az göster' : `Tümünü göster (${items.length})`}</Text>
            </Pressable>
          )}
        </>
      )}

      {owner && team.length > 1 && stats.length > 0 && (
        <>
          <Label>Ekibin davetleri (son 30 gün)</Label>
          <Card style={{ gap: 8 }}>
            {stats.map((s) => (
              <View key={s.clinician_id} style={styles.statRow}>
                <Text style={[styles.body, { flex: 1 }]} numberOfLines={1}>{s.clinician || 'Adsız'}</Text>
                <Text style={styles.small}>{s.sent} davet · {s.claimed} kayıt · {s.shared} paylaşım · {s.expired} kullanılmadı</Text>
              </View>
            ))}
          </Card>
        </>
      )}

      <InviteSheet visible={sheet.open} existing={sheet.existing} clinicId={me.clinic_id} clinicianName={[me.name, me.title].filter(Boolean).join(', ')}
        onClose={() => { setSheet({ open: false }); load(); onChanged(); }} />
    </>
  );
}

const CH: Record<string, string> = { whatsapp: 'WhatsApp', email: 'e-posta', sms: 'SMS', copy: 'kopyalandı', other: 'paylaşıldı' };

const styles = StyleSheet.create({
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  title: { fontSize: 15, fontWeight: '700', color: colors.text },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  chip: { borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 },
  chipText: { fontSize: 12, fontWeight: '700' },
  statRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
