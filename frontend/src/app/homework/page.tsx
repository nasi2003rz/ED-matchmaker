"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchMyHomework, submitHomework, type HomeworkItem } from "@/lib/assignments-api";
import { HOMEWORK_STATUS_LABELS, HOMEWORK_STATUS_VARIANT } from "@/lib/homework-labels";
import { AppShell } from "@/components/layout/app-shell";

export default function HomeworkPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<HomeworkItem[] | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [submittingId, setSubmittingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchMyHomework(token);
      setItems(data);
      setDrafts((prev) => {
        const next = { ...prev };
        for (const item of data) {
          if (!(item.id in next)) next[item.id] = item.submission?.content ?? "";
        }
        return next;
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری تکالیف.");
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

  async function handleSubmit(assignmentId: string) {
    const token = getAccessToken();
    const content = drafts[assignmentId]?.trim();
    if (!token || !content) return;
    setSubmittingId(assignmentId);
    try {
      await submitHomework(token, assignmentId, content);
      toast.success("تکلیف ارسال شد.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setSubmittingId(null);
    }
  }

  if (isAuthLoading || items === null) {
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
      <h1 className="text-xl font-bold">تکالیف</h1>

      {items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          تکلیفی برای شما تعریف نشده است.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => {
            const locked = item.status === "REVIEWED";
            return (
              <Card key={item.id}>
                <CardContent className="space-y-2 py-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">{item.title}</span>
                    <Badge variant={HOMEWORK_STATUS_VARIANT[item.status]}>
                      {HOMEWORK_STATUS_LABELS[item.status]}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{item.class.name}</p>
                  {item.description && (
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  )}
                  {item.dueAt && (
                    <p className="text-xs text-muted-foreground">
                      مهلت ارسال: {new Date(item.dueAt).toLocaleDateString("fa-IR")}
                    </p>
                  )}

                  <Textarea
                    value={drafts[item.id] ?? ""}
                    onChange={(e) => setDrafts((prev) => ({ ...prev, [item.id]: e.target.value }))}
                    placeholder="پاسخ خود را اینجا بنویسید..."
                    disabled={locked}
                    rows={3}
                  />
                  <Button
                    size="sm"
                    className="w-full"
                    disabled={locked || !drafts[item.id]?.trim() || submittingId === item.id}
                    onClick={() => handleSubmit(item.id)}
                  >
                    {locked ? "بررسی شده" : item.submission ? "به‌روزرسانی ارسال" : "ارسال تکلیف"}
                  </Button>

                  {item.submission?.reviewedAt && (
                    <div className="rounded-md bg-muted p-2 text-sm">
                      {item.submission.score !== null && (
                        <p className="font-medium">نمره: {item.submission.score}</p>
                      )}
                      {item.submission.feedback && <p>{item.submission.feedback}</p>}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
    </AppShell>
  );
}
