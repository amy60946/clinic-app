import { useEffect, useRef, RefObject } from 'react';
import { Platform } from 'react-native';

// Takip planında sürükle-bırak (yalnız web; HTML5 sürükleme). iPad ve telefonda aynı işi "Ekle" düğmeleri yapar.
// Yük "tür:kimlik" metnidir (ör. "module:<id>", "lib-goal:<şablon>"); bırakma alanı kabul ettiği türleri söyler.
let current: string | null = null;
type El = { setAttribute: (k: string, v: string) => void; addEventListener: (t: string, f: (e: any) => void) => void; removeEventListener: (t: string, f: (e: any) => void) => void };

export function useDragSource(ref: RefObject<unknown>, payload: string | null) {
  useEffect(() => {
    if (Platform.OS !== 'web' || !payload) return;
    const el = ref.current as El | null;
    if (!el) return;
    el.setAttribute('draggable', 'true');
    const start = (e: any) => { current = payload; e.dataTransfer?.setData('text/plain', payload); if (e.dataTransfer) e.dataTransfer.effectAllowed = 'copyMove'; };
    const end = () => { current = null; };
    el.addEventListener('dragstart', start);
    el.addEventListener('dragend', end);
    return () => { el.removeEventListener('dragstart', start); el.removeEventListener('dragend', end); };
  }, [ref, payload]);
}

export function useDropZone(ref: RefObject<unknown>, accept: string[], onDrop: (payload: string) => void, onOver?: (on: boolean) => void) {
  const cb = useRef({ onDrop, onOver });
  cb.current = { onDrop, onOver };
  const key = accept.join(',');
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const el = ref.current as El | null;
    if (!el) return;
    const ok = () => !!current && key.split(',').includes(current.split(':')[0]);
    const over = (e: any) => { if (!ok()) return; e.preventDefault(); e.stopPropagation(); cb.current.onOver?.(true); };
    const leave = () => cb.current.onOver?.(false);
    const drop = (e: any) => {
      if (!ok()) return;
      e.preventDefault(); e.stopPropagation();
      const p = current!; current = null;
      cb.current.onOver?.(false);
      cb.current.onDrop(p);
    };
    el.addEventListener('dragover', over);
    el.addEventListener('dragleave', leave);
    el.addEventListener('drop', drop);
    return () => { el.removeEventListener('dragover', over); el.removeEventListener('dragleave', leave); el.removeEventListener('drop', drop); };
  }, [ref, key]);
}
