"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchChildren, linkChild, unlinkChild, type ChildEntry } from "@/lib/children-api";
import { AppShell } from "@/components/layout/app-shell";

export default function ChildrenPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const [children, setChildren] = useState<ChildEntry[] | null>(null);
  const [email, setEmail] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchChildren(token);
      setChildren(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری فرزندان.");
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!user?.roles.includes("PARENT")) {
      router.replace("/");
      return;
    }
    load();
  }, [isAuthLoading, getAccessToken, user, router, load]);

  async function handleLink() {
    const token = getAccessToken();
    if (!token || !email.trim()) return;
    setIsLinking(true);
    try {
      const child = await linkChild(token, email.trim());
      setChildren((prev) => (prev ? [...prev, child] : [child]));
      setEmail("");
      toast.success("فرزند با موفقیت اضافه شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsLinking(false);
    }
  }

  async function handleUnlink(studentId: string) {
    const token = getAccessToken();
    if (!token) return;
    try {
      await unlinkChild(token, studentId);
      setChildren((prev) => prev?.filter((c) => c.id !== studentId) ?? prev);
      toast.success("فرزند حذف شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    }
  }

  if (isAuthLoading || children === null) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-24 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
    <div className="mx-auto max-w-md space-y-4">
      <h1 className="text-xl font-bold">فرزندان</h1>

      <Card>
        <CardContent className="space-y-3 py-4">
          <p className="text-sm font-medium">افزودن فرزند با ایمیل حساب او</p>
          <p className="text-xs text-muted-foreground">
            فرزند باید از قبل با این ایمیل در پلتفرم حساب دانش‌آموزی ساخته باشد (مثلاً از طریق
            پیوستن به یک کلاس).
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="child-email">ایمیل فرزند</Label>
            <Input
              id="child-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!email.trim() || isLinking}
            onClick={handleLink}
          >
            {isLinking ? "در حال افزودن..." : "افزودن"}
          </Button>
        </CardContent>
      </Card>

      {children.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">
          هنوز فرزندی اضافه نکرده‌اید.
        </p>
      ) : (
        <div className="space-y-2">
          {children.map((c) => (
            <Card key={c.id}>
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <Avatar className="size-8">
                    <AvatarFallback>{c.name.slice(0, 1)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="text-sm font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleUnlink(c.id)}>
                  حذف
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
    </AppShell>
  );
}
