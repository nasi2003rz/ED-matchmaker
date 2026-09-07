"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth, type RoleName } from "@/lib/auth-context";

interface Options {
  /** Where to send a signed-in user who lacks the required role. */
  redirectTo?: string;
}

/**
 * Client-side route gate (UI plan §4.4). Replaces the `useEffect` +
 * `router.replace` block duplicated across pages. This is UX only — real
 * authorization stays server-side (CLAUDE.md §9).
 *
 * Returns `allowed` once auth has resolved and the check passed; render a
 * skeleton until then.
 */
export function useRequireRole(
  roles: RoleName | RoleName[],
  options: Options = {},
) {
  const list = Array.isArray(roles) ? roles : [roles];
  const key = list.join(",");
  const { user, isLoading, getAccessToken } = useAuth();
  const router = useRouter();
  const { redirectTo = "/" } = options;

  useEffect(() => {
    if (isLoading) return;

    if (!getAccessToken()) {
      const next =
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : "/";
      router.replace(`/login?next=${encodeURIComponent(next)}`);
      return;
    }

    const roleList = key ? (key.split(",") as RoleName[]) : [];
    if (roleList.length > 0 && !roleList.some((r) => user?.roles.includes(r))) {
      router.replace(redirectTo);
    }
  }, [isLoading, user, getAccessToken, router, key, redirectTo]);

  const allowed =
    !isLoading &&
    Boolean(getAccessToken()) &&
    (list.length === 0 || list.some((r) => user?.roles.includes(r)));

  return { user, isLoading, allowed };
}
