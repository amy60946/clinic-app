// Hatırlatma planını etkileyen bir iş yapıldı (davet gönderildi / iptal edildi, eğitim kuruldu / Etkin yapıldı / silindi):
// plan yeniden hesaplansın. Dinleyen: nudges.ts `useNudges` (ana ekran). Ayrı dosya: invites.ts ve training.ts,
// kendilerini okuyan nudges.ts'i içe almadan haber verebilsin.
const listeners = new Set<() => void>();
export function nudgeSignal() { listeners.forEach((f) => { try { f(); } catch { /* dinleyici hatası yayını durdurmaz */ } }); }
export function onNudgeSignal(f: () => void) { listeners.add(f); return () => { listeners.delete(f); }; }
