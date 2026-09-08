import type { NotificationType } from "./notifications-api";
import {
  Bell,
  BookOpen,
  CheckCircle2,
  GraduationCap,
  Clock,
  CalendarClock,
  MessageCircle,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export const NOTIFICATION_ICON: Record<NotificationType, LucideIcon> = {
  INVITATION_ACCEPTED: Bell,
  NEW_ASSIGNMENT: BookOpen,
  ASSIGNMENT_REVIEWED: CheckCircle2,
  NEW_GRADE: GraduationCap,
  CLASS_REMINDER: Clock,
  SCHEDULE_CHANGE: CalendarClock,
  NEW_MESSAGE: MessageCircle,
  PAYMENT_REMINDER: Wallet,
};
