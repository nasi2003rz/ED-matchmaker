"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchMyGrades, type MyGradeEntry } from "@/lib/grades-api";
import { GRADE_TYPE_LABELS, formatGradeValue } from "@/lib/grades-labels";
import { AppShell } from "@/components/layout/app-shell";

export default function GradesPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const [grades, setGrades] = useState<MyGradeEntry[] | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchMyGrades(token);
      setGrades(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری نمرات.");
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

  if (isAuthLoading || grades === null) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-48 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">نمرات</h1>

      {grades.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          هنوز نمره‌ای برای شما ثبت نشده است.
        </p>
      ) : (
        <div className="space-y-2">
          {grades.map((g) => (
            <Card key={g.id}>
              <CardContent className="space-y-1 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{g.title}</span>
                  <Badge variant="secondary">{GRADE_TYPE_LABELS[g.type]}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{g.class.name}</p>
                <p className="text-lg font-bold">{formatGradeValue(g.type, g.value)}</p>
                {g.note && <p className="text-sm text-muted-foreground">{g.note}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </AppShell>
  );
}
