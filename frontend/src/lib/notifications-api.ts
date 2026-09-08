import { apiFetch } from "./api";

export type NotificationType =
  | "INVITATION_ACCEPTED"
  | "NEW_ASSIGNMENT"
  | "ASSIGNMENT_REVIEWED"
  | "NEW_GRADE"
  | "CLASS_REMINDER"
  | "SCHEDULE_CHANGE"
  | "NEW_MESSAGE"
  | "PAYMENT_REMINDER";

export interface NotificationEntry {
  id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export function fetchNotifications(accessToken: string, unreadOnly = false) {
  const query = unreadOnly ? "?unread=true" : "";
  return apiFetch<NotificationEntry[]>(`/notifications${query}`, { accessToken });
}

export async function fetchUnreadCount(accessToken: string) {
  const { count } = await apiFetch<{ count: number }>(`/notifications/unread-count`, {
    accessToken,
  });
  return count;
}

export function markNotificationRead(accessToken: string, id: string) {
  return apiFetch<NotificationEntry>(`/notifications/${id}/read`, {
    method: "PATCH",
    accessToken,
  });
}

export function markAllNotificationsRead(accessToken: string) {
  return apiFetch<{ success: boolean }>(`/notifications/read-all`, {
    method: "PATCH",
    accessToken,
  });
}
