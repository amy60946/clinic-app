import type { PlannedNudge } from './nudgeCore';

// Web'de yerel bildirim planlanmaz (hatırlatmalar yalnız iPhone / iPad'de; nudgeDevice.ts). Arayüz de buna göre
// izin sormaz, Ayarlar'da hatırlatma anahtarını göstermez.
export type NudgePermission = 'granted' | 'denied' | 'undetermined';
export const nudgeDeviceOn = false;

export async function nudgePermission(): Promise<NudgePermission> { return 'denied'; }
export async function requestNudgePermission(): Promise<NudgePermission> { return 'denied'; }
export async function replaceNudges(_list: PlannedNudge[], _extra: Record<string, string> = {}): Promise<void> {}
