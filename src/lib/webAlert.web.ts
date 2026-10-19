// Web önizlemesinde Alert.alert hiçbir şey göstermez (react-native-web).
// Uyarı ve onay pencerelerini telefondakine benzer bir kutuyla gösterir.
import { Alert, AlertButton } from 'react-native';

function show(title: string, message?: string, buttons?: AlertButton[]) {
  if (typeof document === 'undefined') return;
  const list: AlertButton[] = buttons?.length ? buttons : [{ text: 'Tamam' }];
  const overlay = document.createElement('div');
  overlay.style.cssText =
    'position:fixed;inset:0;background:rgba(15,27,61,.35);display:flex;align-items:center;justify-content:center;' +
    'z-index:99999;padding:32px;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif';
  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;border-radius:16px;width:100%;max-width:280px;overflow:hidden;text-align:center';
  const body = document.createElement('div');
  body.style.cssText = 'padding:20px 18px 16px';
  const h = document.createElement('div');
  h.textContent = title;
  h.style.cssText = 'font-size:15px;font-weight:700;color:#0F1B3D';
  body.appendChild(h);
  if (message) {
    const p = document.createElement('div');
    p.textContent = message;
    p.style.cssText = 'font-size:13px;line-height:18px;color:#8A91A3;margin-top:6px';
    body.appendChild(p);
  }
  box.appendChild(body);
  const row = document.createElement('div');
  row.style.cssText = `display:flex;flex-direction:${list.length > 2 ? 'column' : 'row'};border-top:1px solid #E8EAEF`;
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
