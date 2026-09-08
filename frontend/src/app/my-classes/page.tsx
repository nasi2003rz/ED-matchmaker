"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchMyClasses, type MyClassEntry } from "@/lib/classes-api";
import { STATUS_LABELS, WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/classes-labels";
import { AppShell } from "@/components/layout/app-shell";

function formatSchedule(klass: MyClassEntry): string {
  if (klass.days.length === 0) return "—";
  const days = WEEKDAY_ORDER.filter((d) => klass.days.includes(d))
    .map((d) => WEEKDAY_LABELS[d])
    .join("، ");
  const time = klass.startTime && klass.endTime ? ` — ${klass.startTime} تا ${klass.endTime}` : "";
  return `${days}${time}`;
}

export default function MyClassesPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<MyClassEntry[] | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchMyClasses(token);
      setClasses(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری کلاس‌ها.");
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

  if (isAuthLoading || classes === null) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-32 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="text-xl font-bold">کلاس‌های من</h1>

        {classes.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            هنوز در کلاسی ثبت‌نام نشده‌اید.
          </p>
        ) : (
          <div className="space-y-3">
            {classes.map((klass) => (
              <Card key={klass.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{klass.name}</CardTitle>
                    <Badge variant="secondary">{STATUS_LABELS[klass.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <div>مربی: {klass.instructorName}</div>
                  <div>{formatSchedule(klass)}</div>
                  {klass.location && <div>{klass.location.city}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
