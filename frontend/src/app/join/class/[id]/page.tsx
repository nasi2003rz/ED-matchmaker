"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchJoinPreview, acceptJoin, type JoinPreview } from "@/lib/join-api";
import { WEEKDAY_LABELS, WEEKDAY_ORDER } from "@/lib/classes-labels";
import { cn } from "@/lib/utils";
import type { Weekday } from "@/lib/classes-api";

function formatSchedule(preview: JoinPreview): string | null {
  if (preview.days.length === 0) return null;
  const days = WEEKDAY_ORDER.filter((d) => preview.days.includes(d))
    .map((d) => WEEKDAY_LABELS[d as Weekday])
    .join("، ");
  const time =
    preview.startTime && preview.endTime ? ` — ${preview.startTime} تا ${preview.endTime}` : "";
  return `${days}${time}`;
}

export default function JoinClassPage() {
  const params = useParams<{ id: string }>();
  const classId = params.id;
  const router = useRouter();
  const { user, isLoading: isAuthLoading, getAccessToken } = useAuth();

  const [preview, setPreview] = useState<JoinPreview | null | "error">(null);
  const [isJoining, setIsJoining] = useState(false);
  const [joined, setJoined] = useState(false);
  const hasAutoJoined = useRef(false);

  useEffect(() => {
    fetchJoinPreview(classId)
      .then(setPreview)
      .catch(() => setPreview("error"));
  }, [classId]);

  useEffect(() => {
    if (isAuthLoading || !user || hasAutoJoined.current || preview === null || preview === "error") {
      return;
    }
    if (!preview.joinable) return;

    hasAutoJoined.current = true;
    const token = getAccessToken();
    if (!token) return;

    setIsJoining(true);
    acceptJoin(token, classId)
      .then(() => {
        setJoined(true);
        toast.success("با موفقیت به کلاس پیوستید!");
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
      })
      .finally(() => setIsJoining(false));
  }, [isAuthLoading, user, preview, classId, getAccessToken]);

  if (preview === null || isAuthLoading) {
    return (
      <div className="mx-auto max-w-sm space-y-3 p-6">
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (preview === "error") {
    return (
      <div className="flex min-h-full flex-1 items-center justify-center p-6 text-center">
        <p className="text-muted-foreground">این لینک دعوت معتبر نیست.</p>
      </div>
    );
  }

  const schedule = formatSchedule(preview);
  const nextParam = encodeURIComponent(`/join/class/${classId}`);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6" dir="rtl">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{preview.name}</CardTitle>
          <CardDescription>مربی: {preview.instructorName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {preview.description && <p className="text-sm">{preview.description}</p>}
          <div className="space-y-1 text-sm text-muted-foreground">
            {preview.category && <div>دسته‌بندی: {preview.category.name}</div>}
            {preview.location && <div>شهر: {preview.location.city}</div>}
            {schedule && <div>زمان‌بندی: {schedule}</div>}
            {preview.price !== null && <div>شهریه: {preview.price.toLocaleString("fa-IR")} تومان</div>}
          </div>

          {!preview.joinable ? (
            <p className="rounded-md bg-muted p-3 text-center text-sm text-muted-foreground">
              این دعوت‌نامه دیگر معتبر نیست.
            </p>
          ) : joined ? (
            <div className="space-y-2 text-center">
              <p className="text-sm font-medium text-success">
                شما با موفقیت به این کلاس پیوستید.
              </p>
              <Button className="w-full" onClick={() => router.push("/")}>
                رفتن به داشبورد
              </Button>
            </div>
          ) : !user ? (
            <div className="space-y-2">
              <Link
                href={`/register?next=${nextParam}`}
                className={cn(buttonVariants(), "w-full")}
              >
                ثبت‌نام و پیوستن
              </Link>
              <Link
                href={`/login?next=${nextParam}`}
                className={cn(buttonVariants({ variant: "outline" }), "w-full")}
              >
                قبلاً ثبت‌نام کرده‌اید؟ ورود
              </Link>
            </div>
          ) : (
            <Button className="w-full" disabled>
              در حال پیوستن...
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
