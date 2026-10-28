import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Switch, Alert, Platform, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { IconButton } from '../components/ui';
import { useNotifications } from '../lib/notificationsContext';
import { AppNotification, notificationChildren, pushEnabled, setPushEnabled } from '../lib/notifications';
import { track } from '../lib/track';

const ICON: Record<string, keyof typeof Ionicons.glyphMap> = {
  abc_event: 'pulse-outline', clinic_shared: 'person-add-outline', clinic_revoked: 'lock-closed-outline',
  suggestion_decided: 'checkmark-done-outline', team_joined: 'people-outline', client_assigned: 'person-outline', admin_message: 'megaphone-outline',
  invite_claimed: 'person-add-outline', invite_expired: 'time-outline', invite_declined: 'close-circle-outline', invite_child_updated: 'create-outline',
  verification_approved: 'shield-checkmark-outline', verification_rejected: 'alert-circle-outline', verification_suspended: 'shield-outline',
  kvkk_answered: 'document-text-outline',
};

// Danışan ekranında birden çok çocuklu bildirim (kardeşler) yalnız bu çocuğun adıyla gösterilir
function titleFor(n: AppNotification, childId?: string, childName?: string) {
  if (!childId || notificationChildren(n).length < 2) return n.title;
  if (n.kind === 'abc_event') return `Yeni davranış kaydı: ${childName || 'bu danışan'}`;
  if (n.kind === 'clinic_shared') return `Yeni paylaşım: ${childName || 'bu danışan'}`;
  return n.title;
}

// Bildirim nereye götürür (danışan sekmesi): ClientScreen'deki sekme kimlikleriyle aynı
export function notificationTab(kind: string): 'abc' | 'suggestions' | 'summary' {
  if (kind === 'abc_event') return 'abc';
  if (kind === 'suggestion_decided') return 'suggestions';
  return 'summary';
}

export const ago = (iso: string) => {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m} dk`;
  if (m < 1440) return `${Math.round(m / 60)} sa`;
  const d = Math.round(m / 1440);
  return d < 7 ? `${d} g` : new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
};

// Bildirim kutusu (ParentApp'in Bildirimler ekranıyla aynı düzen). Ana ekrandan açılınca bütün danışanlar;
// danışan ekranından açılınca yalnız o çocuğun bildirimleri (aynı ailenin diğer çocukları dahil edilmez).
export default function NotificationsSheet({ visible, onClose, onOpen, childId, childName }: {
  visible: boolean;
  onClose: () => void;
  onOpen: (n: AppNotification) => void;
  childId?: string;
  childName?: string;
}) {
  const { items, markRead, remove } = useNotifications();
  const [push, setPush] = useState(true);
  useEffect(() => { if (visible) track('screen.notifications', { scope: childId ? 'child' : 'all' }); }, [visible, childId]);
  useEffect(() => { pushEnabled().then(setPush); }, []);

  const list = childId ? items.filter((n) => notificationChildren(n).includes(childId)) : items;
  const listUnread = list.filter((n) => !n.readAt).map((n) => n.id);

  const togglePush = async (on: boolean) => {
    setPush(on);
    const r = await setPushEnabled(on);
    if (on && r === 'denied') {
      setPush(false);
      Alert.alert('İzin gerekli', 'Cihazın Ayarlar › ClinicApp › Bildirimler bölümünden izin ver, sonra tekrar aç.');
    }
  };

  const open = (n: AppNotification) => {
    if (!n.readAt) markRead([n.id]);
    track('notification.open', { kind: n.kind });
    onOpen(n);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
        <View style={styles.column}>
          <View style={styles.header}>
            <IconButton name="close" onPress={onClose} label="Kapat" />
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>Bildirimler</Text>
              {!!childId && <Text style={styles.cap}>{childName || 'Bu danışan'}</Text>}
            </View>
            <Pressable onPress={() => markRead(childId ? listUnread : undefined)} disabled={!listUnread.length} hitSlop={8}>
              <Text style={[styles.link, !listUnread.length && { color: colors.faint }]}>Tümü okundu</Text>
            </Pressable>
          </View>

          {Platform.OS !== 'web' && (
            <View style={styles.setting}>
              <Ionicons name="notifications-outline" size={20} color={colors.navy} />
              <View style={{ flex: 1 }}>
                <Text style={styles.h}>Cihaza bildirim gönder</Text>
                <Text style={styles.cap}>Kapalıyken bildirimler yalnız burada görünür.</Text>
              </View>
              <Switch value={push} onValueChange={togglePush} trackColor={{ true: colors.navy }} />
            </View>
          )}

          <FlatList
            data={list}
            keyExtractor={(n) => String(n.id)}
            contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {childId ? `${childName || 'Bu danışan'} için henüz bildirim yok.` : 'Henüz bildirim yok. Aile yeni bir çocuk paylaştığında, davranış kaydı girdiğinde ya da önerine karar verdiğinde burada görünür.'}
              </Text>
            }
            renderItem={({ item: n }) => (
              <Pressable onPress={() => open(n)} onLongPress={() => remove(n.id)} style={[styles.row, !n.readAt && styles.unread]}
                accessibilityHint="Dokununca ilgili sayfa açılır, uzun basınca silinir">
                <Ionicons name={ICON[n.kind] ?? 'notifications-outline'} size={20} color={colors.navy} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.h, !n.readAt && { fontWeight: '700' }]}>{titleFor(n, childId, childName)}</Text>
                  {!!n.body && <Text style={styles.cap}>{n.body}</Text>}
                </View>
                <Text style={styles.cap}>{ago(n.createdAt)}</Text>
                {!n.readAt && <View style={styles.dot} />}
                <Ionicons name="chevron-forward" size={16} color={colors.faint} />
              </Pressable>
            )}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  column: { flex: 1, width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10 },
  title: { fontSize: 17, fontWeight: '700', color: colors.navy },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  setting: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 16, padding: 14, borderRadius: radius.md, backgroundColor: '#fff' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: radius.md, backgroundColor: '#fff' },
  unread: { backgroundColor: '#EEF1F9' },
  h: { fontSize: 14, fontWeight: '600', color: colors.navy },
  cap: { fontSize: 12, color: colors.muted, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.gold },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 40, lineHeight: 20, paddingHorizontal: 20 },
});
