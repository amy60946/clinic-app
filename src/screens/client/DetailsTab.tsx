import React, { useState } from 'react';
import { View, Text, Alert, StyleSheet } from 'react-native';
import { colors } from '../../theme';
import { Card, Label, Input, SmallButton } from '../../components/ui';
import { Member, updateLinkLabel } from '../../lib/clinic';
import { ageGroupLabel } from '../../lib/invites';
import { track } from '../../lib/track';
import type { ClientCtx } from './ClientScreen';
import { ageText } from './ClientScreen';

const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

// Danışan bilgileri: çocuk, ebeveynler, paylaşım, klinisyenler. Ailenin e-posta ve telefonu uzmana açılmaz (yalnız ad);
// uzman kendi etiketini (dosya no vb.) burada değiştirir. Ekip erişimi ve paylaşımı sonlandırma buradan.
export default function DetailsTab({ client, me, data, team, onTeamAccess, onRevoke, onLabelChanged }: ClientCtx & {
  team: Member[]; onTeamAccess?: () => void; onRevoke?: () => void; onLabelChanged?: (label: string) => void;
}) {
  const [label, setLabel] = useState(client.label);
  const [busy, setBusy] = useState(false);
  const child = data.child!;
  const sample = !!data.sample;
  const nameOf = (id: string) => team.find((m) => m.id === id)?.name || 'Ekip üyesi';
  const responsible = client.clinician_id ? (client.clinician_id === me.id ? `${me.name} (sen)` : client.clinician_name || nameOf(client.clinician_id)) : '';
  const others = (client.assigned ?? []).filter((id) => id !== client.clinician_id).map((id) => (id === me.id ? `${me.name} (sen)` : nameOf(id)));

  const saveLabel = async () => {
    setBusy(true);
    try {
      await updateLinkLabel(client.link_id, label);
      track('client.label');
      onLabelChanged?.(label.trim());
      Alert.alert('Kaydedildi');
    } catch (e) {
      Alert.alert('Kaydedilemedi', (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View>
      <Label>Danışan</Label>
      <Card style={{ gap: 8 }}>
        <Row k="Adı" v={child.name || client.child_name || 'Adsız'} />
        {!!ageText(child.birthday) && <Row k="Yaşı" v={ageText(child.birthday)} />}
        {!!ageGroupLabel(child.age_band) && <Row k="Yaş grubu" v={ageGroupLabel(child.age_band)} />}
      </Card>

      <Label>Klinikteki etiketin (aile görmez)</Label>
      {sample ? <Card><Text style={styles.body}>{client.label || '–'}</Text></Card> : (
        <>
          <Input value={label} onChangeText={setLabel} placeholder="Ör. dosya no, görüşme günü" maxLength={60} />
          <View style={{ alignItems: 'flex-start', marginTop: 10 }}>
            <SmallButton label="Etiketi kaydet" onPress={saveLabel} busy={busy} />
          </View>
        </>
      )}

      <Label>Ebeveyn ve bakım verenler</Label>
      <Card style={{ gap: 6 }}>
        <Text style={styles.body}>{client.parents || 'Ad paylaşılmadı'}</Text>
        <Text style={styles.small}>İletişim bilgileri (e-posta, telefon) ailede kalır, uzmana açılmaz. Aileye ParentApp'teki önerilerin ve takip planı ile ulaşırsın.</Text>
      </Card>

      <Label>Paylaşım</Label>
      <Card style={{ gap: 8 }}>
        <Row k="Ebeveyn onayı" v={dateText(client.consent_at)} />
        <Text style={styles.small}>Ebeveyn paylaşımı ParentApp'ten istediği an durdurabilir; o an erişimin biter.</Text>
      </Card>

      {(team.length > 1 || !!responsible) && (
        <>
          <Label>Klinisyenler</Label>
          <Card style={{ gap: 8 }}>
            {!!responsible && <Row k="Sorumlu" v={responsible} />}
            {others.length > 0 && <Row k="Erişen" v={others.join(', ')} />}
            {!!onTeamAccess && (
              <View style={{ alignItems: 'flex-start' }}>
                <SmallButton label="Ekip erişimini yönet" onPress={onTeamAccess} />
              </View>
            )}
          </Card>
        </>
      )}

      {!!onRevoke && (
        <View style={{ marginTop: 28, alignItems: 'flex-start' }}>
          <SmallButton label="Paylaşımı sonlandır" danger onPress={onRevoke} />
        </View>
      )}
    </View>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: 12 }}>
      <Text style={[styles.small, { width: 110 }]}>{k}</Text>
      <Text style={[styles.body, { flex: 1 }]}>{v}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 17 },
});
