import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme';
import { Input, Cta, LinkText, Notice } from '../components/ui';
import { useAuth, authErrorText } from '../lib/auth';

const MIN_PASSWORD = 8;
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());

export type AuthRoute = 'login' | 'signup' | 'join' | 'forgot';
type Go = (r: AuthRoute, email?: string) => void;

/* ---------- Ortak yerleşim (web'de ortada dar sütun) ---------- */

function Layout({ title, subtitle, onBack, children }: {
  title: string; subtitle?: string; onBack?: () => void; children: React.ReactNode;
}) {
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.column}>
            <View style={{ height: 36, justifyContent: 'center' }}>
              {onBack && (
                <Pressable onPress={onBack} accessibilityLabel="Geri" hitSlop={8} style={styles.back}>
                  <Ionicons name="chevron-back" size={20} color={colors.navy} />
                </Pressable>
              )}
            </View>
            <Text style={styles.brand}>ClinicApp</Text>
            <Text style={styles.title}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            <View style={{ gap: 12, marginTop: 24 }}>{children}</View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ---------- Uzman girişi ---------- */

export function LoginScreen({ go, initialEmail = '' }: { go: Go; initialEmail?: string }) {
  const { signIn, resendConfirmation } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!isEmail(email)) return Alert.alert('Geçerli bir e-posta adresi yaz.');
    if (!password) return Alert.alert('Şifreni yaz.');
    setBusy(true);
    try {
      await signIn(email, password);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === 'email_not_confirmed') {
        Alert.alert('E-posta doğrulanmadı', authErrorText(e), [
          { text: 'Vazgeç', style: 'cancel' },
          {
            text: 'Tekrar gönder',
            onPress: () => resendConfirmation(email)
              .then(() => Alert.alert('Gönderildi', 'Doğrulama bağlantısını tekrar gönderdik.'))
              .catch((err) => Alert.alert('Gönderilemedi', authErrorText(err))),
          },
        ]);
      } else {
        Alert.alert('Giriş yapılamadı', authErrorText(e));
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout title="Uzman girişi" subtitle="Danışanlarının paylaşılan gözlemlerine kaldığın yerden devam et.">
      <Input value={email} onChangeText={setEmail} placeholder="E-posta" keyboardType="email-address"
        autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <Input value={password} onChangeText={setPassword} placeholder="Şifre" secure
        autoComplete="current-password" textContentType="password" onSubmitEditing={submit} />
      <Pressable onPress={() => go('forgot', email)} hitSlop={8} style={{ alignSelf: 'flex-end' }}>
        <Text style={styles.small}>Şifremi unuttum</Text>
      </Pressable>
      <Cta label="Giriş yap" onPress={submit} busy={busy} />
      <LinkText onPress={() => go('signup')}>Hesabın yok mu? Kayıt ol</LinkText>
      <Pressable onPress={() => go('join')} style={styles.teamBox} accessibilityRole="button">
        <Ionicons name="people-outline" size={22} color={colors.navy} />
        <View style={{ flex: 1 }}>
          <Text style={styles.teamTitle}>Kodum var</Text>
          <Text style={styles.small}>Bir kliniğin ekibine katılıyorsan, klinik sahibinin verdiği 8 karakterli kodla hesabını aç.</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.faint} />
      </Pressable>
    </Layout>
  );
}

/* ---------- Kayıt: bireysel uzman ya da klinik hesabı açar; kodla mevcut bir kliniğin ekibine katılır ---------- */

type Practice = 'solo' | 'clinic';

export function SignUpScreen({ go, initialJoin = false }: { go: Go; initialJoin?: boolean }) {
  const { signUp, resendConfirmation } = useAuth();
  const [join, setJoin] = useState(initialJoin);
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [practice, setPractice] = useState<Practice>('solo');
  const [teamCode, setTeamCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | undefined>();

  const submit = async () => {
    if (!name.trim()) return Alert.alert('Adını yaz.');
    if (join && ![6, 8].includes(teamCode.trim().length)) return Alert.alert('Ekip kodu 8 karakterdir.');
    if (!join && practice === 'clinic' && !clinicName.trim()) return Alert.alert('Kliniğinin adını yaz.');
    if (!isEmail(email)) return Alert.alert('Geçerli bir e-posta adresi yaz.');
    if (password.length < MIN_PASSWORD) return Alert.alert(`Şifre en az ${MIN_PASSWORD} karakter olmalı.`);
    setBusy(true);
    try {
      const { needsConfirmation } = await signUp({
        email, password, name, title, teamCode: join ? teamCode : '',
        // Bireysel uzmanın çalışma alanı kendi adıyla açılır (sonra değiştirilebilir)
        clinicName: join ? '' : (clinicName.trim() || name.trim()),
      });
      if (needsConfirmation) setSentTo(email.trim());
    } catch (e) {
      Alert.alert('Kayıt olunamadı', authErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  if (sentTo) {
    return (
      <Layout title="E-postanı kontrol et" onBack={() => go('login', sentTo)}>
        <Notice icon="mail-open-outline" text={`${sentTo} adresine doğrulama e-postası gönderdik. İçindeki bağlantıya dokununca hesabın açılır.`} />
        <LinkText
          onPress={() => resendConfirmation(sentTo)
            .then(() => Alert.alert('Gönderildi', 'E-postayı tekrar gönderdik.'))
            .catch((e) => Alert.alert('Gönderilemedi', authErrorText(e)))}
        >
          E-posta gelmedi mi? Tekrar gönder
        </LinkText>
      </Layout>
    );
  }

  return (
    <Layout
      title={join ? 'Ekibe katıl' : 'Uzman kaydı'}
      subtitle={join
        ? 'Klinik sahibinin verdiği kodla hesabını aç; kliniğin adı ve ekibi profiline kendiliğinden gelir. Zaten hesabın varsa giriş yap, Ekip bölümünden kodu gir.'
        : 'Tek başına çalışan uzman da klinik de hesap açabilir. Aileler, çocuklarının verisini yalnız kendi verdikleri kodla ve istedikleri sürece seninle paylaşır.'}
      onBack={() => go('login')}
    >
      <View style={styles.seg}>
        {[{ id: false, label: 'Yeni hesap' }, { id: true, label: 'Kodum var' }].map((o) => (
          <Pressable key={o.label} onPress={() => setJoin(o.id)} style={[styles.segItem, join === o.id && styles.segActive]}>
            <Text style={{ fontSize: 13, fontWeight: join === o.id ? '700' : '500', color: join === o.id ? colors.navy : colors.muted }}>
              {o.label}
            </Text>
          </Pressable>
        ))}
      </View>
      {!join && (
        <View style={styles.practiceRow}>
          {([
            { id: 'solo', icon: 'person-outline', t: 'Bireysel uzman', d: 'Tek başıma çalışıyorum' },
            { id: 'clinic', icon: 'business-outline', t: 'Klinik', d: 'Ekibimle çalışıyorum' },
          ] as const).map((o) => (
            <Pressable key={o.id} onPress={() => setPractice(o.id)} accessibilityRole="radio" accessibilityState={{ selected: practice === o.id }}
              style={[styles.practice, practice === o.id && styles.practiceOn]}>
              <Ionicons name={o.icon} size={20} color={colors.navy} />
              <Text style={styles.teamTitle}>{o.t}</Text>
              <Text style={styles.small}>{o.d}</Text>
            </Pressable>
          ))}
        </View>
      )}
      {join && (
        <Input value={teamCode} onChangeText={(t) => setTeamCode(t.toUpperCase())} placeholder="Kod (klinik sahibinden, 8 karakter)"
          autoCapitalize="characters" autoCorrect={false} maxLength={8} />
      )}
      <Input value={name} onChangeText={setName} placeholder="Adın soyadın" autoComplete="name" textContentType="name" />
      <Input value={title} onChangeText={setTitle} placeholder="Unvanın (ör. Klinik Psikolog)" />
      {!join && practice === 'clinic' && <Input value={clinicName} onChangeText={setClinicName} placeholder="Kliniğinin adı" />}
      {!join && practice === 'solo' && (
        <Input value={clinicName} onChangeText={setClinicName} placeholder="Çalışma adın (isteğe bağlı)" />
      )}
      <Input value={email} onChangeText={setEmail} placeholder="E-posta" keyboardType="email-address"
        autoCapitalize="none" autoComplete="email" textContentType="emailAddress" />
      <Input value={password} onChangeText={setPassword} placeholder={`Şifre (en az ${MIN_PASSWORD} karakter)`} secure
        autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
      <Cta label="Kayıt ol" onPress={submit} busy={busy} />
      <LinkText onPress={() => go('login')}>Zaten hesabın var mı? Giriş yap</LinkText>
    </Layout>
  );
}

/* ---------- Şifremi unuttum ---------- */

export function ForgotPasswordScreen({ go, initialEmail = '' }: { go: Go; initialEmail?: string }) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState(initialEmail);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (!isEmail(email)) return Alert.alert('Geçerli bir e-posta adresi yaz.');
    setBusy(true);
    try {
      await sendPasswordReset(email);
      setSent(true);
    } catch (e) {
      Alert.alert('Gönderilemedi', authErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout title="Şifremi unuttum" subtitle="E-posta adresine şifre yenileme bağlantısı gönderelim." onBack={() => go('login', email)}>
      {sent ? (
        <Notice icon="mail-open-outline" text={`${email.trim()} adresine bir bağlantı gönderdik. Bağlantıyı aç; uygulama açılınca yeni şifreni belirle.`} />
      ) : (
        <>
          <Input value={email} onChangeText={setEmail} placeholder="E-posta" keyboardType="email-address"
            autoCapitalize="none" autoComplete="email" textContentType="emailAddress" onSubmitEditing={submit} />
          <Cta label="Bağlantı gönder" onPress={submit} busy={busy} />
        </>
      )}
    </Layout>
  );
}

/* ---------- Yeni şifre (e-postadaki bağlantıdan gelinir) ---------- */

export function NewPasswordScreen() {
  const { updatePassword, signOut, session } = useAuth();
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (password.length < MIN_PASSWORD) return Alert.alert(`Şifre en az ${MIN_PASSWORD} karakter olmalı.`);
    if (password !== again) return Alert.alert('Şifreler aynı değil.');
    setBusy(true);
    try {
      await updatePassword(password);
      Alert.alert('Şifren güncellendi');
    } catch (e) {
      Alert.alert('Şifre güncellenemedi', authErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Layout title="Yeni şifre belirle"
      subtitle={`${session?.user.email ?? 'Hesabın'} için yeni bir şifre seç. Bu e-posta senin değilse geri dön.`} onBack={signOut}>
      <Input value={password} onChangeText={setPassword} placeholder={`Yeni şifre (en az ${MIN_PASSWORD} karakter)`} secure
        autoComplete="new-password" textContentType="newPassword" />
      <Input value={again} onChangeText={setAgain} placeholder="Yeni şifre (tekrar)" secure
        autoComplete="new-password" textContentType="newPassword" onSubmitEditing={submit} />
      <Cta label="Şifreyi kaydet" onPress={submit} busy={busy} />
    </Layout>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 8, flexGrow: 1 },
  column: { width: '100%', maxWidth: 440, alignSelf: 'center' },
  back: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 1, marginTop: 28 },
  title: { fontSize: 24, fontWeight: '700', color: colors.navy, marginTop: 6 },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
  small: { fontSize: 12, color: colors.muted },
  seg: { flexDirection: 'row', backgroundColor: '#ECEEF3', borderRadius: 10, padding: 3 },
  segItem: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: 8 },
  segActive: { backgroundColor: '#fff' },
  teamBox: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 8 },
  teamTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
  practiceRow: { flexDirection: 'row', gap: 10 },
  practice: { flex: 1, gap: 4, padding: 14, borderRadius: 14, backgroundColor: '#fff', borderWidth: 1.5, borderColor: 'transparent' },
  practiceOn: { borderColor: colors.navy },
});
