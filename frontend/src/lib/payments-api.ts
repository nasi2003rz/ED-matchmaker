import { apiFetch } from "./api";

export type PaymentStatus = "PAID" | "OVERDUE" | "PARTIALLY_PAID" | "UNPAID";

export interface PaymentEntry {
  id: string;
  title: string;
  amount: number;
  dueDate: string | null;
  paidAmount: number;
  remaining: number;
  status: PaymentStatus;
  createdAt: string;
}

export interface ClassPaymentsEntry {
  student: { id: string; name: string; email: string };
  payments: PaymentEntry[];
}

export interface MyPaymentEntry extends PaymentEntry {
  class: { id: string; name: string };
  student?: { id: string; name: string };
}

// ---- Instructor side ----

export function fetchClassPayments(accessToken: string, classId: string) {
  return apiFetch<ClassPaymentsEntry[]>(`/classes/${classId}/payments`, { accessToken });
}

export function createPayment(
  accessToken: string,
  classId: string,
  input: { studentId: string; title: string; amount: number; dueDate?: string },
) {
  return apiFetch<PaymentEntry>(`/classes/${classId}/payments`, {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function deletePayment(accessToken: string, classId: string, paymentId: string) {
  return apiFetch<{ success: boolean }>(`/classes/${classId}/payments/${paymentId}`, {
    method: "DELETE",
    accessToken,
  });
}

export function recordPayment(
  accessToken: string,
  classId: string,
  paymentId: string,
  amount: number,
) {
  return apiFetch<PaymentEntry>(`/classes/${classId}/payments/${paymentId}/record`, {
    method: "PUT",
    accessToken,
    body: JSON.stringify({ amount }),
  });
}

// ---- Student / Parent side ----

export function fetchMyPayments(accessToken: string, asParent: boolean) {
  return apiFetch<MyPaymentEntry[]>(asParent ? `/payments/me/parent` : `/payments/me`, {
    accessToken,
  });
}
