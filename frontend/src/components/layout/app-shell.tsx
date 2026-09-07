"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { NAV_BY_ROLE, activeRole, type NavItem } from "./nav-config";

function isActive(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function SidebarLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
        active
          ? "bg-sidebar-accent text-sidebar-accent-foreground"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      <Icon className="size-5 shrink-0" />
      {item.label}
    </Link>
  );
}

function BottomLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex flex-col items-center gap-1 py-2 text-[0.65rem] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground hover:text-foreground",
      )}
    >
      <Icon className="size-5" />
      {item.label}
    </Link>
  );
}

/**
 * Authenticated app shell (CLAUDE.md §7 / UI plan §3.5): responsive
 * navigation — sidebar on desktop, bottom tab bar on mobile — a thin header,
 * and a width-capped content column. Wrap every role-gated page in this.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const items = NAV_BY_ROLE[activeRole(user?.roles ?? [])];

  return (
    <div className="flex min-h-full flex-1">
      <aside className="sticky top-0 hidden h-svh w-60 shrink-0 flex-col border-e border-sidebar-border bg-sidebar lg:flex">
        <div className="flex h-14 items-center px-4">
          <Link href="/dashboard" className="font-bold">
            پلتفرم کلاس
          </Link>
        </div>
        <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
          {items.map((item) => (
            <SidebarLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>
      </aside>

      <div className="flex min-h-full flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-background/85 px-4 backdrop-blur lg:px-8">
          <span className="text-sm font-semibold lg:hidden">پلتفرم کلاس</span>
          <span className="hidden lg:block" aria-hidden="true" />
          <ThemeToggle />
        </header>

        <main className="mx-auto w-full max-w-4xl flex-1 px-4 pt-5 pb-24 lg:px-8 lg:pb-10">
          {children}
        </main>

        <nav
          className="fixed inset-x-0 bottom-0 z-30 grid grid-flow-col auto-cols-fr border-t border-border bg-background/95 backdrop-blur lg:hidden"
          style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        >
          {items.map((item) => (
            <BottomLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </nav>
      </div>
    </div>
  );
}
