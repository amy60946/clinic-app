import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, ActivityIndicator, RefreshControl, Platform, AppState, useWindowDimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { LayoutToggle, useLayout } from '../lib/layout';
import { TabBarProvider, TabBarScrollView, type TabId } from '../lib/tabBar';
import LiquidTabBar from '../components/LiquidTabBar';
import { colors, radius } from '../theme';
import { Label, Notice } from '../components/ui';
import { useAuth } from '../lib/auth';
import {
  clinicianMe, listClients, listTeam, deleteAccount, familyKeepsRecords, ClinicNotInstalled, ClinicianMe, Client, Member,
} from '../lib/clinic';
import SettingsScreen from './SettingsScreen';
import { WorkspaceSheet, TeamRequestsCard, PERSONAL_LABEL, TEAM_LABEL } from './WorkspaceSheet';
import { useWorkspace } from '../lib/workspace';
import CalendarScreen from './calendar/CalendarScreen';
import LibraryScreen from './training/Library';
import { loadSessions } from '../lib/sessions';
import { trDay, trToIso, timeRange, isClosed, type Session } from '../lib/sessionCore';
import { CoachProvider, CoachOverlay } from '../lib/coach';
import { StartCard, SampleRow, TOUR, TRAINING_TOUR, BASIC_TOUR, StartFlags, StartMode, StartProgress, startFlags, startDone, startTotal, markSampleSeen, hideStart, hideSample } from './SampleTour';
import { useClientConfig, CARE_PLAN_FLAG, PARENT_TRAINING_FLAG } from '../lib/clientConfig';
import { resetSampleTraining } from '../lib/trainingSample';
import type { Attention } from '../lib/attention';
import { sampleClient } from '../lib/sample';
import { isoDate } from '../lib/metrics';
import MembershipScreen from './MembershipScreen';
import { ConfigBanner } from './ConfigGate';
import InvitesCard from './invite/InvitesCard';
import VerificationSheet from './VerificationSheet';
import { VerificationState, loadVerification } from '../lib/verification';
import Onboarding, { onboardingSeen, markOnboardingSeen } from './Onboarding';
import HelpSheet, { HelpAction } from './HelpSheet';
import WelcomeSurvey, { SurveyAction } from './WelcomeSurvey';
import { deleteAccountText } from '../lib/accountDelete';
import { surveyAnswered } from '../lib/survey';
import { LegalDoc, legalPending } from '../lib/legal';
import LegalSheet from './legal/LegalSheet';
import LegalUpdateScreen from './legal/LegalUpdateScreen';
import { billingStatus, hasAccess, daysLeft, packageName, packageOfProduct } from '../lib/billing';
import ClientScreen, { Tab } from './client/ClientScreen';
import NotificationsSheet, { notificationTab } from './NotificationsSheet';
import Bell from '../components/Bell';
import ClientBoard from './ClientBoard';
import { useNotifications } from '../lib/notificationsContext';
import { AppNotification, notificationChildren, onNotificationTap, unregisterPush } from '../lib/notifications';
import { track, flush } from '../lib/track';
import { supabase } from '../lib/supabase';
import { CANCEL_FLOW_FLAG } from '../lib/cancelFlow';
import { useStoreSubscription, openAppleSubscriptions } from '../lib/storeState';
import { BillingBanner } from './membership/StoreNotices';
import { useNudges, NUDGES_FLAG, serverNudgesOn, nudgeTarget, syncNudgePref, primerDue, markNudgeOpened, clearNudges } from '../lib/nudges';
import { NudgePrimer } from './NudgeParts';
import type { FamilyInvite } from '../lib/invites';
import type { Training } from '../lib/training';
import { errorText } from '../lib/errors';

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
  const ws = useWorkspace();
  const [wsOpen, setWsOpen] = useState(false);          // çalışma alanı seçici (ortak akislar.md 21)
  const [reqKey, setReqKey] = useState(0);              // ekibe katılma istekleri yenilensin
  const [state, setState] = useState<State>({ kind: 'loading' });
  const stateRef = useRef(state);
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<{ client: Client; tab: Tab; key: number } | null>(null);
  const [attention, setAttention] = useState<Record<string, Attention> | null>(null);
  const [bell, setBell] = useState(false);
  const [plans, setPlans] = useState(false);
  const [guide, setGuide] = useState(false);
  const [help, setHelp] = useState(false);          // "Nasıl kullanılır?" (kısa tanıtım + kısa yanıtlar)
  const [helpFocus, setHelpFocus] = useState<string | null>(null);   // açılırken açık gelecek soru
  const [invitesKey, setInvitesKey] = useState(0);
  const [verify, setVerify] = useState(false);
  const [verification, setVerification] = useState<VerificationState | null>(null);
  // Karşılama anketi (ortak akislar.md 15): cevap yoksa ilk girişte bir kez; bitince seçilen ilk adım
  const [survey, setSurvey] = useState<'unknown' | 'show' | 'hidden'>('unknown');
  const [inviteOpenKey, setInviteOpenKey] = useState(0);
  const [inviteOpenCode, setInviteOpenCode] = useState<string | null>(null);   // "süresi doluyor" hatırlatması: o davetin penceresi
  const skipGuide = useRef(false);
  // Ayarlar (sağ üstteki ad), örnek aile + tur, "Başlarken" kartı
  const [settings, setSettings] = useState(false);
  // Takvim (ortak akislar.md 20): ana ekrandan; seans bildirimi o seansı açar
  const [calendar, setCalendar] = useState<{ sessionId?: string | null } | null>(null);
  const calendarOpen = useRef(false);
  calendarOpen.current = !!calendar;
  // Ebeveyn eğitimi kaynak kütüphanesi (9 Kasım 2026): ana ekrandan; atanınca danışanın Ebeveyn Eğitimi bölümü açılır
  const [library, setLibrary] = useState(false);
  const [todaySessions, setTodaySessions] = useState<Session[] | null>(null);
  const [sampleOpen, setSampleOpen] = useState(false);
  const [sampleTab, setSampleTab] = useState<Tab>('summary');     // "Göster" örnek ailede bir bölümü açar (tur olmadan)
  const [tourStep, setTourStep] = useState<number | null>(null);
  // Lansman odağı "A" (11 Kasım 2026): Takip Planı uzaktan ayar bayrağı açık değilse tur, Başlarken ve danışanın açılış bölümü ebeveyn eğitimine göre
  const config = useClientConfig();
  const planOn = config.flag(CARE_PLAN_FLAG);
  // Ebeveyn eğitimi bayrağı (23 Kasım 2026): kapalıyken kütüphane, eğitim maddeleri ve eğitim turu yok; danışan Ev Rutinleri'nde açılır
  const trainingOn = config.flag(PARENT_TRAINING_FLAG);
  const startMode: StartMode = planOn ? 'plan' : trainingOn ? 'training' : 'basic';
  // İptal öncesi akış ve yaşam döngüsü hatırlatmaları (uzaktan ayar; yoksa kapalı)
  const cancelFlow = config.flag(CANCEL_FLOW_FLAG);
  // Hatırlatmalar iki yoldan: cihaz içi (`lifecycle_nudges`) ya da sunucu motoru (`nudges_server_clinic` / `nudges_server`).
  // Sunucu açıkken cihaz içi planlama yapılmaz (çift bildirim olmasın); izin açıklaması ve Ayarlar › Bildirimler ikisinde de görünür.
  const serverNudges = serverNudgesOn(config.flags);
  const nudgesOn = config.flag(NUDGES_FLAG) || serverNudges;
  const localNudges = config.flag(NUDGES_FLAG) && !serverNudges;
  const [primer, setPrimer] = useState(false);          // bildirim izni açıklaması (ilk davetten sonra)
  // hatırlatma planı ana ekranın zaten yüklediği listeleri kullanır (undefined: henüz yüklenmedi)
  const [nudgeInvites, setNudgeInvites] = useState<FamilyInvite[] | null | undefined>(undefined);
  const [nudgeTrainings, setNudgeTrainings] = useState<Training[] | null | undefined>(undefined);
  const tour = planOn ? TOUR : trainingOn ? TRAINING_TOUR : BASIC_TOUR;
  const homeTab: Tab = planOn ? 'summary' : trainingOn ? 'training' : 'routine';
  const [trainStat, setTrainStat] = useState<{ any: boolean; active: boolean }>({ any: false, active: false });
  const [start, setStart] = useState<StartFlags | null>(null);
  const [inviteCount, setInviteCount] = useState(0);
  const { width } = useWindowDimensions();
  const { desktop } = useLayout();
  // Yasal metinler (ortak akislar.md 17): onay bekleyen varsa panel yerine yeniden onay ekranı. null: sunucuda yok
  const [legal, setLegal] = useState<'unknown' | LegalDoc[] | null>('unknown');
  // Yasal ve gizlilik (tek sayfa; KVKK başvurusu içinde): false ya da açılacak görünüm
  const [legalOpen, setLegalOpen] = useState<false | 'docs' | 'kvkk'>(false);
  const legalAt = useRef(0);
  const { unread, unreadByChild } = useNotifications();
  const pending = useRef<Pick<AppNotification, 'kind' | 'data' | 'childId'> | null>(null);
  const userId = session?.user.id ?? null;
  const ready = state.kind === 'ready' ? state : null;
  // App Store'da ödeme sorunu: yalnız sahibe, ana ekranda tek satır (üyelik ekranında başlıklı)
  const { sub: storeSub, refresh: refreshStoreSub } = useStoreSubscription(ready && ready.me.role === 'owner' ? ready.me.id : null, cancelFlow);
  // Hatırlatmalar: bayrak uzaktan ayar okununca belli olur (o âna kadar hiçbir şey planlanmaz ya da silinmez)
  useNudges(config.status === 'ok' ? localNudges : null,
    ready ? { me: ready.me, clients: ready.clients, signedUpAt: session?.user.created_at ?? ready.me.joined_at ?? null } : null,
    nudgeInvites, trainingOn ? nudgeTrainings : null);
  // "Hatırlatmalar ve ipuçları" tercihi sunucudan (başka cihazda değişmiş olabilir; işlev yoksa sessiz)
  useEffect(() => { if (userId && config.status === 'ok' && nudgesOn) syncNudgePref(userId); }, [userId, config.status, nudgesOn]);

  const refreshToday = useCallback(() => {
    const d = trDay(new Date().toISOString());
    loadSessions(trToIso(d, '00:00'), trToIso(d, '23:59')).then(setTodaySessions).catch(() => setTodaySessions(null));
  }, []);
  useEffect(() => { refreshToday(); }, [refreshToday]);

  const load = useCallback(async (): Promise<State> => {
    let next: State;
    try {
      const me = await clinicianMe();
      if (me?.workspace_invalid && ws.id) { ws.switchTo(null); return { kind: 'loading' }; }   // ayrıldı / çıkarıldı
      if (!me) next = { kind: 'not_clinician' };
      else {
        const [clients, team] = await Promise.all([listClients(), listTeam()]);
        next = { kind: 'ready', me, clients, team };
      }
    } catch (e) {
      next = e instanceof ClinicNotInstalled ? { kind: 'not_installed' } : { kind: 'error', message: errorText(e) };
    }
    setState(next);
    stateRef.current = next;
    return next;
  }, [ws]);

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
  // danışandan dönünce Başlarken yeniden okunur (rapor açıldı mı)
  useEffect(() => { if (meId && !selected) startFlags(meId).then(setStart); }, [selected]); // eslint-disable-line react-hooks/exhaustive-deps
  const sample = useMemo(() => (sampleOpen ? sampleClient(isoDate(new Date())) : null), [sampleOpen]);
  const openSample = (tab?: Tab) => {
    setSettings(false);
    resetSampleTraining();
    setSampleOpen(true);
    setSampleTab(tab ?? homeTab);
    setTourStep(tab ? null : 0);
    track('sample.open');
    if (meId) markSampleSeen(meId);
    setStart((s) => (s ? { ...s, sampleSeen: true } : s));
  };
  // Başlarken: gerçek duruma göre beş adım; "İlk hedefi ekle / Aileye gönder / İlk raporu aç" uygun ilk danışanı açar
  const clientList = state.kind === 'ready' ? state.clients : [];
  const attRows = Object.values(attention ?? {});
  const progressOf = (f: StartFlags): StartProgress => ({
    sampleSeen: f.sampleSeen, invited: inviteCount > 0 || clientList.length > 0, hasClient: clientList.length > 0,
    planned: planOn ? attRows.some((a) => a.goals_active > 0 || !!a.plan_published_at) : trainStat.any,
    published: planOn ? attRows.some((a) => !!a.plan_published_at) : trainStat.active, report: f.report,
  });
  const openFirst = (step: 'plan' | 'publish' | 'report') => {
    const att = (c: Client) => attention?.[c.link_id];
    const pick = step === 'plan' ? clientList.find((c) => !att(c)?.goals_active)
      : step === 'publish' ? clientList.find((c) => (att(c)?.plan_unsent ?? 0) + (att(c)?.drafts ?? 0) > 0) : undefined;
    const c = pick ?? clientList[0];
    if (!c) return;
    track('start.step', { step });
    setSelected({ client: c, tab: step === 'report' ? 'report' : planOn ? 'goals' : trainingOn ? 'training' : 'routine', key: Date.now() });
  };
  // "Nasıl kullanılır?" › Göster: gerçek danışan varsa ilkinde, yoksa örnek ailede açar (iOS'ta pencere kapanınca)
  const afterSheet = (f: () => void) => { setHelp(false); setHelpFocus(null); if (Platform.OS === 'ios') setTimeout(f, 450); else f(); };
  const onHelpAction = (a: HelpAction) => afterSheet(() => {
    if (a === 'home') return;
    if (a === 'invite') return inviteFirst();
    if (a === 'team') return setSettings(true);
    const tab: Tab = a === 'routine' ? 'routine' : a === 'plan' ? (planOn ? 'goals' : trainingOn ? 'training' : 'routine') : 'report';
    const c = clientList[0];
    if (c) setSelected({ client: c, tab, key: Date.now() });
    else openSample(tab);
  });
  const inviteFirst = () => {
    setSampleOpen(false);
    setTourStep(null);
    setSettings(false);
    setInviteOpenCode(null);
    setInviteOpenKey(Date.now());
  };
  // Davet gönderildi ve pencere kapandı: bayrak açıksa ve iOS izni hiç sorulmadıysa önce kendi açıklamamız (iOS'ta pencere kapanınca)
  const afterInvite = async () => {
    if (!nudgesOn || !userId || !(await primerDue(userId))) return;
    setTimeout(() => setPrimer(true), Platform.OS === 'ios' ? 500 : 0);
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
      // İlk giriş (kullanıcı isteği 3 Kasım 2026): bilgilendirme örnek aile üzerinde, yaptırarak (tur); 4 ekranlık tanıtım "Nasıl kullanılır?"da
      markOnboardingSeen(meId);
      if (noClients) openSample();
    });
  }, [meId, survey]); // eslint-disable-line react-hooks/exhaustive-deps
  // Anket bitti: davet ya da paket seçildiyse rehber bu açılışta gösterilmez (danışan yoksa sonraki açılışta gelir)
  const finishSurvey = (action: SurveyAction) => {
    if (action === 'invite' || action === 'plans') skipGuide.current = true;
    setSurvey('hidden');
    if (action === 'invite') { setInviteOpenCode(null); setInviteOpenKey(Date.now()); }
    if (action === 'plans') setPlans(true);
    if (action === 'joined') load();
  };
  // Açık kalmış uzman olmayan oturum (ör. ParentApp hesabı): kapatılır, kayıt ekranı açılır
  useEffect(() => { if (state.kind === 'not_clinician') rejectAccount(); }, [state.kind, rejectAccount]);

  // Bildirime dokununca ilgili danışan ve sekme. Danışan listede yoksa (yeni paylaşım) liste yenilenip tekrar aranır.
  const openTarget = useCallback(async (n: Pick<AppNotification, 'kind' | 'data' | 'childId'>) => {
    setBell(false);
    // hangi sekme ya da ekran açıksa (Takvim, Kütüphane, Ayarlar, Üyelik) kapanır: hedef her yerden açılır
    setSettings(false);
    setLibrary(false);
    if (calendarOpen.current) refreshToday();   // takvimden çıkılıyor: ana ekrandaki "bugün" satırı yenilenir (Geri ve alt menü gibi)
    setCalendar(null);
    setPlans(false);
    setSampleOpen(false);
    setTourStep(null);
    const cur = stateRef.current;
    const target = (n.data as { clinic_id?: string } | null)?.clinic_id;
    if (target && cur.kind === 'ready' && cur.me.workspaces !== undefined && target !== cur.me.clinic_id) { ws.switchTo(target, n); return; }
    // Hatırlatma (cihaz içi lib/nudges.ts ya da sunucu motoru, ikisi de kind 'nudge', aynı data.nudge türleri): davet türleri
    // davet penceresini, eğitim türleri o danışanın Ebeveyn Eğitimi'ni, deneme üyelik ekranını açar (nudgeCore.nudgeTarget)
    if (n.kind === 'nudge') {
      const { type, code, linkId } = nudgeTarget(n.data);
      setSelected(null);
      if (type === 'trial_ending') { setPlans(true); return; }
      if (type === 'invite_none' || type === 'invite_expiring') { setInviteOpenCode(code); setInviteOpenKey(Date.now()); return; }
      if (!linkId) return;
      let st = stateRef.current;
      let c = st.kind === 'ready' ? st.clients.find((x) => x.link_id === linkId) : undefined;
      if (!c) { st = await load(); c = st.kind === 'ready' ? st.clients.find((x) => x.link_id === linkId) : undefined; }
      if (c) setSelected({ client: c, tab: 'training', key: Date.now() });
      return;
    }
    if (n.kind === 'team_request') { setSelected(null); load(); setReqKey((k) => k + 1); return; }
    if (n.kind === 'team_removed' || n.kind === 'team_left' || n.kind === 'team_request_declined') { setSelected(null); load(); return; }
    if (n.kind === 'team_joined') { setSelected(null); load(); return; }
    if (n.kind.startsWith('session_')) { setSelected(null); setCalendar({ sessionId: (n.data as { session_id?: string } | null)?.session_id ?? null }); return; }
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
  }, [load, ws, refreshToday]);

  // Telefon bildirimine dokunma (uygulama kapalıyken de)
  useEffect(() => onNotificationTap((data) => {
    const n = { kind: String(data.kind ?? ''), data, childId: typeof data.child_id === 'string' ? data.child_id : undefined };
    if (n.kind === 'nudge') {
      track('nudge.open', { type: String(data.nudge ?? '') });
      if (userId) markNudgeOpened(userId, String(data.id ?? ''));
    }
    if (stateRef.current.kind === 'ready') openTarget(n);
    else pending.current = n;
  }), [openTarget, userId]);
  useEffect(() => {
    if (state.kind !== 'ready') return;
    const moved = ws.takePending();           // alan değiştiren bildirim, yeni alanda açılır
    if (moved) { openTarget({ kind: moved.kind, data: moved.data as AppNotification['data'], childId: moved.childId ?? undefined }); return; }
    if (pending.current) {
      const n = pending.current;
      pending.current = null;
      openTarget(n);
    }
  }, [state, openTarget, ws]);

  const refresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const logout = async () => {
    // Çıkmadan önce bekleyen kullanım olayları gönderilir ve bu cihaza push kapatılır
    await flush().catch(() => {});
    await unregisterPush().catch(() => {});
    if (userId) await clearNudges(userId);   // bu cihazda planlı hatırlatma kalmasın
    signOut();
  };
  // Metin hukuk/50 §5.2 (lib/accountDelete.ts): sunucu "ailenin kayıtları ailede kalır" kuralını uyguluyorsa yeni metin
  const removeAccount = async () => {
    const kind = state.kind === 'ready' && state.team.length <= 1 ? 'solo' : state.kind === 'ready' && state.me.role === 'owner' ? 'owner' : 'member';
    const keeps = kind === 'solo' ? await familyKeepsRecords() : false;
    Alert.alert('Hesabın silinsin mi?', deleteAccountText(kind, keeps), [{ text: 'Vazgeç', style: 'cancel' }, {
      text: 'Kalıcı olarak sil', style: 'destructive', onPress: async () => {
        try {
          await flush().catch(() => {});
          await unregisterPush().catch(() => {});
          if (userId) await clearNudges(userId);
          await deleteAccount();
          await supabase.auth.signOut({ scope: 'local' });
        } catch (e) {
          Alert.alert('Hesap silinemedi', errorText(e));
        }
      },
    }]);
  };
  const legalOn = Array.isArray(legal);
  const accountLinks = (
    <View style={styles.accountLinks}>
      {legalOn && <Pressable onPress={() => setLegalOpen('docs')} hitSlop={8}><Text style={styles.link}>Yasal ve gizlilik</Text></Pressable>}
      {state.kind === 'ready' && (state.me.workspaces ?? 1) > 1 && (
        <Pressable onPress={() => setWsOpen(true)} hitSlop={8}><Text style={styles.link}>Hesap değiştir</Text></Pressable>
      )}
      <Pressable onPress={logout} hitSlop={8}><Text style={styles.link}>Çıkış yap</Text></Pressable>
      <Pressable onPress={removeAccount} hitSlop={8}><Text style={[styles.link, { color: colors.danger }]}>Hesabı sil</Text></Pressable>
    </View>
  );
  const wsSheet = state.kind === 'ready' && state.me.workspaces !== undefined
    ? <WorkspaceSheet visible={wsOpen} me={state.me} onClose={() => setWsOpen(false)} /> : null;
  // Kabul edilen istek: bireysel alanda henüz danışan yoksa doğrudan o kliniğe geçilir, varsa sorulur
  const afterAccept = (r: { clinic_id: string; clinic: string }) => {
    if (state.kind !== 'ready') return;
    if (state.clients.length === 0) { ws.switchTo(r.clinic_id); return; }
    load();
    Alert.alert(`${r.clinic} ekibine katıldın`, 'Kliniğin danışanları ayrı bir ekip hesabında. Şimdi o hesaba geçilsin mi?', [
      { text: 'Sonra', style: 'cancel' }, { text: 'Geç', onPress: () => ws.switchTo(r.clinic_id) },
    ]);
  };
  // Yeniden onay ve üyelik ekranlarından da açılır (hukuk/50 bölüm 2: onay beklerken yasal metinler ve KVKK başvurusu açık)
  const legalSheets = (
    <>
      <LegalSheet visible={!!legalOpen} initial={legalOpen || 'docs'} email={session?.user.email ?? ''} onClose={() => setLegalOpen(false)} />
    </>
  );

  // Alt ana menü (kullanıcı isteği 17 Kasım 2026): dört ana ekranda (Danışanlar, Takvim, Kütüphane, Ayarlar) ve yalnız dar
  // düzende. Ekran seçimi bir işlevde toplandı: çubuk hepsinin üstünde, ağaçta aynı yerde durur; sekme değişince yeniden
  // kurulmaz, kapsül kayar. `tab` çizilen ekranın sekmesi (danışan, üyelik, yasal onay, anket ve yüklemede null: çubuk yok).
  let tab = null as TabId | null;
  const renderScreen = () => {
  if (state.kind === 'ready' && Array.isArray(legal) && legal.length > 0) {
    return <><LegalUpdateScreen docs={legal} onDone={setLegal} footer={accountLinks} />{legalSheets}</>;
  }

  // Deneme/üyelik bitti (ya da Bireysel pakette ekip üyesi): panel yerine üyelik ekranı
  if (state.kind === 'ready' && !hasAccess(state.me)) {
    return <><MembershipScreen me={state.me} blocking onChanged={load} footer={accountLinks} />{legalSheets}{wsSheet}</>;
  }
  if (state.kind === 'ready' && survey === 'show' && legal !== 'unknown') {
    return <WelcomeSurvey me={state.me} onFinish={finishSurvey} />;
  }
  if (plans && state.kind === 'ready') {
    return (
      <>
        <MembershipScreen me={state.me} onClose={() => { setPlans(false); load(); }} onChanged={load} footer={accountLinks}
          onHelp={() => { setPlans(false); load(); setHelpFocus('invite'); setHelp(true); }} />
        {legalSheets}
      </>
    );
  }

  if (sample && state.kind === 'ready') {
    const screen = (
      <ClientScreen
        client={sample.client} me={state.me} sample={sample.data} initialTab={tourStep !== null ? tour[tourStep].tab : sampleTab}
        focusTab={tourStep !== null ? tour[tourStep].tab : undefined}
        onBack={() => { setSampleOpen(false); setTourStep(null); }}
        onRevoked={() => setSampleOpen(false)}
        onOpenNotification={openTarget}
        overlay={tourStep !== null ? <CoachOverlay finalLabel="İlk aileni davet et" /> : undefined}
      />
    );
    // sağlayıcı tur kapalıyken de sarar: ağaç değişmez, örnekte yapılanlar tur kapanınca kaybolmaz
    return (
      <CoachProvider steps={tour} index={tourStep}
        onIndex={(i) => { if (i >= tour.length) setTourStep(null); else { setTourStep(i); track('sample.tour_step', { step: tour[i].key }); } }}
        onClose={(i) => { setTourStep(null); track('sample.tour', { step: tour[i]?.key ?? i }); }}
        onFinish={() => { track('sample.tour_done'); inviteFirst(); }}>
        {screen}
      </CoachProvider>
    );
  }

  if (library && trainingOn && state.kind === 'ready') {
    tab = 'library';
    return (
      <LibraryScreen me={state.me} clients={state.clients} onBack={() => setLibrary(false)}
        onOpenTraining={(c) => { setLibrary(false); setSelected({ client: c, tab: 'training', key: Date.now() }); }} />
    );
  }

  if (calendar && state.kind === 'ready') {
    tab = 'calendar';
    return (
      <CalendarScreen me={state.me} team={state.team} clients={state.clients} initialSessionId={calendar.sessionId}
        onBack={() => { setCalendar(null); refreshToday(); }}
        onOpenClient={(c, tab) => { setCalendar(null); setSelected({ client: c, tab, key: Date.now() }); }} />
    );
  }

  if (settings && state.kind === 'ready') {
    tab = 'settings';
    return (
      <>
        <SettingsScreen
          me={state.me} team={state.team} clients={state.clients} email={session?.user.email ?? ''}
          solo={state.me.personal ?? isSolo(state.me, state.team, session?.user.user_metadata?.practice)}
          onLeft={() => { setSettings(false); ws.switchTo(null); }}
          verified={!!verification?.verified_at} legalOn={Array.isArray(legal)}
          onBack={() => setSettings(false)} onChanged={load} onPlans={() => setPlans(true)}
          onOpenClient={(c) => { setSettings(false); setSelected({ client: c, tab: homeTab, key: Date.now() }); }}
          onSample={() => openSample()}
          onLegal={() => setLegalOpen('docs')}
          nudges={nudgesOn}
          onGuide={() => { setSettings(false); setHelp(true); }}
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

  const solo = state.kind === 'ready' && (state.me.personal ?? isSolo(state.me, state.team, session?.user.user_metadata?.practice));
  const canSwitch = state.kind === 'ready' && state.me.workspaces !== undefined;
  if (state.kind === 'ready' && survey !== 'unknown' && legal !== 'unknown') tab = 'clients';
  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      <TabBarScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.navy} />}
      >
        <View style={styles.column}>
          <View style={styles.headerWrap}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              {/* hesap seçimi bir hesap ayarı: köşede küçük düğme (kullanıcı kararı 5 Kasım 2026); başlık hesabın adı, ok yok */}
              <View style={styles.brandRow}>
                <Text style={styles.brand}>Moyo Mercek</Text>
                {canSwitch && state.kind === 'ready' && (
                  <Pressable onPress={() => setWsOpen(true)} accessibilityRole="button" hitSlop={8}
                    accessibilityLabel={`Hesap: ${state.me.personal ? PERSONAL_LABEL : TEAM_LABEL}. Değiştir`}
                    style={({ pressed }) => [styles.account, pressed && { opacity: 0.7 }]}>
                    <Text style={styles.accountText} numberOfLines={1}>{state.me.personal ? PERSONAL_LABEL : TEAM_LABEL}</Text>
                    <Ionicons name="chevron-down" size={12} color={colors.muted} />
                  </Pressable>
                )}
              </View>
              <Text style={styles.title}>{state.kind === 'ready' ? (state.me.personal ? state.me.name : state.me.clinic) : 'Uzman paneli'}</Text>
            </View>
            {state.kind === 'ready' && <LayoutToggle />}
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
          {/* alt satır düğmelerin altında tam genişlikte: telefonda dar sütunda kırılmasın */}
          {state.kind === 'ready' && (
            <Text style={styles.subtitle}>
              {[[!state.me.personal && state.me.name !== state.me.clinic && state.me.name, state.me.title,
                  !state.me.personal && state.me.workspaces !== undefined && (state.me.role === 'owner' ? 'Sahip' : 'Ekip üyesi')].filter(Boolean).join(' · '), planText(state.me)]
                .filter(Boolean).join('\n')}
            </Text>
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
              <TeamRequestsCard me={state.me} reloadKey={reqKey} onAccepted={afterAccept} />
              <MembershipRow me={state.me} onOpen={() => setPlans(true)} />
              {cancelFlow && state.me.role === 'owner' && !!storeSub?.billingIssueAt && (
                <BillingBanner compact solo={(packageOfProduct(storeSub.productId) ?? state.me.plan) === 'solo'}
                  onFix={async () => { track('membership.billing_fix'); await openAppleSubscriptions(state.me.id); refreshStoreSub(true); load(); }} />
              )}
              {!!verification?.enabled && <VerificationRow v={verification} onOpen={() => setVerify(true)} />}
              {start && !start.hidden && startDone(progressOf(start), startMode) < startTotal(startMode) && (
                <StartCard progress={progressOf(start)} mode={startMode} onSample={() => openSample()} onInvite={inviteFirst}
                  onPlan={() => openFirst('plan')} onPublish={() => openFirst('publish')} onReport={() => openFirst('report')}
                  onHide={() => { if (meId) hideStart(meId); setStart((s) => (s ? { ...s, hidden: true } : s)); track('start.hide', { done: startDone(progressOf(start), startMode) }); }} />
              )}
              <CalendarRow sessions={todaySessions} clients={state.clients} onOpen={() => setCalendar({})} />
              {/* dar düzende kütüphane alt menüde; satır yalnız geniş (sol menülü) düzende */}
              {desktop && trainingOn && <LibraryRow onOpen={() => setLibrary(true)} />}
              <ClientBoard clients={state.clients} unread={unreadByChild} me={state.me} team={state.team} onAttention={setAttention}
                plan={planOn} training={trainingOn} onTraining={setTrainStat} onTrainings={setNudgeTrainings}
                onOpen={(c) => setSelected({ client: c, tab: homeTab, key: Date.now() })} />
              {/* örnek aile listenin altında kendi satırında: ilk açılıştan sonra 30 gün ya da × ile kaldırılana dek */}
              {(state.clients.length === 0 || !!start?.sampleRow) && (
                <SampleRow onOpen={() => openSample()} onHide={state.clients.length === 0 ? undefined : () => {
                  if (meId) hideSample(meId);
                  setStart((s) => (s ? { ...s, sampleRow: false } : s));
                  track('sample.hide');
                }} />
              )}
              <InvitesCard me={state.me} team={state.team} reloadKey={invitesKey} openKey={inviteOpenKey} openCode={inviteOpenCode} onChanged={refresh} onCount={setInviteCount}
                onItems={setNudgeInvites} onInviteSent={afterInvite} />
              {!solo && (
                <Pressable onPress={() => setSettings(true)} accessibilityRole="button"
                  style={({ pressed }) => [styles.member, { marginTop: 16 }, pressed && { opacity: 0.8 }]}>
                  <Ionicons name="people-outline" size={20} color={colors.navy} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberTitle}>{`Ekip · ${state.team.length} uzman`}</Text>
                    <Text style={styles.small}>{state.me.role === 'owner' ? 'Uzman ekleme ve ekip üyeleri Ayarlar\'da' : 'Ekip üyeleri Ayarlar\'da'}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={18} color={colors.faint} />
                </Pressable>
              )}
              <Text style={styles.footnote}>
                Ebeveyn paylaşımı istediği an durdurabilir; o an erişim biter.
              </Text>
              <View style={styles.accountLinks}>
                <Pressable onPress={() => setHelp(true)} hitSlop={8} accessibilityRole="button"><Text style={styles.link}>Nasıl kullanılır?</Text></Pressable>
                <Pressable onPress={() => setSettings(true)} hitSlop={8}><Text style={styles.link}>Ayarlar</Text></Pressable>
              </View>
            </>
          )}
        </View>
      </TabBarScrollView>
      <NotificationsSheet visible={bell} onClose={() => setBell(false)} onOpen={openTarget} />
      <VerificationSheet visible={verify} onClose={() => { setVerify(false); loadVerify(); }} />
      <Onboarding visible={guide} plan={planOn} training={trainingOn} onClose={() => { setGuide(false); if (meId) markOnboardingSeen(meId); }} />
      {state.kind === 'ready' && (
        <HelpSheet visible={help} owner={state.me.role === 'owner'} plan={planOn} training={trainingOn} focus={helpFocus} onClose={() => { setHelp(false); setHelpFocus(null); }}
          onIntro={() => afterSheet(() => setGuide(true))} onSample={() => afterSheet(() => openSample())} onAction={onHelpAction} />
      )}
      {legalSheets}
      {wsSheet}
      {!!userId && <NudgePrimer visible={primer} userId={userId} onClose={() => setPrimer(false)} />}
    </SafeAreaView>
  );
  };
  const screen = renderScreen();
  const barOn = !desktop && tab !== null;
  const selectTab = (to: TabId) => {
    if (to === tab) return;
    track('tabbar.switch', { to });
    if (calendar) refreshToday();      // takvimden çıkarken ana ekrandaki "bugün" satırı yenilenir (Geri düğmesi gibi)
    setSelected(null);
    setLibrary(to === 'library');
    setCalendar(to === 'calendar' ? {} : null);
    setSettings(to === 'settings');
  };
  return (
    <TabBarProvider visible={barOn}>
      <View style={styles.root}>
        {screen}
        {barOn && tab !== null && <LiquidTabBar active={tab} onSelect={selectTab} hide={trainingOn ? [] : ['library']} />}
      </View>
    </TabBarProvider>
  );
}

// Üyelik özeti: denemede kalan gün, pakette yenileme tarihi; sahip dokununca üyelik ekranı.
// Ekip üyesi üyeliği yönetemez: satır yalnız bilgi (ok yok, dokunulmaz).
function MembershipRow({ me, onOpen }: { me: ClinicianMe; onOpen: () => void }) {
  const st = billingStatus(me);
  const left = daysLeft(me.trial_ends_at);
  const urgent = st === 'trial' && left <= 2;
  const owner = me.role === 'owner';
  const body = (
    <>
      <Ionicons name={st === 'trial' ? 'time-outline' : 'ribbon-outline'} size={20} color={colors.navy} />
      <View style={{ flex: 1 }}>
        <Text style={styles.memberTitle}>{st === 'trial' ? `Ücretsiz deneme: ${left} gün kaldı` : `Üyelik: ${packageName(me)}`}</Text>
        <Text style={styles.small}>{owner
          ? (st === 'trial' ? 'Paketleri ve fiyatları gör' : planText(me))
          : `${st === 'trial' ? '' : `${planText(me)} · `}Üyeliği klinik sahibi${me.owner_name ? ` (${me.owner_name})` : ''} yönetir`}</Text>
      </View>
      {owner && <Ionicons name="chevron-forward" size={18} color={colors.faint} />}
    </>
  );
  if (!owner) return <View style={[styles.member, urgent && { backgroundColor: '#FFF3D6' }]}>{body}</View>;
  return (
    <Pressable onPress={onOpen} accessibilityRole="button"
      style={({ pressed }) => [styles.member, urgent && { backgroundColor: '#FFF3D6' }, pressed && { opacity: 0.8 }]}>
      {body}
    </Pressable>
  );
}

// Belge incelemesi (ortak akislar.md 14): rozet varsa kısa satır, yoksa ailelere görünen rozete çağrı
// Ana ekranda takvim satırı: bugünün seansları ve sıradaki; seans tablosu yoksa da görünür (takvim kurulum notunu gösterir)
function CalendarRow({ sessions, clients, onOpen }: { sessions: Session[] | null; clients: Client[]; onOpen: () => void }) {
  const live = (sessions ?? []).filter((x) => !isClosed(x.status) && x.status !== 'offered');
  const next = live.find((x) => Date.parse(x.starts_at) + x.duration_min * 60e3 > Date.now());
  const name = next ? clients.find((c) => c.link_id === next.link_id)?.child_name ?? next.title ?? 'Blok' : '';
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" style={({ pressed }) => [styles.member, { marginTop: 12 }, pressed && { opacity: 0.8 }]}>
      <Ionicons name="calendar-outline" size={20} color={colors.navy} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.navy }}>Takvim</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>
          {sessions === null ? 'Seanslar, aileye randevu ve hatırlatma'
            : live.length === 0 ? 'Bugün seans yok'
            : `Bugün ${live.length} seans${next ? ` · sıradaki ${timeRange(next).slice(0, 5)} ${name}` : ''}`}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

// Ana ekranda kütüphane satırı (rakipteki üst menüdeki "Module library"nin karşılığı)
function LibraryRow({ onOpen }: { onOpen: () => void }) {
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" style={({ pressed }) => [styles.member, { marginTop: 8 }, pressed && { opacity: 0.8 }]}>
      <Ionicons name="library-outline" size={20} color={colors.navy} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '700', color: colors.navy }}>Kaynak kütüphanesi</Text>
        <Text style={{ fontSize: 12, color: colors.muted }}>Ebeveyn eğitimi: okuma, test ve açık uçlu sorular</Text>
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.muted} />
    </Pressable>
  );
}

function VerificationRow({ v, onOpen }: { v: VerificationState; onOpen: () => void }) {
  const st = v.last?.status;
  const icon = v.verified_at ? 'shield-checkmark' : st === 'pending' && v.last?.submitted ? 'hourglass-outline' : 'shield-outline';
  const title = v.verified_at ? `Belge yüklendi: ${v.verified_label}`
    : st === 'pending' && v.last?.submitted ? 'Belgen incelemede'
    : st && ['rejected', 'auto_rejected', 'suspended'].includes(st) ? 'Belgeni yeniden yükle' : 'Belgeni yükle';
  const sub = v.verified_at ? 'Ailelerin davet ekranında görünür'
    : st === 'pending' && v.last?.submitted ? 'Ekibimiz inceleyince bildirim gelir'
    : 'Ailelere "Uzman diploma belgesini yükledi" yazısı görünsün';
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
  root: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 16, flexGrow: 1 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  headerWrap: { marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  brand: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  brandRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', columnGap: 6, rowGap: 4 },
  account: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.line, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2, maxWidth: 200 },
  accountText: { fontSize: 11.5, fontWeight: '600', color: colors.muted, flexShrink: 1 },
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
