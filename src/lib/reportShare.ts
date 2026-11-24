// Raporu aileye gönder (ortak akislar.md 27.2 adım 1 ve 5, veritabani.md 40.2; sunucu migrations/20261123100000_mercek_updates.sql,
// uygulandı 23 Kasım 2026). İçerik report.ts reportContent'ten (biçim v1); gönderilen rapor düzeltilemez ve geri çekilemez.
// Sunucuda işlevler yoksa (eski sunucu) loadSentReports null döner: ekran "Aileye gönder"i ve listeyi göstermez.
import { supabase } from './supabase';
import { errorText } from './errors';
import type { ReportContent } from './report';

export type SentReport = {
  id: string;
  title: string;
  period_start: string | null;
  period_end: string | null;
  clinician_name: string;
  mine: boolean;
  created_at: string;
  seen_at: string | null;   // ailenin ilk açışı (paylaşım bittikten sonraki açılış gösterilmez)
};

type Err = { code?: string; message?: string; hint?: string } | null;
const missing = (e: Err) => e?.code === 'PGRST202' || e?.code === '42883';

// Sunucu hata anahtarları (hint) → kısa Türkçe
const ERRORS: Record<string, string> = {
  too_many_reports: 'Bu aileye son 24 saatte en çok 20 rapor gönderilebilir. Biraz sonra yeniden dene.',
  content_invalid: 'Rapor biçimi sunucuya uymadı, gönderilmedi. Uygulamayı güncelleyip yeniden dene.',
  content_too_large: 'Rapor çok büyük (en çok 256 KB), gönderilmedi. Daha kısa bir dönem seçip yeniden dene.',
  link_not_visible: 'Bu aileyle paylaşım açık değil; rapor gönderilemez.',
  no_access: 'Üyeliğin etkin değil; rapor gönderilemez.',
  title_invalid: 'Rapor başlığı 1–120 karakter olmalı.',
  period_invalid: 'Rapor dönemi geçersiz.',
};
export function shareErrorText(e: Err): string {
  const key = e?.hint && ERRORS[e.hint] ? e.hint : Object.keys(ERRORS).find((k) => e?.message?.includes(k));
  return key ? ERRORS[key] : errorText(e);
}

export async function loadSentReports(linkId: string): Promise<SentReport[] | null> {
  const { data, error } = await supabase.rpc('clinic_reports_sent', { p_link: linkId });
  if (missing(error)) return null;
  if (error) throw new Error(shareErrorText(error));
  return Array.isArray(data) ? (data as SentReport[]) : [];
}

export async function shareReport(linkId: string, title: string, period: { start: string; end: string }, content: ReportContent): Promise<string> {
  const { data, error } = await supabase.rpc('clinic_report_share', {
    p_link: linkId, p_title: title, p_period_start: period.start, p_period_end: period.end, p_content: content,
  });
  if (missing(error)) throw new Error('Bu özellik için veritabanı güncellemesi bekleniyor.');
  if (error) throw new Error(shareErrorText(error));
  return data as string;
}
