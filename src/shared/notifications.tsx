import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

export interface Notice { id: string; icon: 'checkmark-circle' | 'star' | 'trophy' | 'chatbubble'; kind: 'success' | 'accent' | 'primary'; text: string; time: string; read: boolean }

/** TODO (messaging-notification): thay dữ liệu demo bằng API thật. */
const DEMO: Notice[] = [
  { id: 'n1', icon: 'checkmark-circle', kind: 'success', text: 'Phiên “Ôn tập chương 3 – HTTP & REST” của bạn đã được duyệt.', time: '2 giờ trước', read: false },
  { id: 'n2', icon: 'star', kind: 'accent', text: 'Lê Thu Hà đã đánh giá 5 sao câu hỏi của bạn.', time: 'Hôm qua', read: false },
  { id: 'n3', icon: 'trophy', kind: 'primary', text: 'Bạn đang đứng thứ 3 trên bảng xếp hạng dự đoán.', time: '2 ngày trước', read: false },
  { id: 'n4', icon: 'chatbubble', kind: 'primary', text: 'Phạm Quốc Bảo đã bình luận về câu hỏi của bạn.', time: '3 ngày trước', read: true },
];

const Ctx = createContext<{
  items: Notice[]; unread: number; open: boolean; setOpen: (o: boolean) => void; markRead: (id: string) => void; markAllRead: () => void;
}>(null as never);
export const useNotifications = () => useContext(Ctx);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState(DEMO);
  const [open, setOpen] = useState(false);
  const value = useMemo(() => ({
    items, open, setOpen, unread: items.filter((n) => !n.read).length,
    markRead: (id: string) => setItems((p) => p.map((n) => (n.id === id ? { ...n, read: true } : n))),
    markAllRead: () => setItems((p) => p.map((n) => ({ ...n, read: true }))),
  }), [items, open]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
