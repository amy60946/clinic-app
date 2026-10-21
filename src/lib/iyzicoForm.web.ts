// iyzico'nun ödeme formu: iyzico'nun döndürdüğü betik sayfaya eklenir, form iyzico'nun kendi penceresinde açılır.
// Kart bilgisi ClinicApp'e hiç gelmez. Ödeme bitince iyzico sunucumuza döner, oradan ?billing=ok ile uygulamaya.
export function showIyzicoForm(content: string): void {
  closeIyzicoForm();
  const box = document.createElement('div');
  box.id = 'iyzipay-checkout-form';
  box.className = 'popup';
  document.body.appendChild(box);
  const code = content.replace(/^\s*<script[^>]*>/i, '').replace(/<\/script>\s*$/i, '');
  const s = document.createElement('script');
  s.type = 'text/javascript';
  s.id = 'iyzico-init';
  s.textContent = code;
  document.body.appendChild(s);
}

export function closeIyzicoForm(): void {
  document.getElementById('iyzipay-checkout-form')?.remove();
  document.getElementById('iyzico-init')?.remove();
}
