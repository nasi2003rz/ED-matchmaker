"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { fetchClasses, type ClassItem } from "@/lib/classes-api";
import { STATUS_LABELS, WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/classes-labels";

function formatSchedule(klass: ClassItem): string {
  if (klass.days.length === 0) return "—";
  const days = WEEKDAY_ORDER.filter((d) => klass.days.includes(d))
    .map((d) => WEEKDAY_LABELS[d])
    .join("، ");
  const time = klass.startTime && klass.endTime ? ` — ${klass.startTime} تا ${klass.endTime}` : "";
  return `${days}${time}`;
}

export default function ClassesPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const [classes, setClasses] = useState<ClassItem[] | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchClasses(token);
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
    if (!user?.roles.includes("INSTRUCTOR")) {
      router.replace("/");
      return;
    }
    load();
  }, [isAuthLoading, getAccessToken, user, router, load]);

  if (isAuthLoading || classes === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">کلاس‌های من</h1>
        <Link href="/classes/new" className={cn(buttonVariants())}>
          کلاس جدید
        </Link>
      </div>

      {classes.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          هنوز کلاسی نساخته‌اید.
        </p>
      ) : (
        <div className="space-y-3">
          {classes.map((klass) => (
            <Link key={klass.id} href={`/classes/${klass.id}`}>
              <Card className="transition-colors hover:border-primary">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{klass.name}</CardTitle>
                    <Badge variant="secondary">{STATUS_LABELS[klass.status]}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <div>{formatSchedule(klass)}</div>
                  <div>
                    {klass.capacity !== null
                      ? `${klass.enrolledCount} از ${klass.capacity} نفر ثبت‌نام شده — ${klass.seatsLeft} صندلی خالی`
                      : `${klass.enrolledCount} نفر ثبت‌نام شده`}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
