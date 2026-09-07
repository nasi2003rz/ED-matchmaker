"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  fetchAssignmentDetail,
  reviewSubmission,
  type AssignmentDetail,
} from "@/lib/assignments-api";
import { HOMEWORK_STATUS_LABELS, HOMEWORK_STATUS_VARIANT } from "@/lib/homework-labels";

export default function AssignmentDetailPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string; assignmentId: string }>();
  const { id: classId, assignmentId } = params;

  const [assignment, setAssignment] = useState<AssignmentDetail | null>(null);
  const [scoreDrafts, setScoreDrafts] = useState<Record<string, string>>({});
  const [feedbackDrafts, setFeedbackDrafts] = useState<Record<string, string>>({});
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchAssignmentDetail(token, classId, assignmentId);
      setAssignment(data);
      setScoreDrafts((prev) => {
        const next = { ...prev };
        for (const s of data.students) {
          if (!(s.student.id in next)) next[s.student.id] = s.submission?.score?.toString() ?? "";
        }
        return next;
      });
      setFeedbackDrafts((prev) => {
        const next = { ...prev };
        for (const s of data.students) {
          if (!(s.student.id in next)) next[s.student.id] = s.submission?.feedback ?? "";
        }
        return next;
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری تکلیف.");
    }
  }, [getAccessToken, classId, assignmentId]);

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

  async function handleReview(studentId: string) {
    const token = getAccessToken();
    if (!token) return;
    setSavingStudentId(studentId);
    try {
      const scoreRaw = scoreDrafts[studentId]?.trim();
      const score = scoreRaw ? Number(scoreRaw) : undefined;
      const feedback = feedbackDrafts[studentId]?.trim() || undefined;
      const updated = await reviewSubmission(token, classId, assignmentId, studentId, {
        score,
        feedback,
      });
      setAssignment(updated);
      toast.success("بازخورد ثبت شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setSavingStudentId(null);
    }
  }

  if (isAuthLoading || assignment === null) {
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
        <h1 className="text-xl font-bold">{assignment.title}</h1>
        <Button variant="outline" size="sm" onClick={() => router.push(`/classes/${classId}`)}>
          بازگشت
        </Button>
      </div>
      {assignment.description && (
        <p className="text-sm text-muted-foreground">{assignment.description}</p>
      )}
      {assignment.dueAt && (
        <p className="text-xs text-muted-foreground">
          مهلت ارسال: {new Date(assignment.dueAt).toLocaleDateString("fa-IR")}
        </p>
      )}

      {assignment.students.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          دانش‌آموزی در این کلاس ثبت‌نام نکرده است.
        </p>
      ) : (
        <div className="space-y-2">
          {assignment.students.map((entry) => (
            <Card key={entry.student.id}>
              <CardContent className="space-y-2 py-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-8">
                      <AvatarFallback>{entry.student.name.slice(0, 1)}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{entry.student.name}</span>
                  </div>
                  <Badge variant={HOMEWORK_STATUS_VARIANT[entry.status]}>
                    {HOMEWORK_STATUS_LABELS[entry.status]}
                  </Badge>
                </div>

                {entry.submission ? (
                  <>
                    <p className="rounded-md bg-muted p-2 text-sm">{entry.submission.content}</p>
                    <p className="text-xs text-muted-foreground">
                      ارسال‌شده: {new Date(entry.submission.submittedAt).toLocaleDateString("fa-IR")}
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="col-span-1 space-y-1">
                        <Label htmlFor={`score-${entry.student.id}`}>نمره</Label>
                        <Input
                          id={`score-${entry.student.id}`}
                          type="number"
                          min={0}
                          max={100}
                          value={scoreDrafts[entry.student.id] ?? ""}
                          onChange={(e) =>
                            setScoreDrafts((prev) => ({ ...prev, [entry.student.id]: e.target.value }))
                          }
                        />
                      </div>
                      <div className="col-span-2 space-y-1">
                        <Label htmlFor={`feedback-${entry.student.id}`}>بازخورد</Label>
                        <Input
                          id={`feedback-${entry.student.id}`}
                          value={feedbackDrafts[entry.student.id] ?? ""}
                          onChange={(e) =>
                            setFeedbackDrafts((prev) => ({
                              ...prev,
                              [entry.student.id]: e.target.value,
                            }))
                          }
                        />
                      </div>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      disabled={savingStudentId === entry.student.id}
                      onClick={() => handleReview(entry.student.id)}
                    >
                      {entry.submission.reviewedAt ? "به‌روزرسانی بازخورد" : "ثبت نمره و بازخورد"}
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">هنوز ارسال نکرده است.</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
