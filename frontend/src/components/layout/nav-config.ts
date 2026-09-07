import type { LucideIcon } from "lucide-react";
import {
  BookOpen,
  CalendarDays,
  GraduationCap,
  Home,
  LayoutDashboard,
  MessageCircle,
  MoreHorizontal,
  Users,
} from "lucide-react";
import type { RoleName } from "@/lib/auth-context";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
}

/**
 * Per-role primary navigation (CLAUDE.md §7). The shell renders the set for
 * the user's active role — tabs are never merged across roles.
 *
 * Wave 0 wires the INSTRUCTOR routes end-to-end; STUDENT/PARENT routes are
 * declared here but their pages arrive in Wave 4.
 */
export const NAV_BY_ROLE: Record<RoleName, NavItem[]> = {
  INSTRUCTOR: [
    { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
    { href: "/classes", label: "کلاس‌ها", icon: GraduationCap },
    { href: "/students", label: "دانش‌آموزان", icon: Users },
    { href: "/calendar", label: "تقویم", icon: CalendarDays },
    { href: "/messages", label: "پیام‌ها", icon: MessageCircle },
    { href: "/more", label: "بیشتر", icon: MoreHorizontal },
  ],
  STUDENT: [
    { href: "/home", label: "خانه", icon: Home },
    { href: "/my-classes", label: "کلاس‌های من", icon: GraduationCap },
    { href: "/calendar", label: "تقویم", icon: CalendarDays },
    { href: "/homework", label: "تکالیف", icon: BookOpen },
    { href: "/messages", label: "پیام‌ها", icon: MessageCircle },
    { href: "/more", label: "بیشتر", icon: MoreHorizontal },
  ],
  PARENT: [
    { href: "/home", label: "خانه", icon: Home },
    { href: "/children", label: "فرزندان", icon: Users },
    { href: "/calendar", label: "تقویم", icon: CalendarDays },
    { href: "/messages", label: "پیام‌ها", icon: MessageCircle },
    { href: "/more", label: "بیشتر", icon: MoreHorizontal },
  ],
};

/** The role whose navigation is shown when an account holds several. */
export function activeRole(roles: readonly RoleName[]): RoleName {
  if (roles.includes("INSTRUCTOR")) return "INSTRUCTOR";
  return roles[0] ?? "INSTRUCTOR";
}
