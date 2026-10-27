import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Linking from 'expo-linking';
import type { Session, EmailOtpType } from '@supabase/supabase-js';
import { supabase } from './supabase';

// E-postadaki bağlantılar uygulamayı bu adresle açar:
// web'de sitenin adresi, derlenmiş uygulamada clinicapp://auth
export const authRedirectUrl = () => Linking.createURL('auth');

// Uzman kaydı: sunucudaki handle_new_user bu meta veriyle aile yerine klinik açar
// (team_code varsa ekibe katılır). Ayrıntı: ortak/sozlesme/akislar.md bölüm 5.
export type ClinicianSignUp = {
  email: string;
  password: string;
  name: string;
  title: string;
  clinicName: string;
  teamCode: string;
  practice?: 'solo' | 'clinic';   // yalnız arayüz için (bireyselde ekip bölümü yok); sunucu ikisinde de klinik açar
  // Kayıtta onaylanan yasal metin sürümleri ({anahtar: sürüm}); oturum e-posta doğrulamasından sonra açıldığı için
  // ilk girişte legal_accept ile kaydedilir (lib/legal.ts legalPending; ortak akislar.md 17)
  legal?: Record<string, string>;
};

type Auth = {
  session: Session | null;
  loading: boolean;
  recovery: boolean; // şifre yenileme bağlantısıyla gelindi: yeni şifre ekranı gösterilir
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (p: ClinicianSignUp) => Promise<{ needsConfirmation: boolean }>;
  resendConfirmation: (email: string) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  signOut: () => Promise<void>;
  // Uzman hesabı olmayan oturum (ör. ParentApp hesabı): kapatılır, kayıt ekranı açılır
  noAccount: boolean;
  rejectAccount: () => Promise<void>;
  clearNoAccount: () => void;
};

const Ctx = createContext<Auth | null>(null);

// Supabase hata kodlarını sade Türkçe mesajlara çevir
export function authErrorText(e: unknown): string {
  const err = e as { code?: string; message?: string; status?: number };
  switch (err?.code) {
    case 'invalid_credentials': return 'E-posta ya da şifre hatalı.';
    case 'email_not_confirmed': return 'E-posta adresin henüz doğrulanmadı. Gelen kutunu kontrol et.';
    case 'user_already_exists':
    case 'email_exists': return 'Bu e-posta kullanımda. Başka bir e-posta yaz ya da giriş yap.';
    case 'weak_password': return 'Şifre çok zayıf. En az 8 karakter, harf ve rakam kullan.';
    case 'same_password': return 'Yeni şifre eskisinden farklı olmalı.';
    case 'email_address_invalid':
    case 'validation_failed': return 'Geçerli bir e-posta adresi yaz.';
    case 'over_email_send_rate_limit':
    case 'over_request_rate_limit': return 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.';
    case 'otp_expired': return 'Bağlantının süresi dolmuş. Yeniden iste.';
  }
  if (err?.status === 429) return 'Çok fazla deneme yapıldı. Biraz sonra tekrar dene.';
  if (err?.message?.toLowerCase().includes('network')) return 'İnternet bağlantını kontrol et.';
  // Kayıt tetikleyicisinin Türkçe hataları (ekip kodu, koltuk) Supabase'ten genel bir mesajla döner
  if (err?.message?.toLowerCase().includes('database error saving new user')) {
    return 'Kayıt tamamlanamadı. Ekip kodu yazdıysan doğru yazdığından, 15 dakikalık süresinin dolmadığından ve kliniğin uzman koltuğunun dolu olmadığından emin ol; gerekirse klinik sahibinden yeni kod iste.';
  }
  return err?.message || 'Bir şeyler ters gitti. Tekrar dene.';
}

// URL'nin hem ?sorgu hem #parça kısmındaki parametreleri oku
function urlParams(url: string): Record<string, string> {
  const out: Record<string, string> = {};
  const [beforeHash, hash = ''] = url.split('#');
  const query = beforeHash.split('?')[1] ?? '';
  [query, hash].forEach((part) =>
    part.split('&').forEach((kv) => {
      if (!kv) return;
      const [k, v = ''] = kv.split('=');
      out[decodeURIComponent(k)] = decodeURIComponent(v.replace(/\+/g, ' '));
    }),
  );
  return out;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [recovery, setRecovery] = useState(false);
  const [noAccount, setNoAccount] = useState(false);
  // Girişte hesap türü denetlenirken oturum ekrana yansımaz (panel bir an açılıp kapanmasın)
  const verifying = useRef(false);

  // E-posta bağlantısından gelen oturumu kur
  const handleUrl = useCallback(async (url: string | null) => {
    if (!url) return;
    const p = urlParams(url);
    const isAuthLink = p.code || p.token_hash || p.error || p.error_description;
    if (!isAuthLink) return;

    // Bağlantıdaki metin gösterilmez (sahte uyarı yazdırılamasın)
    if (p.error || p.error_description) {
      Alert.alert('Bağlantı açılamadı', p.error_code === 'otp_expired'
        ? 'Bağlantının süresi dolmuş ya da daha önce kullanılmış. Yeniden iste.'
        : 'Bağlantı geçersiz. Yeniden iste.');
      return;
    }
    try {
      if (p.code) {
        const { error } = await supabase.auth.exchangeCodeForSession(p.code);
        if (error) {
          // Bağlantı başka cihazda/tarayıcıda açıldı: e-posta yine doğrulanmıştır
          Alert.alert('E-posta doğrulandı', 'Bağlantıyı başka bir cihazda açtın. Şimdi e-posta ve şifrenle giriş yapabilirsin.');
          return;
        }
      } else if (p.token_hash && p.type) {
        const { error } = await supabase.auth.verifyOtp({ token_hash: p.token_hash, type: p.type as EmailOtpType });
        if (error) throw error;
        if (p.type !== 'recovery') {
          // Kayıt doğrulaması oturum açtırmaz: kişi kendi şifresiyle girer
          await supabase.auth.signOut({ scope: 'local' });
          Alert.alert('E-posta doğrulandı', 'Şimdi e-posta ve şifrenle giriş yapabilirsin.');
          return;
        }
      }
      if (p.type === 'recovery') setRecovery(true);
    } catch (e) {
      Alert.alert('Bağlantı açılamadı', authErrorText(e));
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      if (verifying.current) return;
      setSession(s);
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      if (event === 'SIGNED_OUT') setRecovery(false);
    });
    Linking.getInitialURL().then(handleUrl);
    const sub = Linking.addEventListener('url', ({ url }) => handleUrl(url));
    return () => {
      data.subscription.unsubscribe();
      sub.remove();
    };
  }, [handleUrl]);

  const signIn = useCallback(async (email: string, password: string) => {
    verifying.current = true;
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (error) throw error;
      // Aynı Supabase'teki ebeveyn hesabı uzman hesabı sayılmaz: "hesap yok" gibi davranılır
      const me = await supabase.rpc('clinician_me');
      if (!me.error && me.data == null) {
        await supabase.auth.signOut({ scope: 'local' });
        throw Object.assign(new Error('Uzman hesabı yok'), { code: 'no_clinician_account' });
      }
      setSession(data.session);
    } finally {
      verifying.current = false;
    }
  }, []);

  const signUp = useCallback(async (p: ClinicianSignUp) => {
    const teamCode = p.teamCode.trim().toUpperCase();
    const { data, error } = await supabase.auth.signUp({
      email: p.email.trim(),
      password: p.password,
      options: {
        data: {
          account: 'clinician',
          name: p.name.trim(),
          title: p.title.trim(),
          ...(teamCode ? { team_code: teamCode } : { clinic_name: p.clinicName.trim(), practice: p.practice ?? 'clinic' }),
          ...(p.legal ? { legal: p.legal } : {}),
        },
        emailRedirectTo: authRedirectUrl(),
      },
    });
    if (error) throw error;
    // E-posta başka bir hesapta (ör. ParentApp) kayıtlıysa Supabase hata vermez, kimliksiz kullanıcı döner
    if (data.user && data.user.identities?.length === 0) {
      throw Object.assign(new Error('E-posta kullanımda'), { code: 'email_exists' });
    }
    return { needsConfirmation: !data.session };
  }, []);

  const resendConfirmation = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resend({
      type: 'signup', email: email.trim(), options: { emailRedirectTo: authRedirectUrl() },
    });
    if (error) throw error;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: authRedirectUrl() });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
    setRecovery(false);
  }, []);

  const signOut = useCallback(async () => {
    setRecovery(false);
    const { error } = await supabase.auth.signOut();
    // Ağ yoksa bile yerel oturumu kapat
    if (error) await supabase.auth.signOut({ scope: 'local' });
  }, []);

  const rejectAccount = useCallback(async () => {
    setNoAccount(true);
    await supabase.auth.signOut({ scope: 'local' });
  }, []);
  const clearNoAccount = useCallback(() => setNoAccount(false), []);

  return (
    <Ctx.Provider value={{
      session, loading, recovery, signIn, signUp, resendConfirmation, sendPasswordReset, updatePassword, signOut,
      noAccount, rejectAccount, clearNoAccount,
    }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => {
  const v = useContext(Ctx);
  if (!v) throw new Error('AuthProvider eksik');
  return v;
};
