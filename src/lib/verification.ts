import { supabase } from './supabase';
import data from '../data/professions.json';

// Uzman belge incelemesi (ortak/sozlesme/akislar.md 14, proposed/20261026050000_clinician_verification.sql):
// meslek seç → e-Devlet mezun belgesini (PDF) yükle → ön kontrol (Edge Function clinician-verify) → yönetici inceler.
// Onayda ailelere "Belgesi incelendi: <meslek>" rozeti görünür.
export type Profession = { key: string; label: string; programs: string[]; degree: string | null; bacb?: boolean; manual?: string };
export const PROFESSIONS = data.professions as Profession[];
export const REASONS = data.reasons as Record<string, string>;
export const professionLabel = (k?: string | null) => PROFESSIONS.find((p) => p.key === k)?.label ?? '';

export type VerificationStatus = 'pending' | 'auto_rejected' | 'approved' | 'rejected' | 'withdrawn' | 'suspended';
export type VerificationState = {
  verified_profession: string | null; verified_label: string | null; verified_at: string | null;
  last: null | {
    id: string; profession: string; status: VerificationStatus; reason: string | null; note: string | null;
    submitted: boolean; checked: boolean; created_at: string; decided_at: string | null;
  };
};
export type Check = 'ok' | 'warn' | 'fail' | 'manual';
export type CheckResult = { status: string; checks?: Record<string, Check> };

const missing = (e: { code?: string } | null) => e?.code === 'PGRST202' || e?.code === '42883';

// null: sunucu henüz kurulmadı (öneri uygulanmadı)
export async function loadVerification(): Promise<VerificationState | null> {
  const { data: d, error } = await supabase.rpc('clinician_verification_me');
  if (missing(error)) return null;
  if (error) throw new Error(error.message);
  return d as VerificationState;
}

export async function submitDocument(profession: string, bacb: string, pdf: { body: ArrayBuffer } | null): Promise<CheckResult | null> {
  const s = await supabase.rpc('clinician_verification_start', { p_profession: profession, p_bacb_number: bacb.trim() || null });
  if (s.error) throw new Error(s.error.message);
  const { id, upload_path } = s.data as { id: string; upload_path: string };
  if (pdf) {
    const up = await supabase.storage.from('verify').upload(upload_path, pdf.body, { contentType: 'application/pdf', upsert: false });
    if (up.error) throw new Error(up.error.message);
  }
  const sub = await supabase.rpc('clinician_verification_submit', { p_id: id });
  if (sub.error) throw new Error(sub.error.message);
  // Ön kontrol: işlev yayında değilse sessizce atlanır, yönetici yine inceler
  try {
    const r = await supabase.functions.invoke('clinician-verify', { body: { id } });
    if (r.error) return null;
    return r.data as CheckResult;
  } catch {
    return null;
  }
}

// Ön kontrolün uzmana gösterilen uyarıları (karar değildir)
export function checkWarnings(checks?: Record<string, Check>): string[] {
  if (!checks) return [];
  const w: string[] = [];
  if (checks.name === 'fail') w.push('Belgedeki ad hesabındaki adla eşleşmiyor görünüyor. Hesap adın belgedekiyle aynı mı?');
  else if (checks.name === 'warn') w.push('Belgedeki ad hesabındaki adla tam eşleşmiyor (ör. ikinci ad). İnceleme sırasında bakılacak.');
  if (checks.program === 'fail') w.push('Belgedeki bölüm seçtiğin meslekle uyuşmuyor görünüyor.');
  if (checks.degree === 'fail') w.push('Seçtiğin meslek için gereken derece belgede görünmüyor.');
  if (checks.barcode === 'warn' || checks.edevlet === 'warn') w.push('Belgede e-Devlet barkodu bulunamadı. e-Devlet\'ten indirdiğin PDF\'i değiştirmeden yükle.');
  return w;
}

export const MAX_PDF = 10 * 1024 * 1024;
