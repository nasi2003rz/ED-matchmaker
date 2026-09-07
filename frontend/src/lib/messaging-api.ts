import { apiFetch } from "./api";

export interface Announcement {
  id: string;
  content: string;
  createdAt: string;
  class?: { id: string; name: string };
}

export type MessageStatus = "SENT" | "READ";

export interface ThreadMessage {
  id: string;
  content: string;
  mine: boolean;
  status: MessageStatus;
  createdAt: string;
}

export interface ConversationParty {
  kind: "INSTRUCTOR" | "STUDENT" | "PARENT";
  name: string;
}

export interface ConversationThread {
  id: string;
  otherParty: ConversationParty;
  messages: ThreadMessage[];
}

export interface ConversationSummary {
  id: string;
  otherParty: ConversationParty;
  lastMessage: { content: string; mine: boolean; createdAt: string } | null;
  unreadCount: number;
}

// ---- Announcements: instructor side ----

export function fetchClassAnnouncements(accessToken: string, classId: string) {
  return apiFetch<Announcement[]>(`/classes/${classId}/announcements`, { accessToken });
}

export function createAnnouncement(accessToken: string, classId: string, content: string) {
  return apiFetch<Announcement>(`/classes/${classId}/announcements`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ content }),
  });
}

// ---- Announcements: student / parent side ----

export function fetchMyAnnouncements(accessToken: string, asParent: boolean) {
  return apiFetch<Announcement[]>(asParent ? `/announcements/me/parent` : `/announcements/me`, {
    accessToken,
  });
}

// ---- Conversations: instructor side ----

export function fetchInstructorConversations(accessToken: string) {
  return apiFetch<ConversationSummary[]>(`/conversations`, { accessToken });
}

export function startConversation(
  accessToken: string,
  input: { studentId?: string; parentId?: string; content: string },
) {
  return apiFetch<ConversationThread>(`/conversations/start`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

// ---- Conversations: student / parent side ----

export function fetchMyConversations(accessToken: string) {
  return apiFetch<ConversationSummary[]>(`/conversations/me`, { accessToken });
}

export function fetchStartableInstructors(accessToken: string) {
  return apiFetch<{ id: string; name: string }[]>(`/conversations/me/instructors`, {
    accessToken,
  });
}

export function startConversationAsStudentOrParent(
  accessToken: string,
  input: { instructorId: string; content: string },
) {
  return apiFetch<ConversationThread>(`/conversations/me/start`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

// ---- Conversations: shared ----

export function fetchThread(accessToken: string, conversationId: string) {
  return apiFetch<ConversationThread>(`/conversations/${conversationId}/messages`, {
    accessToken,
  });
}

export function sendMessage(accessToken: string, conversationId: string, content: string) {
  return apiFetch<ConversationThread>(`/conversations/${conversationId}/messages`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ content }),
  });
}

export function markConversationRead(accessToken: string, conversationId: string) {
  return apiFetch<{ success: boolean }>(`/conversations/${conversationId}/read`, {
    method: "PATCH",
    accessToken,
  });
}
