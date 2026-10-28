// Dosya kaydetme (iOS): ek paket gerektirmeden paylaşım menüsüyle metin olarak; web'de saveFile.web.ts indirir
import { Share } from 'react-native';

export async function saveTextFile(name: string, text: string, _mime = 'text/csv'): Promise<'saved' | 'dismissed'> {
  const r = await Share.share({ title: name, message: text });
  return r.action === Share.dismissedAction ? 'dismissed' : 'saved';
}
