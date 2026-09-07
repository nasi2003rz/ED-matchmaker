"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { fetchInstructorProfile } from "@/lib/instructor-api";

/** Prompts the instructor to finish their teaching profile (categories set). */
export function InstructorProfileNudge() {
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
    <Card>
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
