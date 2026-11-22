import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { getNotifications, type NotificationItem } from "@/modules/messaging-notification/api/notifications";
import { useAuth } from "@/context/auth";

type NotificationState = {
  items: NotificationItem[]; unread: number; open: boolean; setOpen: (open: boolean) => void;
  loading: boolean; error: string; hasMore: boolean; reload: () => Promise<void>; loadMore: () => Promise<void>;
};
const Ctx = createContext<NotificationState>(null as never);
export const useNotifications = () => useContext(Ctx);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  return <UserNotifications key={user.id}>{children}</UserNotifications>;
}

function UserNotifications({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const cursor = useRef<number | undefined>(undefined);
  const generation = useRef(0);
  const busy = useRef(false);
  const fetchPage = useCallback(async (append: boolean) => {
    if (busy.current) return;
    busy.current = true;
    const requestGeneration = generation.current;
    setLoading(true); setError("");
    try {
      const page = await getNotifications(append ? cursor.current : undefined);
      if (requestGeneration !== generation.current) return;
      setItems((previous) => [...new Map((append ? [...previous, ...page.items] : page.items)
        .map((item) => [item.notificationId, item])).values()]);
      setUnread(page.unreadCount);
      const next = page.pagination.after ?? (page.items.length ? Number(page.items.at(-1)!.notificationId) : undefined);
      setHasMore(page.pagination.hasNext && next !== undefined && (!append || next !== cursor.current));
      cursor.current = next;
    } catch (err) {
      if (requestGeneration === generation.current) setError(err instanceof Error ? err.message : "Không tải được thông báo.");
    } finally {
      if (requestGeneration === generation.current) { busy.current = false; setLoading(false); }
    }
  }, []);
  const reload = useCallback(() => fetchPage(false), [fetchPage]);
  const loadMore = useCallback(() => hasMore ? fetchPage(true) : Promise.resolve(), [fetchPage, hasMore]);
  useEffect(() => {
    generation.current += 1; busy.current = false; cursor.current = undefined;
    void reload();
    return () => { generation.current += 1; busy.current = false; };
  }, [reload]);
  const toggleOpen = useCallback((value: boolean) => { setOpen(value); if (value) void reload(); }, [reload]);
  const value = useMemo(() => ({ items, unread, open, setOpen: toggleOpen, loading, error, hasMore, reload, loadMore }),
    [items, unread, open, toggleOpen, loading, error, hasMore, reload, loadMore]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
