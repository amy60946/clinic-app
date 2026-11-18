import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { NUDGE_PREFIX, type PlannedNudge } from './nudgeCore';

// Hatırlatmaların cihaz tarafı (iPhone / iPad): izin ve YEREL bildirim planlama (expo-notifications; sunucu yok).
// Web: nudgeDevice.web.ts (hiçbir şey planlanmaz). Hesap: nudgeCore.ts, eşitleme: nudges.ts.
export type NudgePermission = 'granted' | 'denied' | 'undetermined';
export const nudgeDeviceOn = Platform.OS === 'ios';

const toPermission = (s: string): NudgePermission => (s === 'granted' ? 'granted' : s === 'undetermined' ? 'undetermined' : 'denied');

export async function nudgePermission(): Promise<NudgePermission> {
  try { return toPermission((await Notifications.getPermissionsAsync()).status); } catch { return 'denied'; }
}
// iOS'un izin penceresi (yalnız daha önce sorulmadıysa çıkar)
export async function requestNudgePermission(): Promise<NudgePermission> {
  try { return toPermission((await Notifications.requestPermissionsAsync()).status); } catch { return 'denied'; }
}

// Planı cihaza yazar: önce "nudge." ile başlayan bütün planlı bildirimler silinir, sonra yeni plan kurulur.
// `extra` bildirime dokununca gelen veridir (hangi ekran açılacak); metne girmez. Deneme bitişi olağan bildirim,
// ötekiler sessiz (iOS "passive": ekranı uyandırmaz, ses yok).
export async function replaceNudges(list: PlannedNudge[], extra: Record<string, string> = {}): Promise<void> {
  const old = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(old.filter((n) => n.identifier.startsWith(NUDGE_PREFIX))
    .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {})));
  for (const n of list) {
    const account = n.type === 'trial_ending';
    await Notifications.scheduleNotificationAsync({
      identifier: n.id,
      content: {
        title: n.title, body: n.body, sound: account,
        data: { ...extra, kind: 'nudge', nudge: n.type, id: n.id, ref: n.ref },
        interruptionLevel: account ? 'active' : 'passive',
      },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: new Date(n.fireAt) },
    });
  }
}
