// Web önizlemesinde Alert.alert hiçbir şey göstermez (react-native-web).
// Uyarı ve onay pencerelerini telefondakine benzer bir kutuyla gösterir.
import { Alert, AlertButton } from 'react-native';

function show(title: string, message?: string, buttons?: AlertButton[]) {
  if (typeof document === 'undefined') return;
  const list: AlertButton[] = buttons?.length ? buttons : [{ text: 'Tamam' }];
  // Uzun mesaj (ör. hesap silme uyarısı, hukuk/50 §5.2): ortalı açık gri küçük yazı okunmuyor; kutu genişler, yazı sola hizalı ve
  // koyu olur, gövde kendi içinde kayar (küçük ekranda düğmeler hep görünür). Kısa mesajlar telefondaki uyarı gibi kalır.
  const long = (message?.length ?? 0) > 240;
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(15,27,61,.35);display:flex;align-items:center;justify-content:center;' +
    `z-index:99999;padding:${long ? 20 : 32}px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif`;
  const box = document.createElement('div');
  box.style.cssText = long
    ? 'background:#fff;border-radius:16px;width:100%;max-width:400px;max-height:100%;overflow:hidden;text-align:left;display:flex;flex-direction:column'
    : 'background:#fff;border-radius:16px;width:100%;max-width:280px;overflow:hidden;text-align:center';
  const body = document.createElement('div');
  body.style.cssText = long ? 'padding:20px 20px 16px;overflow-y:auto;flex:1 1 auto;min-height:0' : 'padding:20px 18px 16px';
  const h = document.createElement('div');
  h.textContent = title;
  h.style.cssText = 'font-size:15px;font-weight:700;color:#0F1B3D';
  body.appendChild(h);
  if (message) {
    const p = document.createElement('div');
    p.textContent = message;
    p.style.cssText = long
      ? 'font-size:14px;line-height:20px;color:#454C63;margin-top:8px'
      : 'font-size:13px;line-height:18px;color:#8A91A3;margin-top:6px';
    body.appendChild(p);
  }
  box.appendChild(body);
  const row = document.createElement('div');
  row.style.cssText = `display:flex;flex:none;flex-direction:${list.length > 2 ? 'column' : 'row'};border-top:1px solid #E8EAEF`;
  list.forEach((b, i) => {
    const btn = document.createElement('button');
    btn.textContent = b.text ?? 'Tamam';
    const color = b.style === 'destructive' ? '#B3263E' : '#0F1B3D';
    const sep = i === 0 ? '' : list.length > 2 ? 'border-top:1px solid #E8EAEF;' : 'border-left:1px solid #E8EAEF;';
    btn.style.cssText =
      `flex:1;padding:13px 8px;border:0;${sep}background:#fff;cursor:pointer;font-size:15px;` +
      `font-weight:${b.style === 'cancel' ? 400 : 700};color:${color};font-family:inherit`;
    btn.onclick = () => {
      overlay.remove();
      b.onPress?.();
    };
    row.appendChild(btn);
  });
  box.appendChild(row);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
}

(Alert as unknown as { alert: typeof show }).alert = show;

export {};
