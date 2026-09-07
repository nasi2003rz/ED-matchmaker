"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchMyProposals, respondToProposal, type Proposal } from "@/lib/schedule-api";
import { formatDayLabel, formatTime } from "@/lib/calendar-utils";

const STATUS_LABELS: Record<Proposal["status"], string> = {
  PENDING: "در انتظار پاسخ",
  ACCEPTED: "پذیرفته‌شده",
  REJECTED: "ردشده",
  CANCELLED: "لغوشده",
};

export default function ProposalsPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchMyProposals(token);
      setProposals(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری پیشنهادها.");
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

  async function handleRespond(proposalId: string, action: "ACCEPT" | "REJECT") {
    const token = getAccessToken();
    if (!token) return;
    setRespondingId(proposalId);
    try {
      await respondToProposal(token, proposalId, action);
      toast.success(action === "ACCEPT" ? "جلسه تأیید شد." : "پیشنهاد رد شد.");
      await load();
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setRespondingId(null);
    }
  }

  if (isAuthLoading || proposals === null) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  const pending = proposals.filter((p) => p.status === "PENDING");
  const others = proposals.filter((p) => p.status !== "PENDING");

  return (
    <div className="mx-auto max-w-md space-y-6 p-6" dir="rtl">
      <h1 className="text-xl font-bold">پیشنهادهای جلسه</h1>

      {proposals.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          پیشنهادی برای شما ثبت نشده است.
        </p>
      ) : (
        <>
          {pending.length > 0 && (
            <div className="space-y-2">
              {pending.map((p) => (
                <Card key={p.id}>
                  <CardContent className="space-y-2 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{p.class?.name}</span>
                      <Badge variant="secondary">{STATUS_LABELS[p.status]}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      مربی: {p.class?.instructorName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatDayLabel(new Date(p.startsAt))} — {formatTime(p.startsAt)} تا{" "}
                      {formatTime(p.endsAt)}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        disabled={respondingId === p.id}
                        onClick={() => handleRespond(p.id, "ACCEPT")}
                      >
                        پذیرفتن
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={respondingId === p.id}
                        onClick={() => handleRespond(p.id, "REJECT")}
                      >
                        رد کردن
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {others.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">تاریخچه</p>
              {others.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex items-center justify-between py-2.5 text-sm">
                    <div>
                      <div className="font-medium">{p.class?.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {formatDayLabel(new Date(p.startsAt))} — {formatTime(p.startsAt)}
                      </div>
                    </div>
                    <Badge variant="secondary">{STATUS_LABELS[p.status]}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
