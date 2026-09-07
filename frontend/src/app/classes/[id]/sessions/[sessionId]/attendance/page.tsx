"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  fetchSessionAttendance,
  markAttendance,
  type SessionAttendanceEntry,
  type AttendanceStatus,
} from "@/lib/attendance-api";
import { ATTENDANCE_LABELS, ATTENDANCE_ORDER } from "@/lib/attendance-labels";
import { cn } from "@/lib/utils";

export default function SessionAttendancePage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string; sessionId: string }>();
  const { id: classId, sessionId } = params;

  const [entries, setEntries] = useState<SessionAttendanceEntry[] | null>(null);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchSessionAttendance(token, classId, sessionId);
      setEntries(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری حضور و غیاب.");
    }
  }, [getAccessToken, classId, sessionId]);

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

  async function handleMark(studentId: string, status: AttendanceStatus) {
    const token = getAccessToken();
    if (!token) return;
    setSavingStudentId(studentId);
    try {
      const updated = await markAttendance(token, classId, sessionId, studentId, status);
      setEntries(updated);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setSavingStudentId(null);
    }
  }

  if (isAuthLoading || entries === null) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">ثبت حضور و غیاب</h1>
        <Button variant="outline" size="sm" onClick={() => router.push(`/classes/${classId}`)}>
          بازگشت
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          دانش‌آموزی در این کلاس ثبت‌نام نکرده است.
        </p>
      ) : (
        <div className="space-y-2">
          {entries.map((entry) => (
            <Card key={entry.student.id}>
              <CardContent className="space-y-2 py-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarFallback>{entry.student.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">{entry.student.name}</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {ATTENDANCE_ORDER.map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={entry.status === status ? "default" : "outline"}
                      disabled={savingStudentId === entry.student.id}
                      onClick={() => handleMark(entry.student.id, status)}
                      className={cn(
                        entry.status === status &&
                          status === "ABSENT" &&
                          "bg-destructive text-destructive-foreground hover:bg-destructive/80",
                        entry.status === status &&
                          status === "LATE" &&
                          "bg-warning text-warning-foreground hover:bg-warning/80",
                        entry.status === status &&
                          status === "EXCUSED" &&
                          "bg-info text-info-foreground hover:bg-info/80",
                        entry.status === status && status === "PRESENT" && "bg-success text-success-foreground hover:bg-success/80",
                      )}
                    >
                      {ATTENDANCE_LABELS[status]}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
