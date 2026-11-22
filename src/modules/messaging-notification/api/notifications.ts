import { api } from '@/api/backend';
import { fromApi } from './adapters';
import { mockNotifications } from './mock-db';
import type { Pagination } from "@/modules/messaging-notification/api/interfaces/messages.interface";

export interface NotificationItem {
  notificationId: string; type: string; title: string; body: string;
  iconUrl?: string | null; readAt?: string | null; createdAt: string;
  target?: { type: string; targetId: string; url?: string | null } | null;
  actor?: { userId: string; fullName: string; avatarUrl?: string | null; frameUrl?: string | null } | null;
  metadata?: { confirmedQuestions?: { questionId: string; subjectName: string; questionSnippet: string; points: number }[] } | null;
}
export interface NotificationsPage {
  items: NotificationItem[]; pagination: Pagination; unreadCount: number;
}
export function getNotifications(after?: number, limit = 20) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 50) throw new Error("Số thông báo mỗi trang phải từ 1 đến 50.");
  if (after !== undefined && (!Number.isSafeInteger(after) || after <= 0)) throw new Error("Con trỏ thông báo không hợp lệ.");
  return api<unknown>('GET', '/notifications', {
    query: { limit, after }, mock: () => mockNotifications(after, limit),
  }).then((raw) => {
    const page = fromApi<NotificationsPage>(raw);
    return { ...page, items: page.items.map(item => ({
      ...item, notificationId: String(item.notificationId),
      actor: item.actor ? { ...item.actor, userId: String(item.actor.userId) } : item.actor,
      target: item.target ? { ...item.target, targetId: String(item.target.targetId) } : item.target,
      metadata: item.metadata ? { ...item.metadata, confirmedQuestions: item.metadata.confirmedQuestions?.map(q => ({ ...q, questionId: String(q.questionId) })) } : item.metadata,
    })) };
  });
}
