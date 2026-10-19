const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const SHORT = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

const asDate = (s: string) => (s.length === 10 ? new Date(+s.slice(0, 4), +s.slice(5, 7) - 1, +s.slice(8, 10)) : new Date(s));
export const dateTR = (s: string) => { const d = asDate(s); return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`; };
export const shortTR = (s: string) => { const d = asDate(s); return `${d.getDate()} ${SHORT[d.getMonth()]}`; };
export const timeTR = (s: string) => { const d = new Date(s); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
export const daysAgo = (s?: string) => {
  if (!s) return 'Kayıt yok';
  const d = asDate(s); const t = new Date(); t.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  const n = Math.round((t.getTime() - d.getTime()) / 864e5);
  return n <= 0 ? 'Bugün' : n === 1 ? 'Dün' : `${n} gün önce`;
};
export const pctText = (x: number | null) => (x === null ? '–' : `%${x}`);
