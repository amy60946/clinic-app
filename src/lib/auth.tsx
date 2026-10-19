import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { me as loadMe, Me } from './api';

// Uzman oturumu. Kayıtta sunucu (handle_new_user) aile değil klinik açar ya da ekip koduyla kliniğe katar.

type SignUp = { email: string; password: string; name: string; title: string } & ({ clinicName: string } | { teamCode: string });

type Auth = {
  session: Session | null;
  me: Me | null;
  loading: boolean;
  notClinician: boolean; // ParentApp hesabıyla girildi
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (p: SignUp) => Promise<{ needsConfirmation: boolean }>;
  sendPasswordReset: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  reloadMe: () => Promise<void>;
};

const Ctx = createContext<Auth | null>(null);

export function authErrorText(e: unknown): string {
  const err = e as { code?: string; message?: string; status?: number };
  switch (err?.code) {
    case 'invalid_credentials': return 'E-posta ya da şifre hatalı.';
    case 'email_not_confirmed': return 'E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.';
    case 'user_already_exists':
    case 'email_exists': return 'Bu e-postayla zaten bir hesap var.';
    case 'weak_password': return 'Şifre çok zayıf. En az 8 karakter, harf ve rakam kullan.';
    case 'email_address_invalid':
    case 'validation_failed': return 'Geçerli bir e-posta adresi yaz.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.';
  }
  if (err?.status === 429) return 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.';
  if (err?.message?.toLowerCase().includes('network')) return 'İnternet bağlantını kontrol et.';
  // Sunucu tetikleyicisinin Türkçe hataları (ekip kodu, koltuk) olduğu gibi gösterilir
  const m = err?.message ?? '';
  if (m.includes('Ekip kodu')) return 'Ekip kodu geçersiz ya da süresi dolmuş.';
  if (m.includes('koltuğu dolu')) return 'Kliniğin uzman koltuğu dolu. Klinik sahibinden plan yükseltmesini iste.';
  return m || 'Bir şeyler ters gitti. Tekrar dene.';
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [me, setMe] = useState<Me | null>(null);
  const [loading, setLoading] = useState(true);
  const [notClinician, setNotClinician] = useState(false);

  const reloadMe = useCallback(async () => {
    try {
      const m = await loadMe();
      setMe(m);
      setNotClinician(!m);
    } catch {
      setMe(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      if (data.session) await reloadMe();
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) { setMe(null); setNotClinician(false); }
    });
    return () => data.subscription.unsubscribe();
  }, [reloadMe]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw error;
    setLoading(true);
    await reloadMe();
    setLoading(false);
  }, [reloadMe]);

  const signUp = useCallback(async (p: SignUp) => {
    const data: Record<string, string> = { account: 'clinician', name: p.name.trim(), title: p.title.trim() };
    if ('teamCode' in p) data.team_code = p.teamCode.trim().toUpperCase();
    else data.clinic_name = p.clinicName.trim();
    const { data: res, error } = await supabase.auth.signUp({ email: p.email.trim(), password: p.password, options: { data } });
    if (error) throw error;
    if (res.session) { setLoading(true); await reloadMe(); setLoading(false); }
    return { needsConfirmation: !res.session };
  }, [reloadMe]);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
    if (error) throw error;
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <Ctx.Provider value={{ session, me, loading, notClinician, signIn, signUp, sendPasswordReset, signOut, reloadMe }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider eksik');
  return v;
};
