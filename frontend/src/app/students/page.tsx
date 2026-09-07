"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  fetchRoster,
  addStudentByEmail,
  updateRosterEntry,
  type RosterEntry,
  type RosterStatus,
} from "@/lib/students-api";

function RosterTable({
  entries,
  onArchiveToggle,
}: {
  entries: RosterEntry[];
  onArchiveToggle: (entry: RosterEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-muted-foreground">
        دانش‌آموزی یافت نشد.
      </p>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>دانش‌آموز</TableHead>
          <TableHead>تلفن</TableHead>
          <TableHead>یادداشت</TableHead>
          <TableHead>عملیات</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {entries.map((entry) => (
          <TableRow key={entry.id}>
            <TableCell>
              <div className="flex items-center gap-2">
                <Avatar className="size-8">
                  <AvatarFallback>{entry.student.name.slice(0, 1)}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">{entry.student.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {entry.student.email}
                  </div>
                </div>
              </div>
            </TableCell>
            <TableCell>{entry.student.phone ?? "—"}</TableCell>
            <TableCell className="max-w-48 truncate">{entry.note ?? "—"}</TableCell>
            <TableCell>
              <Button variant="outline" size="sm" onClick={() => onArchiveToggle(entry)}>
                {entry.status === "ACTIVE" ? "آرشیو" : "بازگردانی"}
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

export default function StudentsPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();

  const [tab, setTab] = useState<RosterStatus>("ACTIVE");
  const [active, setActive] = useState<RosterEntry[] | null>(null);
  const [archived, setArchived] = useState<RosterEntry[] | null>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(
    async (status: RosterStatus) => {
      const token = getAccessToken();
      if (!token) return;
      const data = await fetchRoster(token, status);
      if (status === "ACTIVE") setActive(data);
      else setArchived(data);
    },
    [getAccessToken],
  );

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
    load("ACTIVE").catch((err) => {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری فهرست.");
    });
  }, [isAuthLoading, getAccessToken, user, router, load]);

  function handleTabChange(value: string) {
    const status = value as RosterStatus;
    setTab(status);
    if (status === "ARCHIVED" && archived === null) {
      load("ARCHIVED").catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری فهرست.");
      });
    }
  }

  async function handleAddStudent(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    setIsSubmitting(true);
    try {
      const entry = await addStudentByEmail(token, email);
      setActive((prev) => (prev ? [entry, ...prev] : [entry]));
      toast.success("دانش‌آموز اضافه شد.");
      setEmail("");
      setIsAddOpen(false);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleArchiveToggle(entry: RosterEntry) {
    const token = getAccessToken();
    if (!token) return;
    const nextStatus: RosterStatus = entry.status === "ACTIVE" ? "ARCHIVED" : "ACTIVE";

    try {
      const updated = await updateRosterEntry(token, entry.id, { status: nextStatus });
      setActive((prev) => prev?.filter((e) => e.id !== entry.id) ?? prev);
      setArchived((prev) => prev?.filter((e) => e.id !== entry.id) ?? prev);
      if (updated.status === "ACTIVE") {
        setActive((prev) => (prev ? [updated, ...prev] : [updated]));
      } else {
        setArchived((prev) => (prev ? [updated, ...prev] : [updated]));
      }
      toast.success(
        nextStatus === "ARCHIVED" ? "دانش‌آموز آرشیو شد." : "دانش‌آموز بازگردانده شد.",
      );
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    }
  }

  if (isAuthLoading || active === null) {
    return (
      <div className="mx-auto max-w-2xl space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">دانش‌آموزان من</h1>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={<Button>افزودن دانش‌آموز</Button>} />
          <DialogContent>
            <DialogHeader>
              <DialogTitle>افزودن دانش‌آموز</DialogTitle>
              <DialogDescription>
                ایمیل حساب کاربری دانش‌آموز را وارد کنید. دانش‌آموز باید قبلاً در پلتفرم
                ثبت‌نام کرده و نقش «دانش‌آموز» را فعال کرده باشد.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddStudent} className="space-y-3" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="student-email">ایمیل</Label>
                <Input
                  id="student-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "در حال افزودن..." : "افزودن"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="ACTIVE">فعال</TabsTrigger>
          <TabsTrigger value="ARCHIVED">بایگانی‌شده</TabsTrigger>
        </TabsList>
        <TabsContent value="ACTIVE">
          <RosterTable entries={active ?? []} onArchiveToggle={handleArchiveToggle} />
        </TabsContent>
        <TabsContent value="ARCHIVED">
          {archived === null ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <RosterTable entries={archived} onArchiveToggle={handleArchiveToggle} />
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
