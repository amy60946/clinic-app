import * as DocumentPicker from 'expo-document-picker';

// iOS / iPad: Dosyalar'dan PDF seç (e-Devlet'ten indirilen belge)
export type PickedPdf = { name: string; size: number; body: ArrayBuffer };

export async function pickPdf(): Promise<PickedPdf | null> {
  const r = await DocumentPicker.getDocumentAsync({ type: 'application/pdf', copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.length) return null;
  const a = r.assets[0];
  const body = await (await fetch(a.uri)).arrayBuffer();
  return { name: a.name, size: a.size ?? body.byteLength, body };
}
