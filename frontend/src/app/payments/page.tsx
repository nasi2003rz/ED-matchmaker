"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { activeRole } from "@/components/layout/nav-config";
import { ApiError } from "@/lib/api";
import { fetchMyPayments, type MyPaymentEntry } from "@/lib/payments-api";
import { PAYMENT_STATUS_LABELS, PAYMENT_STATUS_VARIANT, formatToman } from "@/lib/payments-labels";

export default function PaymentsPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const role = user ? activeRole(user.roles) : null;

  const [payments, setPayments] = useState<MyPaymentEntry[] | null>(null);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !role) return;
    try {
      const data = await fetchMyPayments(token, role === "PARENT");
      setPayments(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری پرداخت‌ها.");
    }
  }, [getAccessToken, role]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [isAuthLoading, getAccessToken, router, load]);

  if (isAuthLoading || payments === null) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-4 p-6" dir="rtl">
      <h1 className="text-xl font-bold">پرداخت‌ها</h1>

      {payments.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          فیش پرداختی برای شما ثبت نشده است.
        </p>
      ) : (
        <div className="space-y-2">
          {payments.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-1 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{p.title}</span>
                  <Badge variant={PAYMENT_STATUS_VARIANT[p.status]}>
                    {PAYMENT_STATUS_LABELS[p.status]}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {p.class.name}
                  {p.student ? ` — ${p.student.name}` : ""}
                </p>
                <p className="text-sm">
                  {formatToman(p.paidAmount)} از {formatToman(p.amount)}
                  {p.remaining > 0 && ` — باقیمانده: ${formatToman(p.remaining)}`}
                </p>
                {p.dueDate && (
                  <p className="text-xs text-muted-foreground">
                    سررسید: {new Date(p.dueDate).toLocaleDateString("fa-IR")}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
