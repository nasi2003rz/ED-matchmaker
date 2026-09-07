"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { GraduationCap, UserPlus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button, buttonVariants } from "@/components/ui/button";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/layout/page-header";
import { Section } from "@/components/layout/section";
import { ListSkeleton } from "@/components/common/list-skeleton";
import { InstructorProfileNudge } from "@/components/instructor/profile-nudge";
import { RolePicker } from "@/components/role-picker";
import { useAuth } from "@/lib/auth-context";
import { useRequireRole } from "@/hooks/use-require-role";

export default function DashboardPage() {
  const { allowed, user } = useRequireRole("INSTRUCTOR");
  const { logout } = useAuth();
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <AppShell>
      {!allowed ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          <PageHeader
            title={`خوش آمدید، ${user?.name ?? ""}`}
            description="نمای کلی امروز شما — کلاس‌ها، دانش‌آموزان و کارهای در انتظار."
          />

          <div className="space-y-6">
            <InstructorProfileNudge />

            <Section title="کارهای سریع">
              <div className="flex flex-wrap gap-2">
                <Link href="/classes/new" className={cn(buttonVariants())}>
                  <GraduationCap />
                  کلاس جدید
                </Link>
                <Link
                  href="/students"
                  className={cn(buttonVariants({ variant: "secondary" }))}
                >
                  <UserPlus />
                  افزودن دانش‌آموز
                </Link>
              </div>
            </Section>

            <Section title="حساب کاربری">
              <div className="flex flex-wrap items-center gap-2">
                <RolePicker compact />
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  خروج
                </Button>
              </div>
            </Section>
          </div>
        </>
      )}
    </AppShell>
  );
}
