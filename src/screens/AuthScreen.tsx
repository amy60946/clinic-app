import React, { useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';
import { Button, Field, Segmented, Card } from '../components/ui';
import { useAuth, authErrorText } from '../lib/auth';

type Mode = 'login' | 'signup' | 'forgot';

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login');
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.wrap} keyboardShouldPersistTaps="handled">
          <View style={styles.box}>
            <View style={{ alignItems: 'center', gap: 6, marginBottom: 8 }}>
              <View style={styles.logo}><Text style={{ fontSize: 26 }}>🩺</Text></View>
              <Text style={styles.brand}>ClinicApp</Text>
              <Text style={styles.cap}>Uzmanlar için aile ve çocuk takip paneli</Text>
            </View>
            {mode === 'login' && <Login onSignup={() => setMode('signup')} onForgot={() => setMode('forgot')} />}
            {mode === 'signup' && <SignUp onLogin={() => setMode('login')} />}
            {mode === 'forgot' && <Forgot onBack={() => setMode('login')} />}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Login({ onSignup, onForgot }: { onSignup: () => void; onForgot: () => void }) {
  const { signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await signIn(email, password); }
    catch (e) { Alert.alert('Giriş yapılamadı', authErrorText(e)); }
    finally { setBusy(false); }
  };
  return (
    <Card style={{ gap: 14 }}>
      <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" />
      <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" onSubmitEditing={go} />
      <Button title="Giriş yap" onPress={go} busy={busy} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Pressable onPress={onForgot} hitSlop={8}><Text style={styles.link}>Şifremi unuttum</Text></Pressable>
        <Pressable onPress={onSignup} hitSlop={8}><Text style={[styles.link, { fontWeight: '700' }]}>Hesap oluştur</Text></Pressable>
      </View>
    </Card>
  );
}

function SignUp({ onLogin }: { onLogin: () => void }) {
  const { signUp } = useAuth();
  const [kind, setKind] = useState<'open' | 'join'>('open');
  const [name, setName] = useState('');
  const [title, setTitle] = useState('');
  const [clinicName, setClinicName] = useState('');
  const [teamCode, setTeamCode] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!name.trim()) return Alert.alert('Adını yaz');
    if (kind === 'open' && !clinicName.trim()) return Alert.alert('Kliniğin ya da muayenehanenin adını yaz');
    if (kind === 'join' && teamCode.length !== 6) return Alert.alert('Ekip kodu 6 karakter olmalı');
    if (password.length < 8) return Alert.alert('Şifre en az 8 karakter olmalı');
    setBusy(true);
    try {
      const base = { email, password, name, title };
      const r = await signUp(kind === 'open' ? { ...base, clinicName } : { ...base, teamCode });
      if (r.needsConfirmation) {
        Alert.alert('E-postanı doğrula', 'Gelen kutuna bir bağlantı gönderdik. Doğruladıktan sonra giriş yap.');
        onLogin();
      }
    } catch (e) {
      Alert.alert('Hesap oluşturulamadı', authErrorText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card style={{ gap: 14 }}>
      <Segmented options={[{ id: 'open', label: 'Yeni klinik' }, { id: 'join', label: 'Ekibe katıl' }]} value={kind} onChange={setKind} />
      <Text style={styles.cap}>
        {kind === 'open'
          ? '14 günlük deneme ile başlarsın. Ekibine sonra davet kodu gönderebilirsin.'
          : 'Klinik sahibinin Klinik > Ekip bölümünden ürettiği 6 haneli kodu yaz.'}
      </Text>
      <Field label="Ad soyad" value={name} onChangeText={setName} placeholder="Ör. Dr. Elif Kaya" />
      <Field label="Unvan (isteğe bağlı)" value={title} onChangeText={setTitle} placeholder="Ör. Klinik Psikolog" />
      {kind === 'open'
        ? <Field label="Klinik adı" value={clinicName} onChangeText={setClinicName} placeholder="Ör. Mavi Çocuk ve Aile Merkezi" />
        : <Field label="Ekip kodu" value={teamCode} autoCapitalize="characters" autoCorrect={false}
            onChangeText={(v) => setTeamCode(v.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 6))}
            style={{ fontSize: 20, fontWeight: '800', letterSpacing: 5, textAlign: 'center' }} />}
      <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Field label="Şifre" value={password} onChangeText={setPassword} secureTextEntry placeholder="En az 8 karakter" />
      <Button title="Hesap oluştur" onPress={go} busy={busy} />
      <Text style={[styles.cap, { textAlign: 'center' }]}>
        Danışan verisi yalnızca ebeveynin ParentApp'te verdiği açık rızayla görünür ve ebeveyn rızayı her an geri alabilir.
      </Text>
      <Pressable onPress={onLogin} hitSlop={8} style={{ alignSelf: 'center' }}><Text style={styles.link}>Zaten hesabım var</Text></Pressable>
    </Card>
  );
}

function Forgot({ onBack }: { onBack: () => void }) {
  const { sendPasswordReset } = useAuth();
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await sendPasswordReset(email); Alert.alert('Bağlantı gönderildi', 'Gelen kutunu kontrol et.'); onBack(); }
    catch (e) { Alert.alert('Gönderilemedi', authErrorText(e)); }
    finally { setBusy(false); }
  };
  return (
    <Card style={{ gap: 14 }}>
      <Text style={styles.cap}>E-postana şifre yenileme bağlantısı gönderelim.</Text>
      <Field label="E-posta" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
      <Button title="Bağlantı gönder" onPress={go} busy={busy} />
      <Pressable onPress={onBack} hitSlop={8} style={{ alignSelf: 'center' }}><Text style={styles.link}>Girişe dön</Text></Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  box: { width: '100%', maxWidth: 420, alignSelf: 'center', gap: 16 },
  logo: { width: 56, height: 56, borderRadius: 16, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  brand: { fontSize: 22, fontWeight: '800', color: colors.navy },
  cap: { fontSize: 12, color: colors.muted, lineHeight: 17 },
  link: { fontSize: 13, color: colors.navy },
});
