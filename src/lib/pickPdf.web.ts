// Web: tarayıcının dosya seçicisi (yalnız PDF). Dokunuş anında çağrılmalı.
export type PickedPdf = { name: string; size: number; body: ArrayBuffer };

export function pickPdf(): Promise<PickedPdf | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/pdf,.pdf';
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      resolve({ name: f.name, size: f.size, body: await f.arrayBuffer() });
    };
    input.click();
  });
}
