import type { PaymentStatus } from "./payments-api";

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PAID: "پرداخت‌شده",
  PARTIALLY_PAID: "پرداخت ناقص",
  UNPAID: "پرداخت‌نشده",
  OVERDUE: "معوق",
};

export const PAYMENT_STATUS_VARIANT: Record<
  PaymentStatus,
  "secondary" | "destructive" | "outline"
> = {
  PAID: "secondary",
  PARTIALLY_PAID: "outline",
  UNPAID: "outline",
  OVERDUE: "destructive",
};

export function formatToman(amount: number): string {
  return `${amount.toLocaleString("fa-IR")} تومان`;
}
