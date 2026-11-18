// "Aboneliği yönet" iptal öncesi akışının kuralları (uzaktan ayar bayrağı `cancel_flow`; docs/arastirma/iptal-benchmark.md 4.1, 4.3).
// Saf işlevler (React Native yok; testi tests/cancelFlow.test.mjs). Ekran: src/screens/membership/ManageSheet.tsx.
// Faz 1: indirim / ücretsiz ay yok; nedene göre en çok BİR seçenek ekranı. İptali Apple yapar, uygulama yalnız Apple'ın
// abonelik sayfasını açar. Metinlerde sayı, süre ve sonuç iddiası uydurulmaz; fiyat ve "n ay hediye" mağazadan / hesaptan gelir.
export const CANCEL_FLOW_FLAG = 'cancel_flow';
export const SUPPORT_URL = 'https://moyoapp.com.tr/destek';

export type CancelReason = 'few_clients' | 'expensive' | 'team_small' | 'families' | 'pause' | 'feature' | 'switching' | 'problem' | 'other';
export type CancelAction = 'solo' | 'monthly' | 'yearly' | 'help' | 'support';
export type CancelPlan = {
  pkg: 'solo' | 'clinic';
  period: 'monthly' | 'yearly' | null;   // bilinmiyorsa null
  members: number;                       // klinikteki uzman sayısı
  gift: number;                          // yıllıkta kaç ay hediye (billing.ts yearlyGift; hesaplanamıyorsa 0)
  help: boolean;                         // "Nasıl kullanılır?" bu ekrandan açılabiliyor mu
};

const REASONS: { id: CancelReason; label: string; clinicOnly?: boolean }[] = [
  { id: 'few_clients', label: 'Şu an az danışanla çalışıyorum' },
  { id: 'expensive', label: 'Pahalı geldi' },
  { id: 'team_small', label: 'Ekibim kullanmıyor ya da ekip küçüldü', clinicOnly: true },
  { id: 'families', label: 'Aileler uygulamayı kullanmıyor' },
  { id: 'pause', label: 'Bir süre ara veriyorum' },
  { id: 'feature', label: 'İhtiyacım olan özellik yok' },
  { id: 'switching', label: 'Başka bir araca geçiyorum' },
  { id: 'problem', label: 'Bir sorun yaşadım' },
  { id: 'other', label: 'Başka bir neden' },
];

// Ekip sorusu yalnız Klinik planında
export const reasonsFor = (pkg: CancelPlan['pkg']) => REASONS.filter((r) => !r.clinicOnly || pkg === 'clinic');

export type Alternative = { title: string; lines: string[]; actions: { id: CancelAction; label: string }[] };

const SOLO_LINE = 'Bireysel plan tek uzman içindir.';
const SOLO = { id: 'solo' as const, label: 'Bireysel plana geç' };
const SUPPORT = { id: 'support' as const, label: 'Bize yaz' };

// Nedene uyan tek seçenek ekranı; gösterecek bir şey yoksa null (doğrudan çıkışa gidilir). Her seçenek ekranında
// "Aboneliği iptal et" ayrıca ve aynı görünümde durur (ekranın işi).
export function alternativeFor(reason: CancelReason, p: CancelPlan): Alternative | null {
  if (reason === 'few_clients' || reason === 'team_small') {
    if (p.pkg === 'clinic') return { title: 'Bireysel plan', lines: [SOLO_LINE], actions: [SOLO] };
    if (reason === 'few_clients' && p.period === 'yearly') {
      return { title: 'Aylık plan', lines: ['Yıllık yerine aylık plana geçebilirsin.'], actions: [{ id: 'monthly', label: 'Aylık plana geç' }] };
    }
    return null;
  }
  if (reason === 'expensive') {
    const lines: string[] = [];
    const actions: Alternative['actions'] = [];
    if (p.period === 'monthly' && p.gift > 0) {
      lines.push(`Yıllık pakette ${p.gift} ay hediye.`);
      actions.push({ id: 'yearly', label: 'Paketleri gör' });
    }
    if (p.pkg === 'clinic' && p.members <= 1) {
      lines.push(SOLO_LINE);
      actions.push(SOLO);
    }
    return actions.length ? { title: 'Diğer paketler', lines, actions } : null;
  }
  if (reason === 'families') {
    return {
      title: 'Aileler kullanmıyorsa',
      lines: [p.help ? 'Davet ve ilk hafta için kısa ipuçları var. İstersen bize de yazabilirsin.' : 'Destek sayfasından bize yazabilirsin.'],
      actions: [...(p.help ? [{ id: 'help' as const, label: 'İpuçlarına bak' }] : []), SUPPORT],
    };
  }
  if (reason === 'pause') {
    return {
      title: 'Ara vermek',
      lines: ['App Store\'da abonelik dondurulamıyor. İptal edersen üyeliğin dönem sonuna kadar açık kalır; istediğin zaman yeniden başlatabilirsin.'],
      actions: [],
    };
  }
  if (reason === 'switching') {
    return { title: 'Kayıtların', lines: ['Raporları ve CSV dosyalarını danışan sayfalarından indirebilirsin.'], actions: [] };
  }
  // özellik yok / sorun / başka neden: serbest metin kutusu yok (saklanacak tablo yok; serbest metin kişisel veridir)
  return {
    title: reason === 'feature' ? 'Eksik olan özellik' : reason === 'problem' ? 'Yaşadığın sorun' : 'Anlatmak istersen',
    lines: ['Destek sayfasından bize yazabilirsin.'], actions: [SUPPORT],
  };
}
