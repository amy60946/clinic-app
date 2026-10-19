import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// iOS'ta açık klavyenin yüksekliği (kapalıyken 0). Android pencereyi zaten
// klavyeye göre küçülttüğü için orada her zaman 0 döner.
export function useKeyboardHeight() {
  const [height, setHeight] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'ios') return;
    const show = Keyboard.addListener('keyboardWillShow', (e) => setHeight(e.endCoordinates.height));
    const change = Keyboard.addListener('keyboardWillChangeFrame', (e) => setHeight(e.endCoordinates.height));
    const hide = Keyboard.addListener('keyboardWillHide', () => setHeight(0));
    return () => { show.remove(); change.remove(); hide.remove(); };
  }, []);
  return height;
}
