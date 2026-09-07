"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { ClassForm } from "@/components/class-form";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  fetchClass,
  updateClass,
  fetchClassEnrollments,
  enrollStudent,
  unenrollStudent,
  fetchInvitationInfo,
  setInvitationStatus,
  fetchInvitationHistory,
  type ClassItem,
  type ClassInput,
  type EnrollmentItem,
  type InvitationInfo,
  type InvitationHistoryItem,
} from "@/lib/classes-api";
import { fetchRoster, type RosterEntry } from "@/lib/students-api";
import { STATUS_LABELS } from "@/lib/classes-labels";
import {
  fetchClassSessions,
  fetchClassProposals,
  createProposal,
  cancelProposal,
  type ClassSessionItem,
  type Proposal,
} from "@/lib/schedule-api";
import { formatDayLabel, formatTime } from "@/lib/calendar-utils";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { fetchAttendanceSummary, type AttendanceSummary } from "@/lib/attendance-api";
import {
  fetchClassAssignments,
  createAssignment,
  type AssignmentListItem,
} from "@/lib/assignments-api";
import {
  fetchClassGrades,
  createGrade,
  deleteGrade,
  type ClassGradesEntry,
  type GradeType,
} from "@/lib/grades-api";
import { GRADE_TYPE_LABELS, GRADE_TYPE_PLACEHOLDER, formatGradeValue } from "@/lib/grades-labels";
import {
  fetchClassAnnouncements,
  createAnnouncement,
  type Announcement,
} from "@/lib/messaging-api";
import {
  fetchClassPayments,
  createPayment,
  recordPayment,
  deletePayment,
  type ClassPaymentsEntry,
} from "@/lib/payments-api";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANT, formatToman } from "@/lib/payments-labels";
import Link from "next/link";

const GRADE_TYPES: GradeType[] = ["NUMERIC", "LETTER", "PASS_FAIL", "TEXT"];

export default function ClassDetailPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const classId = params.id;

  const [klass, setKlass] = useState<ClassItem | null>(null);
  const [enrollments, setEnrollments] = useState<EnrollmentItem[] | null>(null);
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [invitationHistory, setInvitationHistory] = useState<InvitationHistoryItem[] | null>(
    null,
  );
  const [isTogglingInvitation, setIsTogglingInvitation] = useState(false);
  const [sessions, setSessions] = useState<ClassSessionItem[] | null>(null);
  const [proposals, setProposals] = useState<Proposal[] | null>(null);
  const [proposalStudentId, setProposalStudentId] = useState<string | null>(null);
  const [proposalDate, setProposalDate] = useState("");
  const [proposalStartTime, setProposalStartTime] = useState("");
  const [proposalEndTime, setProposalEndTime] = useState("");
  const [isProposing, setIsProposing] = useState(false);
  const [attendanceSummary, setAttendanceSummary] = useState<AttendanceSummary | null>(null);
  const [assignments, setAssignments] = useState<AssignmentListItem[] | null>(null);
  const [newAssignmentTitle, setNewAssignmentTitle] = useState("");
  const [newAssignmentDescription, setNewAssignmentDescription] = useState("");
  const [newAssignmentDueAt, setNewAssignmentDueAt] = useState("");
  const [isCreatingAssignment, setIsCreatingAssignment] = useState(false);
  const [classGrades, setClassGrades] = useState<ClassGradesEntry[] | null>(null);
  const [newGradeStudentId, setNewGradeStudentId] = useState<string | null>(null);
  const [newGradeTitle, setNewGradeTitle] = useState("");
  const [newGradeType, setNewGradeType] = useState<GradeType>("NUMERIC");
  const [newGradeValue, setNewGradeValue] = useState("");
  const [newGradeNote, setNewGradeNote] = useState("");
  const [isCreatingGrade, setIsCreatingGrade] = useState(false);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [newAnnouncementContent, setNewAnnouncementContent] = useState("");
  const [isPostingAnnouncement, setIsPostingAnnouncement] = useState(false);
  const [classPayments, setClassPayments] = useState<ClassPaymentsEntry[] | null>(null);
  const [newPaymentStudentId, setNewPaymentStudentId] = useState<string | null>(null);
  const [newPaymentTitle, setNewPaymentTitle] = useState("");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [newPaymentDueDate, setNewPaymentDueDate] = useState("");
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const [recordDrafts, setRecordDrafts] = useState<Record<string, string>>({});
  const [recordingId, setRecordingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const [
        classData,
        enrollmentData,
        rosterData,
        invitationData,
        invitationHistoryData,
        sessionData,
        proposalData,
        attendanceSummaryData,
        assignmentData,
        gradesData,
        announcementData,
        paymentsData,
      ] = await Promise.all([
        fetchClass(token, classId),
        fetchClassEnrollments(token, classId),
        fetchRoster(token, "ACTIVE"),
        fetchInvitationInfo(token, classId),
        fetchInvitationHistory(token, classId),
        fetchClassSessions(token, classId),
        fetchClassProposals(token, classId),
        fetchAttendanceSummary(token, classId),
        fetchClassAssignments(token, classId),
        fetchClassGrades(token, classId),
        fetchClassAnnouncements(token, classId),
        fetchClassPayments(token, classId),
      ]);
      setKlass(classData);
      setEnrollments(enrollmentData);
      setRoster(rosterData);
      setInvitationInfo(invitationData);
      setInvitationHistory(invitationHistoryData);
      setSessions(sessionData);
      setProposals(proposalData);
      setAttendanceSummary(attendanceSummaryData);
      setAssignments(assignmentData);
      setClassGrades(gradesData);
      setAnnouncements(announcementData);
      setClassPayments(paymentsData);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری کلاس.");
    }
  }, [getAccessToken, classId]);

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

  async function handleUpdate(input: ClassInput) {
    const token = getAccessToken();
    if (!token) return;
    const updated = await updateClass(token, classId, input);
    setKlass(updated);
    const sessionData = await fetchClassSessions(token, classId);
    setSessions(sessionData);
    toast.success("تغییرات ذخیره شد.");
  }

  const enrolledStudentIds = new Set((enrollments ?? []).map((e) => e.student.id));
  const availableToAdd = (roster ?? []).filter(
    (r) => !enrolledStudentIds.has(r.student.id),
  );

  async function handleEnroll() {
    const token = getAccessToken();
    if (!token || !selectedStudentId) return;
    setIsEnrolling(true);
    try {
      const updated = await enrollStudent(token, classId, selectedStudentId);
      setKlass(updated);
      const enrollmentData = await fetchClassEnrollments(token, classId);
      setEnrollments(enrollmentData);
      setSelectedStudentId(null);
      toast.success("دانش‌آموز به کلاس اضافه شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsEnrolling(false);
    }
  }

  async function handleUnenroll(studentId: string) {
    const token = getAccessToken();
    if (!token) return;
    try {
      const updated = await unenrollStudent(token, classId, studentId);
      setKlass(updated);
      const enrollmentData = await fetchClassEnrollments(token, classId);
      setEnrollments(enrollmentData);
      toast.success("دانش‌آموز از کلاس حذف شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    }
  }

  async function handleToggleInvitation() {
    const token = getAccessToken();
    if (!token || !invitationInfo) return;
    const nextStatus = invitationInfo.status === "ACTIVE" ? "REVOKED" : "ACTIVE";
    setIsTogglingInvitation(true);
    try {
      const updated = await setInvitationStatus(token, classId, nextStatus);
      setInvitationInfo(updated);
      toast.success(nextStatus === "REVOKED" ? "لینک دعوت غیرفعال شد." : "لینک دعوت فعال شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsTogglingInvitation(false);
    }
  }

  async function handleCopyLink() {
    if (!invitationInfo) return;
    const url = `${window.location.origin}${invitationInfo.joinPath}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("لینک کپی شد.");
    } catch {
      toast.error("کپی لینک ناموفق بود.");
    }
  }

  async function handlePropose() {
    const token = getAccessToken();
    if (!token || !proposalStudentId || !proposalDate || !proposalStartTime || !proposalEndTime) {
      return;
    }
    setIsProposing(true);
    try {
      const startsAt = new Date(`${proposalDate}T${proposalStartTime}:00`).toISOString();
      const endsAt = new Date(`${proposalDate}T${proposalEndTime}:00`).toISOString();
      const created = await createProposal(token, classId, {
        studentId: proposalStudentId,
        startsAt,
        endsAt,
      });
      setProposals((prev) => (prev ? [created, ...prev] : [created]));
      setProposalStudentId(null);
      setProposalDate("");
      setProposalStartTime("");
      setProposalEndTime("");
      toast.success("پیشنهاد جلسه ارسال شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsProposing(false);
    }
  }

  async function handleCancelProposal(proposalId: string) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await cancelProposal(token, classId, proposalId);
      setProposals(
        (prev) => prev?.map((p) => (p.id === proposalId ? { ...p, status: "CANCELLED" } : p)) ?? prev,
      );
      toast.success("پیشنهاد لغو شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    }
  }

  async function handleCreateAssignment() {
    const token = getAccessToken();
    if (!token || !newAssignmentTitle.trim()) return;
    setIsCreatingAssignment(true);
    try {
      const created = await createAssignment(token, classId, {
        title: newAssignmentTitle.trim(),
        description: newAssignmentDescription.trim() || undefined,
        dueAt: newAssignmentDueAt ? new Date(newAssignmentDueAt).toISOString() : undefined,
      });
      setAssignments((prev) => (prev ? [created, ...prev] : [created]));
      setNewAssignmentTitle("");
      setNewAssignmentDescription("");
      setNewAssignmentDueAt("");
      toast.success("تکلیف ایجاد شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsCreatingAssignment(false);
    }
  }

  async function handleCreateGrade() {
    const token = getAccessToken();
    if (!token || !newGradeStudentId || !newGradeTitle.trim() || !newGradeValue.trim()) return;
    setIsCreatingGrade(true);
    try {
      await createGrade(token, classId, {
        studentId: newGradeStudentId,
        title: newGradeTitle.trim(),
        type: newGradeType,
        value: newGradeValue.trim(),
        note: newGradeNote.trim() || undefined,
      });
      const gradesData = await fetchClassGrades(token, classId);
      setClassGrades(gradesData);
      setNewGradeTitle("");
      setNewGradeValue("");
      setNewGradeNote("");
      toast.success("نمره ثبت شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsCreatingGrade(false);
    }
  }

  async function handleDeleteGrade(gradeId: string) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await deleteGrade(token, classId, gradeId);
      const gradesData = await fetchClassGrades(token, classId);
      setClassGrades(gradesData);
      toast.success("نمره حذف شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    }
  }

  async function handlePostAnnouncement() {
    const token = getAccessToken();
    if (!token || !newAnnouncementContent.trim()) return;
    setIsPostingAnnouncement(true);
    try {
      const created = await createAnnouncement(token, classId, newAnnouncementContent.trim());
      setAnnouncements((prev) => (prev ? [created, ...prev] : [created]));
      setNewAnnouncementContent("");
      toast.success("اعلان ارسال شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsPostingAnnouncement(false);
    }
  }

  async function handleCreatePayment() {
    const token = getAccessToken();
    if (!token || !newPaymentStudentId || !newPaymentTitle.trim() || !newPaymentAmount.trim()) return;
    setIsCreatingPayment(true);
    try {
      await createPayment(token, classId, {
        studentId: newPaymentStudentId,
        title: newPaymentTitle.trim(),
        amount: Number(newPaymentAmount),
        dueDate: newPaymentDueDate ? new Date(newPaymentDueDate).toISOString() : undefined,
      });
      const paymentsData = await fetchClassPayments(token, classId);
      setClassPayments(paymentsData);
      setNewPaymentTitle("");
      setNewPaymentAmount("");
      setNewPaymentDueDate("");
      toast.success("فیش پرداخت ثبت شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsCreatingPayment(false);
    }
  }

  async function handleRecordPayment(paymentId: string) {
    const token = getAccessToken();
    const draft = recordDrafts[paymentId]?.trim();
    if (!token || !draft) return;
    setRecordingId(paymentId);
    try {
      await recordPayment(token, classId, paymentId, Number(draft));
      const paymentsData = await fetchClassPayments(token, classId);
      setClassPayments(paymentsData);
      setRecordDrafts((prev) => ({ ...prev, [paymentId]: "" }));
      toast.success("پرداخت ثبت شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setRecordingId(null);
    }
  }

  async function handleDeletePayment(paymentId: string) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await deletePayment(token, classId, paymentId);
      const paymentsData = await fetchClassPayments(token, classId);
      setClassPayments(paymentsData);
      toast.success("فیش پرداخت حذف شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    }
  }

  if (isAuthLoading || klass === null) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{klass.name}</h1>
        <Badge variant="secondary">{STATUS_LABELS[klass.status]}</Badge>
      </div>

      <Tabs defaultValue="students">
        <TabsList>
          <TabsTrigger value="students">دانش‌آموزان</TabsTrigger>
          <TabsTrigger value="invite">دعوت</TabsTrigger>
          <TabsTrigger value="schedule">زمان‌بندی</TabsTrigger>
          <TabsTrigger value="attendance">حضور و غیاب</TabsTrigger>
          <TabsTrigger value="homework">تکالیف</TabsTrigger>
          <TabsTrigger value="grades">نمرات</TabsTrigger>
          <TabsTrigger value="announcements">اعلان‌ها</TabsTrigger>
          <TabsTrigger value="payments">پرداخت‌ها</TabsTrigger>
          <TabsTrigger value="edit">ویرایش کلاس</TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-4">
          <div className="flex gap-2">
            <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="انتخاب از فهرست دانش‌آموزان">
                  {(v: string | null) =>
                    availableToAdd.find((r) => r.student.id === v)?.student.name ??
                    "انتخاب از فهرست دانش‌آموزان"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {availableToAdd.length === 0 ? (
                  <div className="p-2 text-sm text-muted-foreground">
                    دانش‌آموزی برای افزودن نیست.
                  </div>
                ) : (
                  availableToAdd.map((r) => (
                    <SelectItem key={r.student.id} value={r.student.id}>
                      {r.student.name}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
            <Button
              onClick={handleEnroll}
              disabled={!selectedStudentId || isEnrolling}
            >
              افزودن
            </Button>
          </div>

          {enrollments === null || enrollments.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              هنوز دانش‌آموزی در این کلاس ثبت‌نام نکرده است.
            </p>
          ) : (
            <div className="space-y-2">
              {enrollments.map((e) => (
                <Card key={e.id}>
                  <CardContent className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-8">
                        <AvatarFallback>{e.student.name.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="text-sm font-medium">{e.student.name}</div>
                        <div className="text-xs text-muted-foreground">{e.student.email}</div>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUnenroll(e.student.id)}
                    >
                      حذف
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invite" className="space-y-4">
          {invitationInfo === null ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <>
              <Card>
                <CardContent className="space-y-3 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">لینک دعوت به کلاس</span>
                    <Badge variant={invitationInfo.status === "ACTIVE" ? "secondary" : "destructive"}>
                      {invitationInfo.status === "ACTIVE" ? "فعال" : "غیرفعال"}
                    </Badge>
                  </div>
                  <p className="break-all rounded-md bg-muted p-2 text-xs text-muted-foreground">
                    {typeof window !== "undefined"
                      ? `${window.location.origin}${invitationInfo.joinPath}`
                      : invitationInfo.joinPath}
                  </p>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCopyLink}>
                      کپی لینک
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isTogglingInvitation}
                      onClick={handleToggleInvitation}
                    >
                      {invitationInfo.status === "ACTIVE" ? "غیرفعال کردن لینک" : "فعال کردن لینک"}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    هر کسی این لینک را داشته باشد می‌تواند با ثبت‌نام یا ورود به این کلاس بپیوندد.
                  </p>
                </CardContent>
              </Card>

              <div>
                <p className="mb-2 text-sm font-medium">
                  افرادی که از این لینک پیوسته‌اند ({invitationInfo.acceptedCount})
                </p>
                {invitationHistory === null || invitationHistory.length === 0 ? (
                  <p className="text-sm text-muted-foreground">هنوز کسی از این لینک نپیوسته است.</p>
                ) : (
                  <div className="space-y-2">
                    {invitationHistory.map((item) => (
                      <Card key={item.id}>
                        <CardContent className="flex items-center justify-between py-2 text-sm">
                          <div>
                            <div className="font-medium">{item.student.name}</div>
                            <div className="text-xs text-muted-foreground">
                              {item.student.email}
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(item.acceptedAt).toLocaleDateString("fa-IR")}
                          </span>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4">
          {klass.classType === "GROUP" ? (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                جلسات این کلاس بر اساس روزها و ساعت تعیین‌شده در «ویرایش کلاس» به‌صورت خودکار
                ساخته می‌شوند.
              </p>
              {sessions === null || sessions.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  جلسه‌ای تعریف نشده است.
                </p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((s) => (
                    <Card key={s.id}>
                      <CardContent className="py-2.5 text-sm">
                        {formatDayLabel(new Date(s.startsAt))} — {formatTime(s.startsAt)} تا{" "}
                        {formatTime(s.endsAt)}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <>
              <Card>
                <CardContent className="space-y-3 py-4">
                  <p className="text-sm font-medium">پیشنهاد جلسه جدید</p>
                  <div className="space-y-1.5">
                    <Label>دانش‌آموز</Label>
                    <Select value={proposalStudentId} onValueChange={setProposalStudentId}>
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="انتخاب دانش‌آموز">
                          {(v: string | null) =>
                            enrollments?.find((e) => e.student.id === v)?.student.name ??
                            "انتخاب دانش‌آموز"
                          }
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent>
                        {(enrollments ?? []).map((e) => (
                          <SelectItem key={e.student.id} value={e.student.id}>
                            {e.student.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="proposal-date">تاریخ</Label>
                      <Input
                        id="proposal-date"
                        type="date"
                        value={proposalDate}
                        onChange={(e) => setProposalDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="proposal-start">شروع</Label>
                      <Input
                        id="proposal-start"
                        type="time"
                        value={proposalStartTime}
                        onChange={(e) => setProposalStartTime(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="proposal-end">پایان</Label>
                      <Input
                        id="proposal-end"
                        type="time"
                        value={proposalEndTime}
                        onChange={(e) => setProposalEndTime(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button
                    className="w-full"
                    disabled={
                      isProposing ||
                      !proposalStudentId ||
                      !proposalDate ||
                      !proposalStartTime ||
                      !proposalEndTime
                    }
                    onClick={handlePropose}
                  >
                    {isProposing ? "در حال ارسال..." : "ارسال پیشنهاد"}
                  </Button>
                </CardContent>
              </Card>

              <div className="space-y-2">
                <p className="text-sm font-medium">پیشنهادهای ارسال‌شده</p>
                {proposals === null || proposals.length === 0 ? (
                  <p className="text-sm text-muted-foreground">پیشنهادی ارسال نشده است.</p>
                ) : (
                  proposals.map((p) => (
                    <Card key={p.id}>
                      <CardContent className="flex items-center justify-between py-2.5 text-sm">
                        <div>
                          <div className="font-medium">{p.student?.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {formatDayLabel(new Date(p.startsAt))} — {formatTime(p.startsAt)}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {p.status === "PENDING"
                              ? "در انتظار"
                              : p.status === "ACCEPTED"
                                ? "پذیرفته‌شده"
                                : p.status === "REJECTED"
                                  ? "ردشده"
                                  : "لغوشده"}
                          </Badge>
                          {p.status === "PENDING" && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCancelProposal(p.id)}
                            >
                              لغو
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </>
          )}
        </TabsContent>

        <TabsContent value="attendance" className="space-y-4">
          <Card>
            <CardContent className="space-y-2 py-4">
              <p className="text-sm font-medium">نرخ حضور کلاس</p>
              <p className="text-2xl font-bold">
                {attendanceSummary?.overallRate !== null && attendanceSummary?.overallRate !== undefined
                  ? `${Math.round(attendanceSummary.overallRate * 100)}٪`
                  : "—"}
              </p>
              {attendanceSummary && attendanceSummary.perStudent.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {attendanceSummary.perStudent.map((p) => (
                    <div key={p.student.id} className="flex items-center justify-between text-sm">
                      <span>{p.student.name}</span>
                      <span className="text-muted-foreground">
                        {p.rate !== null ? `${Math.round(p.rate * 100)}٪` : "—"} ({p.markedCount}{" "}
                        جلسه ثبت‌شده)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="space-y-2">
            <p className="text-sm font-medium">جلسات</p>
            {sessions === null || sessions.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                هنوز جلسه‌ای ثبت نشده است.
              </p>
            ) : (
              sessions.map((s) => (
                <Card key={s.id}>
                  <CardContent className="flex items-center justify-between py-2.5 text-sm">
                    <span>
                      {formatDayLabel(new Date(s.startsAt))} — {formatTime(s.startsAt)}
                    </span>
                    <Link
                      href={`/classes/${classId}/sessions/${s.id}/attendance`}
                      className="text-sm text-primary underline underline-offset-4"
                    >
                      ثبت حضور
                    </Link>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="homework" className="space-y-4">
          <Card>
            <CardContent className="space-y-3 py-4">
              <p className="text-sm font-medium">تکلیف جدید</p>
              <div className="space-y-1.5">
                <Label htmlFor="assignment-title">عنوان</Label>
                <Input
                  id="assignment-title"
                  value={newAssignmentTitle}
                  onChange={(e) => setNewAssignmentTitle(e.target.value)}
                  placeholder="مثلاً تمرین صفحه ۱۲"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assignment-description">توضیحات (اختیاری)</Label>
                <Input
                  id="assignment-description"
                  value={newAssignmentDescription}
                  onChange={(e) => setNewAssignmentDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assignment-due">مهلت ارسال (اختیاری)</Label>
                <Input
                  id="assignment-due"
                  type="date"
                  value={newAssignmentDueAt}
                  onChange={(e) => setNewAssignmentDueAt(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={!newAssignmentTitle.trim() || isCreatingAssignment}
                onClick={handleCreateAssignment}
              >
                {isCreatingAssignment ? "در حال ایجاد..." : "ایجاد تکلیف"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {assignments === null || assignments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                هنوز تکلیفی تعریف نشده است.
              </p>
            ) : (
              assignments.map((a) => (
                <Link key={a.id} href={`/classes/${classId}/assignments/${a.id}`}>
                  <Card className="transition-colors hover:bg-muted/50">
                    <CardContent className="space-y-1 py-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{a.title}</span>
                        {a.dueAt && (
                          <span className="text-xs text-muted-foreground">
                            مهلت: {new Date(a.dueAt).toLocaleDateString("fa-IR")}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {a.submittedCount} از {a.studentCount} ارسال شده — {a.reviewedCount} بررسی شده
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="grades" className="space-y-4">
          <Card>
            <CardContent className="space-y-3 py-4">
              <p className="text-sm font-medium">نمره‌ی جدید</p>
              <div className="space-y-1.5">
                <Label>دانش‌آموز</Label>
                <Select value={newGradeStudentId} onValueChange={setNewGradeStudentId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="انتخاب دانش‌آموز">
                      {(v: string | null) =>
                        enrollments?.find((e) => e.student.id === v)?.student.name ??
                        "انتخاب دانش‌آموز"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(enrollments ?? []).map((e) => (
                      <SelectItem key={e.student.id} value={e.student.id}>
                        {e.student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grade-title">عنوان</Label>
                <Input
                  id="grade-title"
                  value={newGradeTitle}
                  onChange={(e) => setNewGradeTitle(e.target.value)}
                  placeholder="مثلاً امتحان میان‌ترم"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label>نوع نمره</Label>
                  <Select
                    value={newGradeType}
                    onValueChange={(v) => setNewGradeType(v as GradeType)}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="نوع">
                        {(v: GradeType) => GRADE_TYPE_LABELS[v]}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {GRADE_TYPES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {GRADE_TYPE_LABELS[t]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="grade-value">مقدار</Label>
                  <Input
                    id="grade-value"
                    value={newGradeValue}
                    onChange={(e) => setNewGradeValue(e.target.value)}
                    placeholder={GRADE_TYPE_PLACEHOLDER[newGradeType]}
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="grade-note">یادداشت (اختیاری)</Label>
                <Input
                  id="grade-note"
                  value={newGradeNote}
                  onChange={(e) => setNewGradeNote(e.target.value)}
                />
              </div>
              <Button
                className="w-full"
                disabled={
                  !newGradeStudentId ||
                  !newGradeTitle.trim() ||
                  !newGradeValue.trim() ||
                  isCreatingGrade
                }
                onClick={handleCreateGrade}
              >
                {isCreatingGrade ? "در حال ثبت..." : "ثبت نمره"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {classGrades === null || classGrades.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                دانش‌آموزی در این کلاس ثبت‌نام نکرده است.
              </p>
            ) : (
              classGrades.map((entry) => (
                <div key={entry.student.id} className="space-y-1.5">
                  <p className="text-sm font-medium">{entry.student.name}</p>
                  {entry.grades.length === 0 ? (
                    <p className="text-xs text-muted-foreground">هنوز نمره‌ای ثبت نشده است.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {entry.grades.map((g) => (
                        <Card key={g.id}>
                          <CardContent className="flex items-center justify-between py-2.5 text-sm">
                            <div>
                              <div className="font-medium">
                                {g.title}
                                <span className="ms-2 text-xs text-muted-foreground">
                                  ({GRADE_TYPE_LABELS[g.type]})
                                </span>
                              </div>
                              <div className="text-muted-foreground">
                                {formatGradeValue(g.type, g.value)}
                                {g.note ? ` — ${g.note}` : ""}
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteGrade(g.id)}
                            >
                              حذف
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="announcements" className="space-y-4">
          <Card>
            <CardContent className="space-y-3 py-4">
              <p className="text-sm font-medium">اعلان جدید برای همه‌ی دانش‌آموزان این کلاس</p>
              <Textarea
                value={newAnnouncementContent}
                onChange={(e) => setNewAnnouncementContent(e.target.value)}
                placeholder="متن اعلان را بنویسید..."
                rows={3}
              />
              <Button
                className="w-full"
                disabled={!newAnnouncementContent.trim() || isPostingAnnouncement}
                onClick={handlePostAnnouncement}
              >
                {isPostingAnnouncement ? "در حال ارسال..." : "ارسال اعلان"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-2">
            {announcements === null || announcements.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                هنوز اعلانی ارسال نشده است.
              </p>
            ) : (
              announcements.map((a) => (
                <Card key={a.id}>
                  <CardContent className="space-y-1 py-3">
                    <p className="text-sm">{a.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString("fa-IR")}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="payments" className="space-y-4">
          <Card>
            <CardContent className="space-y-3 py-4">
              <p className="text-sm font-medium">فیش پرداخت جدید</p>
              <div className="space-y-1.5">
                <Label>دانش‌آموز</Label>
                <Select value={newPaymentStudentId} onValueChange={setNewPaymentStudentId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="انتخاب دانش‌آموز">
                      {(v: string | null) =>
                        enrollments?.find((e) => e.student.id === v)?.student.name ??
                        "انتخاب دانش‌آموز"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {(enrollments ?? []).map((e) => (
                      <SelectItem key={e.student.id} value={e.student.id}>
                        {e.student.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="payment-title">عنوان</Label>
                <Input
                  id="payment-title"
                  value={newPaymentTitle}
                  onChange={(e) => setNewPaymentTitle(e.target.value)}
                  placeholder="مثلاً شهریه‌ی مهر"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="payment-amount">مبلغ (تومان)</Label>
                  <Input
                    id="payment-amount"
                    type="number"
                    min={1}
                    value={newPaymentAmount}
                    onChange={(e) => setNewPaymentAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="payment-due">سررسید (اختیاری)</Label>
                  <Input
                    id="payment-due"
                    type="date"
                    value={newPaymentDueDate}
                    onChange={(e) => setNewPaymentDueDate(e.target.value)}
                  />
                </div>
              </div>
              <Button
                className="w-full"
                disabled={
                  !newPaymentStudentId ||
                  !newPaymentTitle.trim() ||
                  !newPaymentAmount.trim() ||
                  isCreatingPayment
                }
                onClick={handleCreatePayment}
              >
                {isCreatingPayment ? "در حال ثبت..." : "ثبت فیش"}
              </Button>
            </CardContent>
          </Card>

          <div className="space-y-3">
            {classPayments === null || classPayments.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                دانش‌آموزی در این کلاس ثبت‌نام نکرده است.
              </p>
            ) : (
              classPayments.map((entry) => (
                <div key={entry.student.id} className="space-y-1.5">
                  <p className="text-sm font-medium">{entry.student.name}</p>
                  {entry.payments.length === 0 ? (
                    <p className="text-xs text-muted-foreground">هنوز فیشی ثبت نشده است.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {entry.payments.map((p) => (
                        <Card key={p.id}>
                          <CardContent className="space-y-2 py-3 text-sm">
                            <div className="flex items-center justify-between">
                              <span className="font-medium">{p.title}</span>
                              <Badge variant={PAYMENT_STATUS_VARIANT[p.status]}>
                                {PAYMENT_STATUS_LABELS[p.status]}
                              </Badge>
                            </div>
                            <div className="text-muted-foreground">
                              {formatToman(p.paidAmount)} از {formatToman(p.amount)} — باقیمانده:{" "}
                              {formatToman(p.remaining)}
                            </div>
                            {p.dueDate && (
                              <div className="text-xs text-muted-foreground">
                                سررسید: {new Date(p.dueDate).toLocaleDateString("fa-IR")}
                              </div>
                            )}
                            {p.remaining > 0 && (
                              <div className="flex gap-2">
                                <Input
                                  type="number"
                                  min={1}
                                  max={p.remaining}
                                  placeholder="مبلغ دریافتی"
                                  value={recordDrafts[p.id] ?? ""}
                                  onChange={(e) =>
                                    setRecordDrafts((prev) => ({ ...prev, [p.id]: e.target.value }))
                                  }
                                />
                                <Button
                                  size="sm"
                                  disabled={!recordDrafts[p.id]?.trim() || recordingId === p.id}
                                  onClick={() => handleRecordPayment(p.id)}
                                >
                                  ثبت دریافت
                                </Button>
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeletePayment(p.id)}
                            >
                              حذف فیش
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="edit">
          <ClassForm initial={klass} onSubmit={handleUpdate} submitLabel="ذخیره تغییرات" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
