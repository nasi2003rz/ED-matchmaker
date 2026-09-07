"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { RolePicker, ROLE_LABELS } from "@/components/role-picker";
import { fetchInstructorProfile } from "@/lib/instructor-api";

function InstructorProfileNudge() {
  const { getAccessToken } = useAuth();
  const [isIncomplete, setIsIncomplete] = useState(false);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    fetchInstructorProfile(token)
      .then((profile) => setIsIncomplete(profile.categories.length === 0))
      .catch(() => undefined);
  }, [getAccessToken]);

  if (!isIncomplete) return null;

  return (
    <Card className="w-full max-w-sm text-start">
      <CardContent className="flex items-center justify-between gap-3 py-4">
        <p className="text-sm">پروفایل مربی‌گری خود را تکمیل کنید.</p>
        <Link
          href="/onboarding/instructor"
          className={cn(buttonVariants({ size: "sm" }))}
        >
          تکمیل پروفایل
        </Link>
      </CardContent>
    </Card>
  );
}

export default function Home() {
  const { user, isLoading, logout } = useAuth();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 p-6">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-4 w-56" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-2xl font-bold">پلتفرم کلاس و دوره</h1>
        <p className="max-w-sm text-muted-foreground">
          مدیریت کلاس، دانش‌آموزان، حضور و غیاب و تکالیف — همه در یک جا.
        </p>
        <div className="flex gap-3">
          <Link href="/register" className={cn(buttonVariants())}>
            ثبت‌نام
          </Link>
          <Link href="/login" className={cn(buttonVariants({ variant: "outline" }))}>
            ورود
          </Link>
        </div>
      </div>
    );
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (user.roles.length === 0) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold">خوش آمدید، {user.name}</h1>
          <p className="text-muted-foreground">
            برای شروع، مشخص کنید با چه نقشی از پلتفرم استفاده می‌کنید.
          </p>
        </div>
        <RolePicker />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-2xl font-bold">خوش آمدید، {user.name}</h1>
      <p className="text-muted-foreground">{user.email}</p>
      <div className="flex flex-wrap justify-center gap-2">
        {user.roles.map((role) => (
          <Badge key={role} className="bg-accent text-accent-foreground">
            {ROLE_LABELS[role]}
          </Badge>
        ))}
      </div>
      {user.roles.includes("INSTRUCTOR") && (
        <>
          <InstructorProfileNudge />
          <div className="flex flex-wrap justify-center gap-2">
            <Link href="/classes" className={cn(buttonVariants({ variant: "secondary" }))}>
              کلاس‌های من
            </Link>
            <Link href="/students" className={cn(buttonVariants({ variant: "secondary" }))}>
              دانش‌آموزان من
            </Link>
            <Link href="/schedule" className={cn(buttonVariants({ variant: "secondary" }))}>
              برنامه‌ی هفتگی
            </Link>
          </div>
        </>
      )}
      {user.roles.includes("STUDENT") && (
        <Link href="/proposals" className={cn(buttonVariants({ variant: "secondary" }))}>
          پیشنهادهای جلسه
        </Link>
      )}
      <RolePicker compact />
      <Button variant="outline" onClick={handleLogout}>
        خروج
      </Button>
    </div>
  );
}
