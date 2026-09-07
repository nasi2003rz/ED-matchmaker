"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GraduationCap, Users, Presentation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth, type RoleName } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";

const ROLE_OPTIONS: { role: RoleName; label: string; icon: typeof GraduationCap }[] = [
  { role: "INSTRUCTOR", label: "مربی", icon: Presentation },
  { role: "STUDENT", label: "دانش‌آموز", icon: GraduationCap },
  { role: "PARENT", label: "والد", icon: Users },
];

export const ROLE_LABELS: Record<RoleName, string> = {
  INSTRUCTOR: "مربی",
  STUDENT: "دانش‌آموز",
  PARENT: "والد",
};

export function RolePicker({ compact = false }: { compact?: boolean }) {
  const { user, addRole } = useAuth();
  const [pendingRole, setPendingRole] = useState<RoleName | null>(null);

  const activeRoles = new Set(user?.roles ?? []);
  const available = ROLE_OPTIONS.filter((o) => !activeRoles.has(o.role));

  if (available.length === 0) return null;

  async function handlePick(role: RoleName) {
    setPendingRole(role);
    try {
      await addRole(role);
      toast.success("نقش با موفقیت اضافه شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setPendingRole(null);
    }
  }

  if (compact) {
    return (
      <div className="flex flex-wrap justify-center gap-2">
        {available.map(({ role, label }) => (
          <Button
            key={role}
            variant="outline"
            size="sm"
            disabled={pendingRole !== null}
            onClick={() => handlePick(role)}
          >
            {pendingRole === role ? "..." : `+ ${label}`}
          </Button>
        ))}
      </div>
    );
  }

  return (
    <div className="grid w-full max-w-sm gap-3 sm:grid-cols-3 sm:max-w-lg">
      {available.map(({ role, label, icon: Icon }) => (
        <Card
          key={role}
          className="cursor-pointer transition-colors hover:border-primary"
          onClick={() => handlePick(role)}
        >
          <CardContent className="flex flex-col items-center gap-2 py-6">
            <Icon className="size-6 text-primary" />
            <span className="font-medium">
              {pendingRole === role ? "در حال افزودن..." : label}
            </span>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
