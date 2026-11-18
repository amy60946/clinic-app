// Önizleme (web) için deneme cihazı: src/lib/nudgeDevice.web.ts'in yerine kopyalanır (preview/build.sh). Gerçek bildirim
// planlanmaz; `lifecycle_nudges` bayrağını denemek için iPhone'u TAKLİT eder: izin sorulmamış başlar (davet gönderince
// açıklama çıkar), "Bildirimleri aç" izni verilmiş sayar, hesaplanan plan tarayıcı deposuna yazılır.
//   demo.nudge_permission: 'granted' | 'denied' (yoksa sorulmamış) · demo.nudges: planlı hatırlatmalar (JSON)
// Konsoldan: onizlemeHatirlatmalar() planı tablo olarak gösterir · onizlemeHatirlatmalar('sifirla') izni ve planı siler
import type { PlannedNudge } from './nudgeCore';

export type NudgePermission = 'granted' | 'denied' | 'undetermined';
export const nudgeDeviceOn = true;

const PERM = 'demo.nudge_permission';
const PLAN = 'demo.nudges';
const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string | null) => { try { if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); } catch { /* yok say */ } };

export async function nudgePermission(): Promise<NudgePermission> {
  const v = get(PERM);
  return v === 'granted' || v === 'denied' ? v : 'undetermined';
}
export async function requestNudgePermission(): Promise<NudgePermission> {
  if ((await nudgePermission()) === 'undetermined') set(PERM, 'granted');
  return nudgePermission();
}
export async function replaceNudges(list: PlannedNudge[], extra: Record<string, string> = {}): Promise<void> {
  set(PLAN, JSON.stringify(list.map((n) => ({ ...n, data: { ...extra, kind: 'nudge', nudge: n.type, id: n.id, ref: n.ref } }))));
}

(globalThis as any).onizlemeHatirlatmalar = (cmd?: string) => {
  if (cmd === 'sifirla') { set(PERM, null); set(PLAN, null); Object.keys(localStorage).filter((k) => k.startsWith('clinic.nudge.')).forEach((k) => set(k, null)); location.reload(); return; }
  const list = JSON.parse(get(PLAN) || '[]');
  console.table(list.map((n: PlannedNudge) => ({ ne: n.type, 'ne zaman': new Date(n.fireAt).toLocaleString('tr-TR'), metin: n.body })));
  return list;
};
