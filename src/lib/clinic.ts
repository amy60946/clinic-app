import { supabase } from './supabase';

// Sunucu sözleşmesi: ortak/sozlesme/veritabani.md bölüm 4 (klinik önerisi).
// Uzman yalnız ebeveynin rıza verdiği (clinic_links.status = 'active') çocuğu görür ve yalnız okur.

export type ClinicianMe = {
  id: string;
  name: string;
  title: string;
  role: 'owner' | 'member';
  clinic_id: string;
  clinic: string;
  plan: 'trial' | 'small' | 'business' | 'custom' | 'inactive';
  seat_limit: number;
  trial_ends_at: string;
  active: boolean;
};

export type Client = {
  link_id: string;
  child_id: string;
  child_name: string;
  label: string;
  consent_at: string;
};

export type Invite = { code: string; expires_at: string };

// Klinik SQL'i Supabase'e henüz uygulanmadıysa fonksiyon/tablo bulunamaz
export class ClinicNotInstalled extends Error {}

function check<T>(data: T, error: { code?: string; message: string } | null): T {
  if (error) {
    if (error.code === 'PGRST202' || error.code === 'PGRST205' || error.code === '42883' || error.code === '42P01') {
      throw new ClinicNotInstalled('Klinik veritabanı henüz kurulmadı');
    }
    throw new Error(error.message);
  }
  return data;
}

// null: oturum açık ama uzman hesabı değil (ör. ebeveyn hesabıyla girildi)
export async function clinicianMe(): Promise<ClinicianMe | null> {
  const { data, error } = await supabase.rpc('clinician_me');
  return check(data as ClinicianMe | null, error);
}

export async function listClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('clinic_links')
    .select('id, child_id, label, consent_at, children(name)')
    .eq('status', 'active')
    .order('consent_at', { ascending: false });
  const rows = check(data ?? [], error) as unknown as {
    id: string; child_id: string; label: string; consent_at: string; children: { name: string } | null;
  }[];
  return rows.map((r) => ({
    link_id: r.id,
    child_id: r.child_id,
    child_name: r.children?.name ?? '',
    label: r.label,
    consent_at: r.consent_at,
  }));
}

// Aileye verilecek paylaşım kodu (ebeveyn ParentApp › Aile › Hesap › Uzmanım'da girer). 7 gün, tek kullanım.
export async function createFamilyInvite(label: string): Promise<Invite> {
  const { data, error } = await supabase.rpc('clinic_create_invite', { p_kind: 'family', p_label: label.trim() });
  return check(data as Invite, error);
}
