import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, Alert, StyleSheet, ActivityIndicator, RefreshControl, Platform, AppState, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Label, Notice } from '../components/ui';
import { useAuth } from '../lib/auth';
import {
  clinicianMe, listClients, listTeam, deleteAccount, ClinicNotInstalled, ClinicianMe, Client, Member,
} from '../lib/clinic';
import SettingsScreen from './SettingsScreen';
import { StartCard, SampleRow, TourBar, TOUR, StartFlags, startFlags, markSampleSeen, hideStart, hideSample } from './SampleTour';
import { sampleClient } from '../lib/sample';
import { isoDate } from '../lib/metrics';
import MembershipScreen from './MembershipScreen';
import { ConfigBanner } from './ConfigGate';
import InvitesCard from './invite/InvitesCard';
import VerificationSheet from './VerificationSheet';
import { VerificationState, loadVerification } from '../lib/verification';
import Onboarding, { onboardingSeen, markOnboardingSeen } from './Onboarding';
import WelcomeSurvey, { SurveyAction } from './WelcomeSurvey';
import { surveyAnswered } from '../lib/survey';
import { LegalDoc, legalPending } from '../lib/legal';
import LegalSheet from './legal/LegalSheet';
import LegalUpdateScreen from './legal/LegalUpdateScreen';
import { billingStatus, hasAccess, daysLeft, packageName } from '../lib/billing';
import ClientScreen, { Tab } from './client/ClientScreen';
import NotificationsSheet, { notificationTab } from './NotificationsSheet';
import Bell from '../components/Bell';
import { useNotifications } from '../lib/notificationsContext';
import { AppNotification, notificationChildren, onNotificationTap, unregisterPush } from '../lib/notifications';
import { track, flush } from '../lib/track';
import { supabase } from '../lib/supabase';

type State =
  | { kind: 'loading' }
  | { kind: 'not_installed' }
  | { kind: 'not_clinician' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; me: ClinicianMe; clients: Client[]; team: Member[] };

const initials = (name: string) => name.trim().split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]).join('').toLocaleUpperCase('tr-TR') || '?';
const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });

function planText(me: ClinicianMe) {
  const st = billingStatus(me);
  if (st === 'trial') return `Ücretsiz deneme · ${daysLeft(me.trial_ends_at)} gün kaldı`;
  if (st === 'expired') return me.plan === 'trial' ? 'Deneme süresi bitti' : 'Üyelik sona erdi';
  return `${packageName(me)} paket${me.period_end ? ` · ${dateText(me.period_end)}` : ''}`;
}

// Bireysel uzman (kayıtta "Bireysel uzman" seçildi, auth meta `practice`): ana ekranda ekip bölümü yok.
// Klinik paketine geçince ya da ekipte başka uzman varsa görünür. Seçimi kaydı olmayan eski hesapta kliniğin adı uzmanın adıysa bireysel sayılır.
function isSolo(me: ClinicianMe, team: Member[], practice: unknown) {
  if (me.role !== 'owner' || team.length > 1 || me.plan === 'clinic') return false;
  if (practice === 'solo' || practice === 'clinic') return practice === 'solo';
  return me.clinic.trim() === me.name.trim();
}

// Web: ödeme dönüşü (?billing=ok|fail); bugün web'de satış yok, eski iyzico yolu için duruyor
function billingReturn(): 'ok' | 'fail' | null {
  if (Platform.OS !== 'web' || typeof window === 'undefined') return null;
  const v = new URLSearchParams(window.location.search).get('billing');
  if (v !== 'ok' && v !== 'fail') return null;
  window.history.replaceState(null, '', window.location.pathname);
  return v;
}

export default function HomeScreen() {
  const { signOut, rejectAccount, session } = useAuth();
  const [state, setState] = useState<State>({ kind: 'loading' });
  const stateRef = useRef(state);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<{ client: Client; tab: Tab; key: number } | null>(null);
  const [bell, setBell] = useState(false);
  const [plans, setPlans] = useState(false);
  const [guide, setGuide] = useState(false);
  const [invitesKey, setInvitesKey] = useState(0);
  const [verify, setVerify] = useState(false);
  const [verification, setVerification] = useState<VerificationState | null>(null);
  // Karşılama anketi (ortak akislar.md 15): cevap yoksa ilk girişte bir kez; bitince seçilen ilk adım
  const [survey, setSurvey] = useState<'unknown' | 'show' | 'hidden'>('unknown');
  const [inviteOpenKey, setInviteOpenKey] = useState(0);
  const skipGuide = useRef(false);
  // Ayarlar (sağ üstteki ad), örnek aile + tur, "Başlarken" kartı
  const [settings, setSettings] = useState(false);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [start, setStart] = useState<StartFlags | null>(null);
  const [inviteCount, setInviteCount] = useState(0);
  const { width } = useWindowDimensions();
  // Yasal metinler (ortak akislar.md 17): onay bekleyen varsa panel yerine yeniden onay ekranı. null: sunucuda yok
  const [legal, setLegal] = useState<'unknown' | LegalDoc[] | null>('unknown');
  // Yasal ve gizlilik (tek sayfa; KVKK başvurusu içinde): false ya da açılacak görünüm
  const [legalOpen, setLegalOpen] = useState<false | 'docs' | 'kvkk'>(false);
  const legalAt = useRef(0);
  const { unread, unreadByChild } = useNotifications();
  const pending = useRef<Pick<AppNotification, 'kind' | 'data' | 'childId'> | null>(null);

  const load = useCallback(async (): Promise<State> => {
    let next: State;
    try {
      const me = await clinicianMe();
      if (!me) next = { kind: 'not_clinician' };
      else {
        const [clients, team] = await Promise.all([listClients(), listTeam()]);
        next = { kind: 'ready', me, clients, team };
      }
    } catch (e) {
      next = e instanceof ClinicNotInstalled ? { kind: 'not_installed' } : { kind: 'error', message: (e as Error).message };
    }
    setState(next);
    stateRef.current = next;
    return next;
  }, []);

  useEffect(() => {
    load();
    track('screen.home');
    const onReturn = () => {
      const r = billingReturn();
      if (r === 'ok') { Alert.alert('Ödeme alındı', 'Üyeliğin başladı. Teşekkürler!'); setPlans(false); load(); }
      if (r === 'fail') Alert.alert('Ödeme tamamlanmadı', 'Kartından ücret alınmadı. Tekrar deneyebilirsin.');
    };
    onReturn();
    // Sayfa yeniden yüklenmeden dönüş (ödeme penceresi adresi değiştirip haber verir)
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    window.addEventListener('clinicapp-billing', onReturn);
    return () => window.removeEventListener('clinicapp-billing', onReturn);
  }, [load]);
  useEffect(() => { stateRef.current = state; }, [state]);
  // İlk kullanım rehberi: henüz danışanı olmayan hesapta bir kez (görüldü bilgisi cihazda)
  const meId = state.kind === 'ready' ? state.me.id : null;
  const noClients = state.kind === 'ready' && state.clients.length === 0;
  // Belge incelemesi durumu (sunucu kurulmadıysa null → satır görünmez)
  const loadVerify = useCallback(() => { loadVerification().then(setVerification).catch(() => setVerification(null)); }, []);
  useEffect(() => { if (meId) loadVerify(); }, [meId, loadVerify]);
  useEffect(() => {
    if (!meId) return;
    surveyAnswered().then((a) => setSurvey(a === false ? 'show' : 'hidden'));
    startFlags(meId).then(setStart);
  }, [meId]);
  const sample = useMemo(() => (sampleOpen ? sampleClient(isoDate(new Date())) : null), [sampleOpen]);
  const openSample = () => {
    setSettings(false);
    setSampleOpen(true);
    setTourStep(0);
    track('sample.open');
    if (meId) markSampleSeen(meId);
    setStart((s) => (s ? { ...s, sampleSeen: true } : s));
  };
  const inviteFirst = () => {
    setSampleOpen(false);
    setTourStep(null);
    setSettings(false);
    setInviteOpenKey(Date.now());
  };
  // Açılışta ve ön plana gelince (en çok 10 dakikada bir) onay bekleyen yasal metin; kayıtta onaylananlar sessizce kaydedilir
  const signedLegal = session?.user.user_metadata?.legal;
  useEffect(() => {
    if (!meId) return;
    const check = () => {
      legalAt.current = Date.now();
      legalPending(signedLegal).catch(() => null).then((p) => setLegal((cur) => (p === null && cur !== 'unknown' ? cur : p)));
    };
    check();
    const sub = AppState.addEventListener('change', (st) => { if (st === 'active' && Date.now() - legalAt.current > 10 * 60e3) check(); });
    return () => sub.remove();
  }, [meId]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!meId || survey !== 'hidden' || skipGuide.current) return;
    onboardingSeen(meId).then((seen) => {
      if (seen) return;
      if (noClients) setGuide(true);
      else markOnboardingSeen(meId);
    });
  }, [meId, survey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Anket bitti: davet ya da paket seçildiyse rehber bu açılışta gösterilmez (danışan yoksa sonraki açılışta gelir)
  const finishSurvey = (action: SurveyAction) => {
    if (action === 'invite' || action === 'plans') skipGuide.current = true;
    setSurvey('hidden');
    if (action === 'invite') setInviteOpenKey(Date.now());
    if (action === 'plans') setPlans(true);
    if (action === 'joined') load();
  };
  // Açık kalmış uzman olmayan oturum (ör. ParentApp hesabı): kapatılır, kayıt ekranı açılır
  useEffect(() => { if (state.kind === 'not_clinician') rejectAccount(); }, [state.kind, rejectAccount]);

  // Bildirime dokununca ilgili danışan ve sekme. Danışan listede yoksa (yeni paylaşım) liste yenilenip tekrar aranır.
  const openTarget = useCallback(async (n: Pick<AppNotification, 'kind' | 'data' | 'childId'>) => {
    setBell(false);
    setSettings(false);
    setSampleOpen(false);
    setTourStep(null);
    if (n.kind === 'team_joined') { setSelected(null); load(); return; }
    if (n.kind === 'kvkk_answered') { setSelected(null); setLegalOpen('kvkk'); return; }
    // bayrak sonradan kapatıldıysa eski bildirim sayfayı açmaz (kapalıyken hiçbir şey görünmez)
    if (n.kind.startsWith('verification_')) {
      setSelected(null);
      loadVerification().then((v) => { setVerification(v); if (v?.enabled) setVerify(true); }).catch(() => setVerification(null));
      return;
    }
    // davet bildirimleri: ana ekrandaki davet listesi yenilenir
    if (n.kind === 'invite_claimed' || n.kind === 'invite_expired' || n.kind === 'invite_declined') { setSelected(null); setInvitesKey((k) => k + 1); return; }
    // invite_child_updated: ebeveynin düzelttiği çocuk, danışan olarak açılır (aşağıda)
    const ids = notificationChildren(n);
    if (!ids.length) return;
    let st = stateRef.current;
    let c = st.kind === 'ready' ? st.clients.find((x) => ids.includes(x.child_id)) : undefined;
    if (!c) {
      st = await load();
      c = st.kind === 'ready' ? st.clients.find((x) => ids.includes(x.child_id)) : undefined;
    }
    if (!c) {
      if (st.kind === 'loading') { pending.current = n; return; }
      Alert.alert('Danışan bulunamadı', n.kind === 'clinic_revoked'
        ? 'Aile bu paylaşımı durdurdu; çocuğun verisine artık erişilemez.'
        : 'Bu çocuğun paylaşımı artık etkin değil.');
      return;
    }
    setSelected({ client: c, tab: notificationTab(n.kind), key: Date.now() });
  }, [load]);

  // Telefon bildirimine dokunma (uygulama kapalıyken de)
  useEffect(() => onNotificationTap((data) => {
    const n = { kind: String(data.kind ?? ''), data, childId: typeof data.child_id === 'string' ? data.child_id : undefined };
    if (stateRef.current.kind === 'ready') openTarget(n);
    else pending.current = n;
  }), [openTarget]);
  useEffect(() => {
    if (state.kind === 'ready' && pending.current) {
      const n = pending.current;
      pending.current = null;
      openTarget(n);
    }
  }, [state, openTarget]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const logout = async () => {
    // Çıkmadan önce bekleyen kullanım olayları gönderilir ve bu cihaza push kapatılır
    await flush().catch(() => {});
    await unregisterPush().catch(() => {});
    signOut();
  };
  // Metinler hukuk/50-uygulama-ici-metinler.md 5.2 (tek kişilik klinik · ekipte sahip · ekip üyesi)
  const removeAccount = () => Alert.alert('Hesabın silinsin mi?',
    state.kind === 'ready' && state.team.length <= 1
      ? 'Kliniğin ve içindeki her şey silinir: danışan paylaşımları, notlar, hedefler, haftalık değerlendirmeler, görev önerileri, takip planları, davetler ve üyelik kaydı. Ailelerin ParentApp\'teki kendi verileri silinmez; yalnız seninle paylaşımları biter. Saklaman gereken kayıtları önce yazdır. App Store üyeliğin varsa Apple Ayarlar\'dan ayrıca kapat. Bu işlem geri alınamaz.'
      : state.kind === 'ready' && state.me.role === 'owner'
        ? 'Klinik kalır; sahiplik ekibin en eski üyesine geçer. Kliniğe ait kayıtlar klinikte kalır. Yalnız senin hesabın silinir. Bu işlem geri alınamaz.'
        : 'Yalnız senin hesabın silinir. Kliniğe ait kayıtlar klinikte kalır. Bu işlem geri alınamaz.',
    [{ text: 'Vazgeç', style: 'cancel' }, {
      text: 'Kalıcı olarak sil', style: 'destructive', onPress: async () => {
        try {
          await flush().catch(() => {});
          await unregisterPush().catch(() => {});
          await deleteAccount();
          await supabase.auth.signOut({ scope: 'local' });
        } catch (e) {
          Alert.alert('Hesap silinemedi', (e as Error).message);
        }
      },
    }]);
  const legalOn = Array.isArray(legal);
  const accountLinks = (
    <View style={styles.accountLinks}>
      {legalOn && <Pressable onPress={() => setLegalOpen('docs')} hitSlop={8}><Text style={styles.link}>Yasal ve gizlilik</Text></Pressable>}
      <Pressable onPress={logout} hitSlop={8}><Text style={styles.link}>Çıkış yap</Text></Pressable>
      <Pressable onPress={removeAccount} hitSlop={8}><Text style={[styles.link, { color: colors.danger }]}>Hesabı sil</Text></Pressable>
    </View>
  );
  // Yeniden onay ve üyelik ekranlarından da açılır (hukuk/50 bölüm 2: onay beklerken yasal metinler ve KVKK başvurusu açık)
  const legalSheets = (
    <>
      <LegalSheet visible={!!legalOpen} initial={legalOpen || 'docs'} email={session?.user.email ?? ''} onClose={() => setLegalOpen(false)} />
    </>
  );

  if (state.kind === 'ready' && Array.isArray(legal) && legal.length > 0) {
    return <><LegalUpdateScreen docs={legal} onDone={setLegal} footer={accountLinks} />{legalSheets}</>;
  }

  // Deneme/üyelik bitti (ya da Bireysel pakette ekip üyesi): panel yerine üyelik ekranı
  if (state.kind === 'ready' && !hasAccess(state.me)) {
    return <><MembershipScreen me={state.me} blocking onChanged={load} footer={accountLinks} />{legalSheets}</>;
  }
  if (state.kind === 'ready' && survey === 'show' && legal !== 'unknown') {
    return <WelcomeSurvey me={state.me} onFinish={finishSurvey} />;
  }
  if (plans && state.kind === 'ready') {
    return <><MembershipScreen me={state.me} onClose={() => { setPlans(false); load(); }} onChanged={load} footer={accountLinks} />{legalSheets}</>;
  }

  if (sample && state.kind === 'ready') {
    return (
      <ClientScreen
        client={sample.client} me={state.me} sample={sample.data}
        focusTab={tourStep !== null ? TOUR[tourStep].tab : undefined}
        onBack={() => { setSampleOpen(false); setTourStep(null); }}
        onRevoked={() => setSampleOpen(false)}
        onOpenNotification={openTarget}
        footer={tourStep !== null ? (
          <TourBar step={tourStep} onStep={setTourStep} onInvite={inviteFirst}
            onClose={() => { setTourStep(null); track('sample.tour', { step: tourStep }); }} />
        ) : undefined}
      />
    );
  }

  if (settings && state.kind === 'ready') {
    return (
      <>
        <SettingsScreen
          me={state.me} team={state.team} clients={state.clients} email={session?.user.email ?? ''}
          solo={isSolo(state.me, state.team, session?.user.user_metadata?.practice)}
          verified={!!verification?.verified_at} legalOn={Array.isArray(legal)}
          onBack={() => setSettings(false)} onChanged={load} onPlans={() => setPlans(true)}
          onOpenClient={(c) => { setSettings(false); setSelected({ client: c, tab: 'summary', key: Date.now() }); }}
          onSample={openSample}
          onLegal={() => setLegalOpen('docs')}
          onGuide={() => { setSettings(false); setGuide(true); }}
          onLogout={logout} onDelete={removeAccount}
        />
        {legalSheets}
      </>
    );
  }

  if (selected && state.kind === 'ready') {
    return (
      <ClientScreen
        key={selected.key}
        client={selected.client} me={state.me} team={state.team} initialTab={selected.tab}
        clients={state.clients}
        onSwitch={(c, tab) => setSelected({ client: c, tab, key: Date.now() })}
        onTeamChanged={async () => {
          const st = await load();
          const c = st.kind === 'ready' ? st.clients.find((x) => x.link_id === selected.client.link_id) : undefined;
          if (c) setSelected((s) => (s ? { ...s, client: c } : s));
          else setSelected(null);
        }}
        onBack={() => { setSelected(null); load(); }}
        onRevoked={() => { setSelected(null); load(); }}
        onOpenNotification={openTarget}
      />
    );
  }

  const solo = state.kind === 'ready' && isSolo(state.me, state.team, session?.user.user_metadata?.practice);
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
      >
        <View style={styles.column}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>ClinicApp</Text>
              <Text style={styles.title}>{state.kind === 'ready' ? state.me.clinic : 'Uzman paneli'}</Text>
              {state.kind === 'ready' && (
                <Text style={styles.subtitle}>
                  {[[state.me.name !== state.me.clinic && state.me.name, state.me.title].filter(Boolean).join(' · '), planText(state.me)]
                    .filter(Boolean).join('\n')}
                </Text>
              )}
            </View>
            {state.kind === 'ready' && <Bell count={unread} onPress={() => setBell(true)} />}
            {state.kind === 'ready' ? (
              <Pressable onPress={() => setSettings(true)} accessibilityRole="button" accessibilityLabel="Ayarlar" hitSlop={6}
                style={({ pressed }) => [styles.profile, pressed && { opacity: 0.8 }]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{initials(state.me.name)}</Text>
                </View>
                {width >= 720 && <Text style={styles.profileName} numberOfLines={1}>{state.me.name}</Text>}
                <Ionicons name="settings-outline" size={16} color={colors.muted} />
              </Pressable>
            ) : (
              <Pressable onPress={logout} accessibilityLabel="Çıkış yap" hitSlop={8} style={styles.iconBtn}>
                <Ionicons name="log-out-outline" size={20} color={colors.navy} />
              </Pressable>
            )}
          </View>

          {(state.kind === 'loading' || state.kind === 'not_clinician' || (state.kind === 'ready' && (survey === 'unknown' || legal === 'unknown'))) && <ActivityIndicator color={colors.navy} style={{ marginTop: 40 }} />}
          {state.kind === 'not_installed' && (
            <Notice icon="construct-outline" text="Klinik veritabanı henüz kurulmadı. Klinik SQL'i Supabase'e uygulanınca bu panel açılır." />
          )}
          {state.kind === 'error' && <Notice icon="alert-circle-outline" text={`Yüklenemedi: ${state.message}`} />}

          <ConfigBanner />
          {state.kind === 'ready' && survey !== 'unknown' && legal !== 'unknown' && (
            <>
              <MembershipRow me={state.me} onOpen={() => setPlans(true)} />
              {!!verification?.enabled && <VerificationRow v={verification} onOpen={() => setVerify(true)} />}
              {start && !start.hidden && !(start.sampleSeen && (inviteCount > 0 || state.clients.length > 0)) && (
                <StartCard sampleSeen={start.sampleSeen} invited={inviteCount > 0 || state.clients.length > 0}
                  onSample={openSample} onInvite={inviteFirst}
                  onHide={() => { if (meId) hideStart(meId); setStart((s) => (s ? { ...s, hidden: true } : s)); track('start.hide'); }} />
              )}
              <ClientList clients={state.clients} unread={unreadByChild} me={state.me} team={state.team}
                onOpen={(c) => setSelected({ client: c, tab: 'summary', key: Date.now() })} />
              {/* örnek aile listenin altında kendi satırında: ilk açılıştan sonra 30 gün ya da × ile kaldırılana dek */}
              {(state.clients.length === 0 || !!start?.sampleRow) && (
                <SampleRow onOpen={openSample} onHide={state.clients.length === 0 ? undefined : () => {
                  if (meId) hideSample(meId);
                  setStart((s) => (s ? { ...s, sampleRow: false } : s));
                  track('sample.hide');
                }} />
              )}
              <InvitesCard me={state.me} team={state.team} reloadKey={invitesKey} openKey={inviteOpenKey} onChanged={refresh} onCount={setInviteCount} />
              {!solo && (
                <Pressable onPress={() => setSettings(true)} accessibilityRole="button"
                  style={({ pressed }) => [styles.member, { marginTop: 16 }, pressed && { opacity: 0.8 }]}>
                  <Ionicons name="people-outline" size={20} color={colors.navy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberTitle}>{`Ekip · ${state.team.length} uzman`}</Text>
                    <Text style={styles.small}>{state.me.role === 'owner' ? 'Ekip kodu, koltuklar ve üyeler Ayarlar\'da' : 'Ekip üyeleri Ayarlar\'da'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                </Pressable>
              )}
              <Text style={styles.footnote}>
                Bu panel gözlem toplar, tanı koymaz. Ebeveyn paylaşımı istediği an durdurabilir; o an erişim biter.
                {' '}ClinicApp acil yardım hizmeti değildir; acil durumda 112'yi ara.
              </Text>
              <View style={styles.accountLinks}>
                <Pressable onPress={() => setGuide(true)} hitSlop={8} accessibilityRole="button"><Text style={styles.link}>Nasıl kullanılır?</Text></Pressable>
                <Pressable onPress={() => setSettings(true)} hitSlop={8}><Text style={styles.link}>Ayarlar</Text></Pressable>
              </View>
            </>
          )}
        </View>
      </ScrollView>
      <NotificationsSheet visible={bell} onClose={() => setBell(false)} onOpen={openTarget} />
      <VerificationSheet visible={verify} onClose={() => { setVerify(false); loadVerify(); }} />
      <Onboarding visible={guide} onClose={() => { setGuide(false); if (meId) markOnboardingSeen(meId); }} />
      {legalSheets}
    </SafeAreaView>
  );
}

// Danışan listesi: aynı adlı çocuklar ebeveyn adıyla ayırt edilir; çok danışanda ad / ebeveyn / etiketle arama
// Sağda: okunmamış bildirim zili (sayılı) + ok. Çok danışanda içine girmeden hangisinde bildirim olduğu görünür.
function ClientList({ clients, unread, me, team, onOpen }: {
  clients: Client[]; unread: Record<string, number>; me: ClinicianMe; team: Member[]; onOpen: (c: Client) => void;
}) {
  const [q, setQ] = useState('');
  const query = q.trim().toLocaleLowerCase('tr');
  const shown = query
    ? clients.filter((c) => `${c.child_name} ${c.parents} ${c.label}`.toLocaleLowerCase('tr').includes(query))
    : clients;
  return (
    <>
      <Label>{`Danışanlar (${clients.length})`}</Label>
      {clients.length === 0 ? (
        <Notice icon="people-outline" text={me.role === 'member'
          ? 'Henüz danışanın yok. Aileyi davet et ya da klinik sahibinin atamasını bekle.'
          : 'Henüz danışanın yok. Aileyi davet et; ebeveyn onaylayınca çocuk burada görünür.'} />
      ) : (
        <>
          {clients.length > 3 && (
            <View style={styles.search}>
              <Ionicons name="search" size={18} color={colors.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Çocuk ya da ebeveyn adı ara" placeholderTextColor={colors.muted}
                style={{ flex: 1, fontSize: 15, color: colors.navy }} autoCorrect={false} />
            </View>
          )}
          <View style={styles.list}>
            {shown.length === 0 && <Text style={[styles.small, { padding: 16 }]}>Sonuç bulunamadı.</Text>}
            {shown.map((c, i) => (
              <Pressable key={c.link_id} onPress={() => onOpen(c)} accessibilityRole="button"
                style={({ pressed }) => [styles.row, i > 0 && styles.rowLine, pressed && { backgroundColor: '#F7F8FA' }]}>
                <View style={styles.initial}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: colors.navy }}>{(c.child_name || '?').slice(0, 1).toLocaleUpperCase('tr-TR')}</Text>
                </View>
                <View style={{ flex: 1, gap: 2 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <Text style={styles.clientName}>{c.child_name || 'Adsız'}</Text>
                    {!!c.label && <Text style={styles.tag} numberOfLines={1}>{c.label}</Text>}
                  </View>
                  {!!c.parents && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <Ionicons name="person-outline" size={13} color={colors.muted} />
                      <Text style={styles.parents} numberOfLines={1}>{c.parents}</Text>
                    </View>
                  )}
                  <Text style={styles.small}>
                    Ebeveyn onayı: {dateText(c.consent_at)}
                    {me.role === 'owner' && team.length > 1 && c.clinician_id && c.clinician_id !== me.id ? ` · Sorumlu: ${c.clinician_name || 'ekip üyesi'}` : ''}
                    {me.role === 'member' && c.clinician_id !== me.id && (c.assigned ?? []).includes(me.id) ? ' · Sana atandı' : ''}
                  </Text>
                </View>
                <Bell count={unread[c.child_id] ?? 0} small />
                <Ionicons name="chevron-forward" size={18} color={colors.faint} />
              </Pressable>
            ))}
          </View>
        </>
      )}
    </>
  );
}

// Üyelik özeti: denemede kalan gün, pakette yenileme tarihi; dokununca üyelik ekranı
function MembershipRow({ me, onOpen }: { me: ClinicianMe; onOpen: () => void }) {
  const st = billingStatus(me);
  const left = daysLeft(me.trial_ends_at);
  const urgent = st === 'trial' && left <= 2;
  return (
    <Pressable onPress={onOpen} accessibilityRole="button"
      style={({ pressed }) => [styles.member, urgent && { backgroundColor: '#FFF3D6' }, pressed && { opacity: 0.8 }]}>
      <Ionicons name={st === 'trial' ? 'time-outline' : 'ribbon-outline'} size={20} color={colors.navy} />
      <View style={{ flex: 1 }}>
        <Text style={styles.memberTitle}>{st === 'trial' ? `Ücretsiz deneme: ${left} gün kaldı` : `Üyelik: ${packageName(me)}`}</Text>
        <Text style={styles.small}>{st === 'trial'
          ? (me.role === 'owner' ? 'Paketleri ve fiyatları gör' : 'Üyeliği klinik sahibi yönetir')
          : planText(me)}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

// Belge incelemesi (ortak akislar.md 14): rozet varsa kısa satır, yoksa ailelere görünen rozete çağrı
function VerificationRow({ v, onOpen }: { v: VerificationState; onOpen: () => void }) {
  const st = v.last?.status;
  const icon = v.verified_at ? 'shield-checkmark' : st === 'pending' && v.last?.submitted ? 'hourglass-outline' : 'shield-outline';
  const title = v.verified_at ? `Belgesi incelendi: ${v.verified_label}`
    : st === 'pending' && v.last?.submitted ? 'Belgen incelemede'
    : st && ['rejected', 'auto_rejected', 'suspended'].includes(st) ? 'Belgeni yeniden yükle' : 'Belgeni yükle';
  const sub = v.verified_at ? 'Ailelerin davet ekranında görünür'
    : st === 'pending' && v.last?.submitted ? 'Ekibimiz inceleyince bildirim gelir'
    : 'Ailelere "Belgesi incelendi" rozeti görünsün';
  return (
    <Pressable onPress={onOpen} accessibilityRole="button"
      style={({ pressed }) => [styles.member, v.verified_at && { backgroundColor: '#E6F4EA' }, pressed && { opacity: 0.8 }]}>
      <Ionicons name={icon} size={20} color={v.verified_at ? colors.ok : colors.navy} />
      <View style={{ flex: 1 }}>
        <Text style={styles.memberTitle}>{title}</Text>
        <Text style={styles.small}>{sub}</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.faint} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 16, flexGrow: 1 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  brand: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '700', color: colors.navy, marginTop: 6 },
  subtitle: { fontSize: 13, color: colors.muted, marginTop: 6, lineHeight: 19 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  profile: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.pill, paddingLeft: 3, paddingRight: 10, height: 36, maxWidth: 240 },
  avatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  profileName: { fontSize: 13, fontWeight: '600', color: colors.navy, flexShrink: 1 },
  small: { fontSize: 12, color: colors.muted, marginTop: 2 },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  initial: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.today, alignItems: 'center', justifyContent: 'center' },
  list: { backgroundColor: '#fff', borderRadius: radius.md, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  rowLine: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.line },
  parents: { fontSize: 13, color: colors.text, flexShrink: 1 },
  tag: { fontSize: 11, fontWeight: '600', color: colors.navy, backgroundColor: colors.today, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999, overflow: 'hidden', maxWidth: 180 },
  search: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: radius.md, paddingHorizontal: 14, height: 44, marginBottom: 8 },
  clientName: { fontSize: 15, fontWeight: '600', color: colors.text },
  footnote: { fontSize: 11, color: colors.muted, marginTop: 24, lineHeight: 16 },
  accountLinks: { flexDirection: 'row', flexWrap: 'wrap', columnGap: 24, rowGap: 12, marginTop: 20 },
  member: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: colors.today, borderRadius: radius.md, padding: 14, marginTop: 8 },
  memberTitle: { fontSize: 14, fontWeight: '700', color: colors.navy },
});
