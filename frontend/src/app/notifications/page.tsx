"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  fetchNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  type NotificationEntry,
} from "@/lib/notifications-api";
import { NOTIFICATION_ICON } from "@/lib/notifications-labels";
import { cn } from "@/lib/utils";

export default function NotificationsPage() {
  const { getAccessToken, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationEntry[] | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchNotifications(token);
      setNotifications(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری اعلان‌ها.");
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [isAuthLoading, getAccessToken, router, load]);

  async function handleOpen(n: NotificationEntry) {
    const token = getAccessToken();
    if (token && !n.readAt) {
      try {
        await markNotificationRead(token, n.id);
        setNotifications((prev) =>
          prev?.map((x) => (x.id === n.id ? { ...x, readAt: new Date().toISOString() } : x)) ??
          prev,
        );
      } catch {
        // non-critical — still navigate even if marking read failed
      }
    }
    if (n.link) router.push(n.link);
  }

  async function handleMarkAllRead() {
    const token = getAccessToken();
    if (!token) return;
    try {
      await markAllNotificationsRead(token);
      setNotifications(
        (prev) => prev?.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })) ?? prev,
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    }
  }

  if (isAuthLoading || notifications === null) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  const hasUnread = notifications.some((n) => !n.readAt);

  return (
    <div className="mx-auto max-w-md space-y-4 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">اعلان‌ها</h1>
        {hasUnread && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            علامت‌گذاری همه به‌عنوان خوانده‌شده
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">اعلانی ندارید.</p>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = NOTIFICATION_ICON[n.type];
            const unread = !n.readAt;
            return (
              <Card
                key={n.id}
                className={cn(
                  "cursor-pointer transition-colors hover:bg-muted/50",
                  unread && "border-primary/40 bg-primary/5",
                )}
                onClick={() => handleOpen(n)}
              >
                <CardContent className="flex items-start gap-3 py-3">
                  <Icon className={cn("mt-0.5 size-4 shrink-0", unread ? "text-primary" : "text-muted-foreground")} />
                  <div className="min-w-0 flex-1">
                    <p className={cn("text-sm", unread && "font-medium")}>{n.title}</p>
                    {n.body && <p className="text-xs text-muted-foreground">{n.body}</p>}
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {new Date(n.createdAt).toLocaleDateString("fa-IR")}
                    </p>
                  </div>
                  {unread && <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" />}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
