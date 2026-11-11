import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, ScrollView, Alert, StyleSheet, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '../theme';
import { Card, Label, Cta, Segmented } from '../components/ui';
import { clinicianMe, type ClinicianMe } from '../lib/clinic';
import {
  BillingPlan, Period, PACKAGES, commonTerms, yearlyGift, listPlans, tl, billingStatus, hasAccess, daysLeft, packageName,
} from '../lib/billing';
import * as store from '../lib/store';
import type { StorePrices, StoreResult } from '../lib/storeTypes';
import { track } from '../lib/track';
import { useLegalOn, openLegal } from '../lib/legal';

const APPLE_EULA = 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/';
const PRIVACY_URL = process.env.EXPO_PUBLIC_PRIVACY_URL;
const dateText = (iso: string) => new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' });
const SOURCE: Record<string, string> = { app_store: 'App Store', revenuecat: 'App Store', manual: 'klinik anlaşması' };
const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

// Satın almadan sonra üyeliği sunucu yazar (RevenueCat → billing-webhook, birkaç saniye): açılana dek kısa aralıkla bakılır
async function waitForServer(planOk: (me: ClinicianMe) => boolean): Promise<boolean> {
  for (let i = 0; i < 10; i++) {
    await wait(i ? 2500 : 1500);
    const me = await clinicianMe().catch(() => null);
    if (me && billingStatus(me) === 'active' && planOk(me)) return true;
  }
  return false;
}

// Üyelik ekranı (CANLIYA_ALMA 2.4). blocking: deneme/üyelik bitti, panel yerine bu ekran gösterilir (kapatılamaz).
// Satın alma yalnız klinik sahibinde ve iOS'ta (App Store, RevenueCat); web'de satış yok. Ekip üyesine fiyat gösterilmez.
export default function MembershipScreen({ me, blocking, onClose, onChanged, footer }: {
  me: ClinicianMe;
  blocking?: boolean;
  onClose?: () => void;
  onChanged: () => void;
  footer?: React.ReactNode;
}) {
  const [plans, setPlans] = useState<BillingPlan[]>([]);
  const [prices, setPrices] = useState<StorePrices | null | undefined>(undefined);   // undefined = yükleniyor
  const [reload, setReload] = useState(0);
  const [period, setPeriod] = useState<Period>(me.billing_period ?? 'yearly');
  const [busy, setBusy] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);   // ödeme alındı, sunucunun üyeliği açması bekleniyor
  const legalOn = useLegalOn();
  const status = billingStatus(me);
  const owner = me.role === 'owner';
  const ios = store.storeKind === 'app_store';
  const shop = ios && owner && store.storeEnabled;

  useEffect(() => { track('screen.membership', { status }); }, [status]);
  useEffect(() => {
    let on = true;
    setPrices(undefined);
    listPlans().then(async (ps) => {
      if (!on) return;
      setPlans(ps);
      if (!shop) return setPrices(null);
      const ids = ps.map((p) => p.apple_product_id).filter(Boolean) as string[];
      const pr = await store.storePrices(me.id, ids).catch(() => null);
      if (on) setPrices(pr);
    });
    return () => { on = false; };
  }, [shop, me.id, reload]);

  // Fiyat: iOS'ta yalnız mağazadan (sabit fiyat yazılmaz), web'de sunucudaki paket tablosundan
  const storePrice = (p: BillingPlan) => (p.apple_product_id ? prices?.[p.apple_product_id] : undefined);
  const priceOf = (p: BillingPlan) => (ios ? storePrice(p)?.priceString ?? null : p.price_try != null ? tl(p.price_try) : null);
  const amount = (p: BillingPlan | undefined) => (!p ? null : ios ? storePrice(p)?.price ?? null : p.price_try);
  const perMonth = (p: BillingPlan) => (p.period !== 'yearly' ? null
    : ios ? storePrice(p)?.perMonth ?? null : p.price_try != null ? tl(Math.round(p.price_try / 12)) : null);
  const giftOf = (pkg: string) => yearlyGift(amount(plans.find((p) => p.package === pkg && p.period === 'monthly')),
    amount(plans.find((p) => p.package === pkg && p.period === 'yearly')));
  const pkgs = [...new Set(plans.map((p) => p.package))];
  const gift = pkgs.length ? Math.min(...pkgs.map(giftOf)) : 0;   // iki pakette de doğru olan en küçük değer
  const current = (p: BillingPlan) => status === 'active' && me.plan === p.package && me.billing_period === p.period;

  // Satın alma ya da geri yüklemenin sonucu
  const after = async (r: StoreResult, planOk: (m: ClinicianMe) => boolean, okTitle: string, okText: string) => {
    if (r.ok) {
      setSyncing(true);
      const done = await waitForServer(planOk);
      setSyncing(false);
      onChanged();
      return done ? Alert.alert(okTitle, okText)
        : Alert.alert('Ödeme alındı', 'Üyeliğin birkaç dakika içinde açılır. Açılmazsa bu ekranda "Satın alımları geri yükle"ye dokun.');
    }
    if (r.reason === 'canceled') return;
    if (r.reason === 'pending') return Alert.alert('Ödeme onay bekliyor', 'Apple ödemeyi onaylayınca üyeliğin kendiliğinden açılır.');
    if (r.reason === 'none') return Alert.alert('Bu Apple hesabında ClinicApp üyeliği bulunamadı.');
    if (r.reason === 'unavailable') return Alert.alert('Bu paket şu an App Store\'da satın alınamıyor.', 'Biraz sonra yeniden dene.');
    if (r.reason === 'not_connected') return Alert.alert('App Store bağlantısı bu sürümde kapalı.');
    Alert.alert('İşlem tamamlanamadı', r.message || 'Biraz sonra yeniden dene.');
  };

  const choose = async (p: BillingPlan) => {
    if (!shop || !p.apple_product_id) return;
    if (p.package === 'solo' && (me.member_count ?? 1) > 1) {
      const ok = await new Promise<boolean>((res) => Alert.alert('Ekibin var',
        `Klinikte ${me.member_count} uzman var. Bireysel pakette yalnız sen panele erişirsin; ekip üyelerinin erişimi kapanır.`,
        [{ text: 'Vazgeç', style: 'cancel', onPress: () => res(false) }, { text: 'Yine de seç', onPress: () => res(true) }]));
      if (!ok) return;
    }
    track('membership.choose', { plan: p.id });
    setBusy(p.id);
    try {
      const r = await store.storePurchase(me.id, p.apple_product_id, me.clinic_id);
      if (r.ok) track('membership.purchased', { plan: p.id, source: 'revenuecat' });
      await after(r, (m) => m.plan === p.package, 'Üyeliğin başladı', `${PACKAGES[p.package].title} paketi etkin.`);
    } finally {
      setBusy(null);
    }
  };

  const restore = async () => {
    setBusy('restore');
    try {
      const r = await store.storeRestore(me.id, me.clinic_id);
      track('membership.restore', { found: r.ok });
      await after(r, () => true, 'Satın alımlar geri yüklendi', 'Üyeliğin bu hesapta etkin.');
    } finally {
      setBusy(null);
    }
  };

  const manage = () => {
    track('membership.manage');
    store.storeManage(me.id).catch(() => {});
  };

  const shown = plans.filter((p) => p.period === period);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.column}>
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.brand}>ClinicApp</Text>
              <Text style={styles.title}>Üyelik</Text>
            </View>
            {!blocking && onClose && (
              <Pressable onPress={onClose} accessibilityLabel="Kapat" hitSlop={8} style={styles.iconBtn}>
                <Ionicons name="close" size={20} color={colors.navy} />
              </Pressable>
            )}
          </View>

          <StatusCard me={me} status={status} owner={owner} />

          {!owner ? (
            <Text style={[styles.body, { marginTop: 12 }]}>
              Üyeliği klinik sahibi{me.owner_name ? ` (${me.owner_name})` : ''} yönetir.
            </Text>
          ) : (
            <>
              <View style={{ marginTop: 20 }}>
                <Segmented options={[{ id: 'monthly', label: 'Aylık' }, { id: 'yearly', label: gift ? `Yıllık · ${gift} ay hediye` : 'Yıllık' }]}
                  value={period} onChange={setPeriod} />
              </View>

              {shop && prices === null && (
                <View style={styles.notice}>
                  <Text style={[styles.body, { flex: 1 }]}>Paketler App Store'dan yüklenemedi. İnternet bağlantını kontrol edip yeniden dene.</Text>
                  <Pressable onPress={() => setReload((n) => n + 1)} hitSlop={8}><Text style={styles.link}>Yeniden dene</Text></Pressable>
                </View>
              )}
              {ios && !store.storeEnabled && (
                <Text style={[styles.small, { marginTop: 12 }]}>Bu sürümde App Store bağlantısı kapalı; üyelik bir sonraki sürümle alınabilir.</Text>
              )}

              <View style={styles.cards}>
                {shown.map((p) => (
                  <PlanCard key={p.id} plan={p} price={priceOf(p)} perMonth={perMonth(p)} current={current(p)}
                    loading={shop && prices === undefined} canBuy={shop && !!storePrice(p)}
                    busy={busy === p.id} disabled={!!busy && busy !== p.id} onChoose={() => choose(p)}
                    highlight={p.package === 'clinic'} />
                ))}
              </View>

              <Label>Her iki pakette</Label>
              <Card style={{ gap: 8 }}>
                {commonTerms(gift).map((t) => <Check key={t} text={t} />)}
              </Card>

              {status === 'active' && (me.billing_source === 'app_store' || me.billing_source === 'revenuecat') && !ios && (
                <Text style={[styles.small, { marginTop: 12 }]}>Üyeliğin App Store üzerinden alındı; iPhone/iPad'de Ayarlar › Apple Hesabı › Abonelikler'den yönetilir.</Text>
              )}

              {shop && (
                <View style={styles.links}>
                  <Pressable onPress={restore} disabled={!!busy} hitSlop={8}>
                    <Text style={styles.link}>{syncing ? 'Üyelik açılıyor…' : busy === 'restore' ? 'Geri yükleniyor…' : 'Satın alımları geri yükle'}</Text>
                  </Pressable>
                  <Pressable onPress={manage} hitSlop={8}><Text style={styles.link}>Aboneliği yönet</Text></Pressable>
                </View>
              )}

              <Text style={styles.legal}>
                {ios
                  ? 'Ödeme, onayladığında Apple hesabından alınır. Abonelik, dönem bitmeden en az 24 saat önce kapatılmazsa aynı süre ve ücretle otomatik yenilenir; yenileme ücreti dönem bitmeden önceki 24 saat içinde alınır. Ayarlar › Apple Hesabı › Abonelikler\'den yönetebilir ya da kapatabilirsin.'
                  : 'Üyeliği iPhone ya da iPad\'deki ClinicApp\'ten alabilirsin. Üyelik hesabına bağlıdır; web\'de de açılır.'}
              </Text>
            </>
          )}
          <View style={styles.links}>
            {ios && owner && <Pressable onPress={() => Linking.openURL(APPLE_EULA)} hitSlop={8}><Text style={styles.smallLink}>Kullanım Koşulları (EULA)</Text></Pressable>}
            {legalOn && <Pressable onPress={() => openLegal('sozlesme-uzman')} hitSlop={8}><Text style={styles.smallLink}>Uzman Hizmet Sözleşmesi</Text></Pressable>}
            {legalOn ? <Pressable onPress={() => openLegal('gizlilik')} hitSlop={8}><Text style={styles.smallLink}>Gizlilik Politikası</Text></Pressable>
              : !!PRIVACY_URL && <Pressable onPress={() => Linking.openURL(PRIVACY_URL)} hitSlop={8}><Text style={styles.smallLink}>Gizlilik Politikası</Text></Pressable>}
          </View>
          {footer}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function StatusCard({ me, status, owner }: { me: ClinicianMe; status: 'trial' | 'active' | 'expired'; owner: boolean }) {
  let icon: keyof typeof Ionicons.glyphMap = 'time-outline';
  let title = '';
  let text = '';
  if (status === 'trial') {
    const n = daysLeft(me.trial_ends_at);
    title = `Ücretsiz deneme · ${n} gün kaldı`;
    text = `${dateText(me.trial_ends_at)} tarihine kadar her şey açık. ${owner ? 'Sonra devam etmek için bir paket seç.' : 'Sonrası için paketi klinik sahibi seçer.'}`;
  } else if (status === 'active' && !hasAccess(me)) {
    icon = 'lock-closed-outline';
    title = 'Ekip erişimi kapalı';
    text = 'Klinik Bireysel pakete geçti; bu pakette yalnız klinik sahibi panele erişir. Klinik sahibi Klinik paketini seçince erişimin geri gelir.';
  } else if (status === 'active') {
    icon = 'checkmark-circle-outline';
    title = `${packageName(me)}${me.billing_period ? ` · ${me.billing_period === 'yearly' ? 'Yıllık' : 'Aylık'}` : ''}`;
    text = me.period_end
      ? (me.auto_renew ? `${dateText(me.period_end)} tarihinde yenilenir` : `${dateText(me.period_end)} tarihine kadar açık; yenilenmeyecek`)
      : 'Etkin';
    if (me.billing_source) text += ` · ${SOURCE[me.billing_source] ?? me.billing_source}`;
  } else {
    icon = 'lock-closed-outline';
    title = me.plan === 'trial' ? 'Deneme süren bitti' : 'Üyeliğin sona erdi';
    text = 'Danışanların, notların ve davranış hedeflerin silinmedi. Bir paket seçince kaldığın yerden devam edersin; o zamana kadar çocuk verileri görünmez.';
  }
  return (
    <View style={[styles.status, status === 'expired' && { backgroundColor: '#FDE7EA' }]}>
      <Ionicons name={icon} size={22} color={status === 'expired' ? colors.danger : colors.navy} />
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={styles.body}>{text}</Text>
      </View>
    </View>
  );
}

function PlanCard({ plan, price, perMonth, current, loading, canBuy, busy, disabled, onChoose, highlight }: {
  plan: BillingPlan; price: string | null; perMonth: string | null; current: boolean; loading: boolean; canBuy: boolean;
  busy: boolean; disabled: boolean; onChoose: () => void; highlight?: boolean;
}) {
  const meta = PACKAGES[plan.package];
  return (
    <View style={[styles.plan, highlight && styles.planHi]}>
      <Text style={styles.planTitle}>{meta.title}</Text>
      <Text style={styles.small}>{meta.who}</Text>
      {price ? (
        <Text style={styles.price}>{price}<Text style={styles.per}>{plan.period === 'yearly' ? ' / yıl' : ' / ay'}</Text></Text>
      ) : (
        <Text style={[styles.small, { marginTop: 12 }]}>{loading ? 'Fiyat yükleniyor…' : plan.period === 'yearly' ? 'Yıllık' : 'Aylık'}</Text>
      )}
      {price && perMonth && <Text style={styles.small}>aylık yaklaşık {perMonth}</Text>}
      <View style={{ gap: 8, marginTop: 12, flex: 1 }}>
        {meta.features.map((f) => <Check key={f} text={f} />)}
      </View>
      {current ? (
        <View style={styles.currentPill}><Text style={styles.currentText}>Mevcut paketin</Text></View>
      ) : canBuy ? (
        <Cta label={`${meta.title} paketini seç`} onPress={onChoose} busy={busy} disabled={disabled} style={{ marginTop: 16 }} />
      ) : null}
    </View>
  );
}

const Check = ({ text }: { text: string }) => (
  <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
    <Ionicons name="checkmark" size={16} color={colors.ok} style={{ marginTop: 2 }} />
    <Text style={[styles.body, { flex: 1 }]}>{text}</Text>
  </View>
);


const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bg },
  scroll: { padding: 24, paddingTop: 16, flexGrow: 1 },
  column: { width: '100%', maxWidth: 760, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  brand: { fontSize: 13, fontWeight: '700', color: colors.muted, letterSpacing: 1 },
  title: { fontSize: 24, fontWeight: '700', color: colors.navy, marginTop: 6 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 14, color: colors.text, lineHeight: 20 },
  small: { fontSize: 12, color: colors.muted, marginTop: 2, lineHeight: 17 },
  status: { flexDirection: 'row', gap: 12, backgroundColor: colors.today, borderRadius: radius.md, padding: 16, marginTop: 8 },
  statusTitle: { fontSize: 16, fontWeight: '700', color: colors.navy },
  cards: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 16 },
  plan: { flexGrow: 1, flexBasis: 300, backgroundColor: '#fff', borderRadius: radius.md, padding: 18, borderWidth: 1, borderColor: colors.line },
  planHi: { borderColor: colors.navy, borderWidth: 2 },
  planTitle: { fontSize: 18, fontWeight: '700', color: colors.navy },
  price: { fontSize: 28, fontWeight: '800', color: colors.navy, marginTop: 10 },
  per: { fontSize: 14, fontWeight: '500', color: colors.muted },
  currentPill: { marginTop: 16, alignSelf: 'flex-start', backgroundColor: colors.easy.bg, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 6 },
  currentText: { fontSize: 13, fontWeight: '700', color: colors.ok },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, marginTop: 16 },
  link: { fontSize: 13, fontWeight: '600', color: colors.navy },
  smallLink: { fontSize: 12, color: colors.muted, textDecorationLine: 'underline' },
  notice: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#FFF3D6', borderRadius: radius.md, padding: 12, marginTop: 12 },
  legal: { fontSize: 11, color: colors.muted, lineHeight: 16, marginTop: 20 },
});
