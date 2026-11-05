// Çalışma alanı (ortak akislar.md 21, veritabani.md 30): uzman birden çok klinikte ve kendi bireysel alanında çalışır.
// Seçili alan her REST isteğine `x-clinic-id` başlığıyla gider (supabase.ts); sunucu etkin üyeliği denetler.
// Seçim cihazda kalır (AsyncStorage). Alan değişince ana ekran baştan yüklenir (WorkspaceProvider anahtarı).
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

let current: string | null = null;
export const getWorkspace = () => current;

const storeKey = (uid: string) => `clinic.workspace.v1.${uid}`;

type Pending = { kind: string; data: unknown; childId?: string | null } | null;
type Ctx = {
  id: string | null;                        // null: sunucudaki varsayılan alan
  switchTo: (id: string | null, then?: Pending) => void;
  takePending: () => Pending;               // alan değişiminden sonra açılacak bildirim
};
const WorkspaceCtx = createContext<Ctx>({ id: null, switchTo: () => {}, takePending: () => null });
export const useWorkspace = () => useContext(WorkspaceCtx);

export function WorkspaceProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [id, setId] = useState<string | null | undefined>(undefined);   // undefined: cihazdaki seçim okunuyor
  const pending = useRef<Pending>(null);
  useEffect(() => {
    let live = true;
    AsyncStorage.getItem(storeKey(userId)).catch(() => null).then((v) => {
      if (!live) return;
      current = v || null;
      setId(v || null);
    });
    return () => { live = false; current = null; };
  }, [userId]);
  const switchTo = useCallback((next: string | null, then?: Pending) => {
    current = next;
    pending.current = then ?? null;
    (next ? AsyncStorage.setItem(storeKey(userId), next) : AsyncStorage.removeItem(storeKey(userId))).catch(() => {});
    setId(next);
  }, [userId]);
  const takePending = useCallback(() => { const p = pending.current; pending.current = null; return p; }, []);
  const value = useMemo(() => ({ id: id ?? null, switchTo, takePending }), [id, switchTo, takePending]);
  if (id === undefined) return null;
  return (
    <WorkspaceCtx.Provider value={value}>
      <React.Fragment key={id ?? 'default'}>{children}</React.Fragment>
    </WorkspaceCtx.Provider>
  );
}
