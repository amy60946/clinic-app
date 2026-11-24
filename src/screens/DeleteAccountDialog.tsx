import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, Modal, StyleSheet, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { supabase } from '../lib/supabase';
import { authErrorText, isWrongPassword } from '../lib/authErrors';
import { errorText } from '../lib/errors';
import { deleteWithPassword, DELETE_PASSWORD_TITLE, WRONG_PASSWORD, REENTER_PASSWORD } from '../lib/accountDelete';

// Hesabı sil, son adım (ortak sozlesme/akislar.md 28, satır 4): uyarı metni onaylandıktan sonra şifre sorulur.
// Aynı e-postayla `signInWithPassword`: yanlışsa "Şifre yanlış" ve hiçbir şey silinmez; doğruysa hemen `onDelete`
// (push kaydını kapatır, `delete_account()` çağırır, oturumu kapatır). Sunucu yeni giriş isterse (ipucu
// `recent_login_required`) pencere açık kalır ve şifre yeniden sorulur. Web ve iOS'ta aynı pencere (Alert.prompt yok).
export default function DeleteAccountDialog({ visible, email, onClose, onDelete }: {
  visible: boolean; email: string; onClose: () => void; onDelete: () => Promise<void>;
}) {
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ text: string; error: boolean } | null>(null);
  const [round, setRound] = useState(0);   // şifre alanı baştan kurulur (boş, gizli, odakta)
  const [hidden, setHidden] = useState(true);
  const [focused, setFocused] = useState(false);
  useEffect(() => { if (visible) { setPassword(''); setNote(null); setBusy(false); } }, [visible]);

  const again = (text: string, error = true) => { setPassword(''); setHidden(true); setNote({ text, error }); setRound((r) => r + 1); };
  const submit = async () => {
    if (busy || !password) return;
    if (!email) return setNote({ text: 'Hesabının e-postası okunamadı. Çıkış yap, yeniden giriş yap ve tekrar dene.', error: true });
    setBusy(true);
    setNote(null);
    const r = await deleteWithPassword(password, {
      signIn: async (pw) => (await supabase.auth.signInWithPassword({ email, password: pw })).error,
      remove: onDelete,
      wrong: isWrongPassword,
    });
    if (r.kind === 'deleted') return;          // oturum kapandı; ekran giriş sayfasına döner
    setBusy(false);
    if (r.kind === 'wrong_password') again(WRONG_PASSWORD);
    else if (r.kind === 'reauth') again(REENTER_PASSWORD, false);
    else if (r.kind === 'signin_error') setNote({ text: authErrorText(r.error), error: true });
    else if (r.kind === 'delete_error') setNote({ text: `Hesap silinemedi. ${errorText(r.error)}`, error: true });
  };
  const close = () => { if (!busy) onClose(); };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close} statusBarTranslucent>
      <KeyboardAvoidingView style={styles.scrim} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.card} accessibilityRole="alert">
          <Text style={styles.title}>{DELETE_PASSWORD_TITLE}</Text>
          {!!email && <Text style={styles.email} numberOfLines={1}>{email}</Text>}
          {/* beyaz kartın üstünde alan çerçeveli (ortak Input beyaz zeminde görünmez); odakta çerçeve lacivert */}
          <View style={[styles.field, focused && { borderColor: colors.navy }, note?.error && { borderColor: colors.danger }]}>
            <TextInput key={round} value={password} onChangeText={(t) => { setPassword(t); if (note?.error) setNote(null); }}
              placeholder="Şifre" placeholderTextColor={colors.muted} secureTextEntry={hidden} autoFocus editable={!busy}
              autoCapitalize="none" autoCorrect={false} autoComplete="current-password" textContentType="password"
              onSubmitEditing={submit} returnKeyType="done" onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
              accessibilityLabel="Şifre" style={[styles.input, WEB_NO_OUTLINE]} />
            <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityLabel={hidden ? 'Şifreyi göster' : 'Şifreyi gizle'}>
              <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.muted} />
            </Pressable>
          </View>
          {!!note && <Text style={[styles.note, note.error && { color: colors.danger }]} accessibilityLiveRegion="polite">{note.text}</Text>}
          <View style={styles.row}>
            <Pressable onPress={close} disabled={busy} accessibilityRole="button"
              style={({ pressed }) => [styles.btn, styles.ghost, (pressed || busy) && { opacity: 0.6 }]}>
              <Text style={styles.ghostText}>Vazgeç</Text>
            </Pressable>
            <Pressable onPress={submit} disabled={busy || !password} accessibilityRole="button" accessibilityState={{ disabled: busy || !password }}
              style={({ pressed }) => [styles.btn, styles.danger, !password && !busy && { opacity: 0.4 }, pressed && { opacity: 0.85 }]}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.dangerText}>Hesabı sil</Text>}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// Web: tarayıcının odak çizgisi yerine alanın kendi çerçevesi
const WEB_NO_OUTLINE = Platform.OS === 'web' ? ({ outlineStyle: 'none' } as object) : null;

const styles = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(10,14,28,0.5)', alignItems: 'center', justifyContent: 'center', padding: 20 },
  card: { width: '100%', maxWidth: 400, backgroundColor: '#fff', borderRadius: 16, padding: 20, gap: 12 },
  title: { fontSize: 18, fontWeight: '700', color: colors.navy, lineHeight: 24 },
  email: { fontSize: 13, color: colors.muted, marginTop: -6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1.5, borderColor: colors.line, borderRadius: 14, backgroundColor: '#FAFBFC', paddingHorizontal: 14 },
  input: { flex: 1, paddingVertical: 13, fontSize: 15, color: colors.navy },
  note: { fontSize: 13, lineHeight: 18, color: colors.text },
  row: { flexDirection: 'row', gap: 10, marginTop: 4 },
  btn: { flex: 1, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  ghost: { borderWidth: 1, borderColor: colors.line, backgroundColor: '#fff' },
  ghostText: { fontSize: 15, fontWeight: '600', color: colors.navy },
  danger: { backgroundColor: colors.danger },
  dangerText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
