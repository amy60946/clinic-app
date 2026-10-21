// Yalnız web'de: iyzico ödeme formu (iyzicoForm.web.ts). Diğer platformlarda kullanılmaz.
export function showIyzicoForm(_content: string): void {
  throw new Error('Web ödeme formu yalnız tarayıcıda açılır');
}
export function closeIyzicoForm(): void {}
