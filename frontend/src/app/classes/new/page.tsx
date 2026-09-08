"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { ClassForm } from "@/components/class-form";
import { useAuth } from "@/lib/auth-context";
import { createClass, type ClassInput } from "@/lib/classes-api";
import { AppShell } from "@/components/layout/app-shell";
import { ListSkeleton } from "@/components/common/list-skeleton";

export default function NewClassPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isAuthLoading) return;
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!user?.roles.includes("INSTRUCTOR")) {
      router.replace("/");
    }
  }, [isAuthLoading, getAccessToken, user, router]);

  async function handleSubmit(input: ClassInput) {
    const token = getAccessToken();
    if (!token) return;
    const created = await createClass(token, input);
    toast.success("کلاس ساخته شد.");
    router.push(`/classes/${created.id}`);
  }

  if (isAuthLoading) {
    return (
      <AppShell>
        <ListSkeleton rows={1} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-md">
        <Card>
          <CardHeader>
            <CardTitle>ساخت کلاس جدید</CardTitle>
            <CardDescription>اطلاعات کلاس را وارد کنید.</CardDescription>
          </CardHeader>
          <CardContent>
            <ClassForm onSubmit={handleSubmit} submitLabel="ساخت کلاس" />
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
