import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './supabase';
import { storeLogOut } from './store';
import { authErrorText, hasWeakPassword, WEAK_PASSWORD_PROMPT, WEAK_PASSWORD_NOW, WEAK_PASSWORD_LATER } from './authErrors';

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
  // Girişte "şifren güvenli değil" önerisinden gelindi (ortak akislar.md 28): aynı yeni şifre ekranı, vazgeçilince panele dönülür
  passwordChange: boolean;
  cancelPasswordChange: () => void;
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

// Hata metinleri saf dosyada (testi tests/authErrors.test.mjs); eski içe aktarmalar bozulmasın diye buradan da verilir
export { authErrorText };

// Web: e-posta bağlantısının kodunu ve hata parametrelerini adres çubuğundan sil (sayfa yenilenmez)
const AUTH_PARAMS = ['code', 'type', 'token_hash', 'access_token', 'refresh_token', 'error', 'error_code', 'error_description'];
function clearAuthParams() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || !window.history?.replaceState) return;
  try {
    const u = new URL(window.location.href);
    let changed = false;
    for (const k of AUTH_PARAMS) if (u.searchParams.has(k)) { u.searchParams.delete(k); changed = true; }
    if (/(^|[#&])(access_token|refresh_token|error|code)=/.test(u.hash)) { u.hash = ''; changed = true; }
    if (changed) window.history.replaceState(window.history.state, '', u.pathname + u.search + u.hash);
  } catch { /* adres okunamazsa dokunma */ }
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
  const [passwordChange, setPasswordChange] = useState(false);
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
    // Güvenlik denetimi 22 Kasım 2026 (Moyo ile aynı): yalnız PKCE kodu (?code=) kabul edilir; bağlantıdaki token_hash ya da
    // access_token oturum açtırmaz (başkasının hesabına sokan bağlantı olmasın). Kod adres çubuğundan hemen silinir
    // (geçmişe, ekran paylaşımına ve yer imine girmesin).
    clearAuthParams();
    if (!p.code) {
      Alert.alert('Bağlantı açılamadı', 'Bağlantı geçersiz. Yeniden iste.');
      return;
    }
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(p.code);
      if (error) {
        // Kod yalnız isteğin yapıldığı tarayıcıda / cihazda çözülür (PKCE). E-postanın doğrulandığını bilemeyiz, öyle denmez.
        Alert.alert('Bağlantı açılamadı', 'Bu bağlantı yalnız isteği yaptığın cihazda ve tarayıcıda açılır. Orada aç ya da e-posta ve şifrenle giriş yapmayı dene; olmazsa yeni bağlantı iste.');
        return;
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
      if (event === 'SIGNED_OUT') { setRecovery(false); setPasswordChange(false); storeLogOut(); }   // App Store (RevenueCat) kimliği de bırakılır
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
    setPasswordChange(false);
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
      // Eski hesap, şifresi artık kurala uymuyor (ortak akislar.md 28, satır 3): giriş sürer; öneri giriş başına bir kez
      // (yalnız şifreyle girişte; açık oturumla uygulama açılınca sorulmaz)
      if (hasWeakPassword(data)) {
        Alert.alert(WEAK_PASSWORD_PROMPT, undefined, [
          { text: WEAK_PASSWORD_LATER, style: 'cancel' },
          { text: WEAK_PASSWORD_NOW, onPress: () => setPasswordChange(true) },
        ]);
      }
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
    // Şifre değişince öteki cihazlardaki oturumlar kapanır (güvenlik denetimi 22 Kasım 2026); bu cihaz açık kalır
    await supabase.auth.signOut({ scope: 'others' }).catch(() => {});
    setRecovery(false);
    setPasswordChange(false);
  }, []);

  const signOut = useCallback(async () => {
    setRecovery(false);
    setPasswordChange(false);
    const { error } = await supabase.auth.signOut();
    // Ağ yoksa bile yerel oturumu kapat
    if (error) await supabase.auth.signOut({ scope: 'local' });
  }, []);

  const rejectAccount = useCallback(async () => {
    setNoAccount(true);
    await supabase.auth.signOut({ scope: 'local' });
  }, []);
  const clearNoAccount = useCallback(() => setNoAccount(false), []);
  const cancelPasswordChange = useCallback(() => setPasswordChange(false), []);

  return (
    <Ctx.Provider value={{
      session, loading, recovery, signIn, signUp, resendConfirmation, sendPasswordReset, updatePassword, signOut,
      noAccount, rejectAccount, clearNoAccount, passwordChange, cancelPasswordChange,
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
