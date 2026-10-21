import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState } from 'react-native';
import { supabase } from './supabase';
import { AppNotification, notificationChildren, registerForPush, setBadge, toNotification } from './notifications';

// Uygulama içi bildirim kutusu: sunucunun yazdığı satırlar (notifications, app='clinic') + Realtime ile anında yenileri
type Ctx = {
  items: AppNotification[];
  unread: number;
  unreadByChild: Record<string, number>;
  markRead: (ids?: number[]) => void;
  remove: (id: number) => void;
  reload: () => Promise<void>;
};

const NotifCtx = createContext<Ctx | null>(null);

export function NotificationsProvider({ userId, children }: { userId: string; children: React.ReactNode }) {
  const [items, setItems] = useState<AppNotification[]>([]);

  const reload = useCallback(async () => {
    const { data, error } = await supabase.from('notifications').select('*')
      .eq('user_id', userId).eq('app', 'clinic').order('created_at', { ascending: false }).limit(100);
    if (!error && data) setItems(data.map(toNotification));
  }, [userId]);

  useEffect(() => {
    setItems([]);
    reload();
    registerForPush();
    const channel = supabase
      .channel(`notif:${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, (p) => {
        const n = toNotification(p.new);
        if ((p.new as { app?: string }).app !== 'clinic') return;
        setItems((prev) => (prev.some((x) => x.id === n.id) ? prev : [n, ...prev]));
      })
      .subscribe();
    // Ön plana dönünce eşitle (arka plandayken kaçan olaylar); web'de Realtime yoksa da arada bir yenile
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') reload(); });
    const timer = setInterval(reload, 60_000);
    return () => { supabase.removeChannel(channel); sub.remove(); clearInterval(timer); };
  }, [userId, reload]);

  const unread = useMemo(() => items.filter((n) => !n.readAt).length, [items]);
  const unreadByChild = useMemo(() => {
    const out: Record<string, number> = {};
    items.forEach((n) => { if (!n.readAt) notificationChildren(n).forEach((c) => { out[c] = (out[c] ?? 0) + 1; }); });
    return out;
  }, [items]);
  useEffect(() => { setBadge(unread); }, [unread]);

  const markRead = useCallback((ids?: number[]) => {
    const at = new Date().toISOString();
    setItems((prev) => prev.map((n) => (!n.readAt && (!ids || ids.includes(n.id)) ? { ...n, readAt: at } : n)));
    supabase.rpc('mark_notifications_read', { p_ids: ids ?? null }).then(({ error }) => { if (error) reload(); });
  }, [reload]);

  const remove = useCallback((id: number) => {
    setItems((prev) => prev.filter((n) => n.id !== id));
    supabase.from('notifications').delete().eq('id', id).then(({ error }) => { if (error) reload(); });
  }, [reload]);

  const value = useMemo(() => ({ items, unread, unreadByChild, markRead, remove, reload }), [items, unread, unreadByChild, markRead, remove, reload]);
  return <NotifCtx.Provider value={value}>{children}</NotifCtx.Provider>;
}

export const useNotifications = () => {
  const v = useContext(NotifCtx);
  if (!v) throw new Error('NotificationsProvider eksik');
  return v;
};
