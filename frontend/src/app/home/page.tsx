"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchStudentDashboard, type StudentDashboard } from "@/lib/dashboard-api";
import { formatDayLabel, formatTime } from "@/lib/calendar-utils";
import { HOMEWORK_STATUS_LABELS, HOMEWORK_STATUS_VARIANT } from "@/lib/homework-labels";
import { formatGradeValue } from "@/lib/grades-labels";

export default function HomePage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const [dashboard, setDashboard] = useState<StudentDashboard | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchStudentDashboard(token);
      setDashboard(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری داشبورد.");
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!user?.roles.includes("STUDENT")) {
      router.replace("/");
      return;
    }
    load();
  }, [isAuthLoading, getAccessToken, user, router, load]);

  if (isAuthLoading || dashboard === null) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-5 p-6" dir="rtl">
      <h1 className="text-xl font-bold">خوش آمدید، {user?.name}</h1>

      <div className="space-y-2">
        <p className="text-sm font-medium">جلسه‌ی بعدی</p>
        {dashboard.nextSession ? (
          <Card>
            <CardContent className="py-3 text-sm">
              <div className="font-medium">{dashboard.nextSession.class.name}</div>
              <div className="text-muted-foreground">
                {formatDayLabel(new Date(dashboard.nextSession.startsAt))} —{" "}
                {formatTime(dashboard.nextSession.startsAt)} تا{" "}
                {formatTime(dashboard.nextSession.endsAt)}
              </div>
            </CardContent>
          </Card>
        ) : (
          <p className="py-4 text-center text-sm text-muted-foreground">
            جلسه‌ی آینده‌ای برنامه‌ریزی نشده است.
          </p>
        )}
      </div>

      {dashboard.todaySessions.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">کلاس‌های امروز</p>
          <div className="space-y-1.5">
            {dashboard.todaySessions.map((s) => (
              <Card key={s.id}>
                <CardContent className="flex items-center justify-between py-2.5 text-sm">
                  <span>{s.class.name}</span>
                  <span className="text-muted-foreground">
                    {formatTime(s.startsAt)} تا {formatTime(s.endsAt)}
                  </span>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">تکالیف در انتظار</p>
          <Link href="/homework" className="text-xs text-primary underline underline-offset-4">
            مشاهده‌ی همه
          </Link>
        </div>
        {dashboard.pendingHomework.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            تکلیف در انتظاری ندارید.
          </p>
        ) : (
          <div className="space-y-1.5">
            {dashboard.pendingHomework.map((h) => (
              <Card key={h.id}>
                <CardContent className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="font-medium">{h.title}</div>
                    <div className="text-xs text-muted-foreground">{h.class.name}</div>
                  </div>
                  <Badge variant={HOMEWORK_STATUS_VARIANT[h.status]}>
                    {HOMEWORK_STATUS_LABELS[h.status]}
                  </Badge>
                </CardContent>
              </Card>
            ))}
            {dashboard.pendingHomeworkCount > dashboard.pendingHomework.length && (
              <p className="text-xs text-muted-foreground">
                و {dashboard.pendingHomeworkCount - dashboard.pendingHomework.length} مورد دیگر
              </p>
            )}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">نمرات اخیر</p>
          <Link href="/grades" className="text-xs text-primary underline underline-offset-4">
            مشاهده‌ی همه
          </Link>
        </div>
        {dashboard.recentGrades.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">هنوز نمره‌ای ثبت نشده.</p>
        ) : (
          <div className="space-y-1.5">
            {dashboard.recentGrades.map((g) => (
              <Card key={g.id}>
                <CardContent className="flex items-center justify-between py-2.5 text-sm">
                  <div>
                    <div className="font-medium">{g.title}</div>
                    <div className="text-xs text-muted-foreground">{g.class.name}</div>
                  </div>
                  <span className="font-medium">{formatGradeValue(g.type, g.value)}</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Link href="/messages">
        <Card className="transition-colors hover:bg-muted/50">
          <CardContent className="flex items-center justify-between py-3 text-sm">
            <span className="font-medium">پیام‌های خوانده‌نشده</span>
            {dashboard.unreadMessagesCount > 0 ? (
              <Badge>{dashboard.unreadMessagesCount}</Badge>
            ) : (
              <span className="text-muted-foreground">—</span>
            )}
          </CardContent>
        </Card>
      </Link>
    </div>
  );
}
