import { apiFetch } from "./api";

export type ClassStatus = "DRAFT" | "ACTIVE" | "FULL" | "COMPLETED" | "CANCELLED" | "ARCHIVED";
export type ClassType = "PRIVATE" | "GROUP";
export type DeliveryMode = "ONLINE" | "OFFLINE" | "BOTH";
export type Weekday = "SAT" | "SUN" | "MON" | "TUE" | "WED" | "THU" | "FRI";
export type FieldType = "TEXT" | "NUMBER" | "BOOLEAN" | "SELECT" | "DATE";

export interface CategoryFieldDefinition {
  id: string;
  fieldKey: string;
  label: string;
  type: FieldType;
  required: boolean;
  options: string[];
  order: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  fieldDefinitions: CategoryFieldDefinition[];
}

export interface Location {
  id: string;
  city: string;
  province: string | null;
}

export interface ClassItem {
  id: string;
  name: string;
  description: string | null;
  status: ClassStatus;
  classType: ClassType;
  deliveryMode: DeliveryMode | null;
  capacity: number | null;
  startDate: string | null;
  endDate: string | null;
  days: Weekday[];
  startTime: string | null;
  endTime: string | null;
  price: number | null;
  numberOfSessions: number | null;
  category: { id: string; name: string; slug: string } | null;
  location: Location | null;
  attributes: Record<string, string>;
  enrolledCount: number;
  seatsLeft: number | null;
  createdAt: string;
}

export interface EnrollmentItem {
  id: string;
  enrolledAt: string;
  student: { id: string; name: string; email: string; avatarUrl: string | null };
}

export interface ClassInput {
  name: string;
  description?: string;
  categoryId?: string;
  locationId?: string;
  deliveryMode?: DeliveryMode;
  classType?: ClassType;
  capacity?: number;
  startDate?: string;
  endDate?: string;
  days?: Weekday[];
  startTime?: string;
  endTime?: string;
  price?: number;
  numberOfSessions?: number;
  attributes?: Record<string, string | number | boolean>;
  status?: ClassStatus;
}

export function fetchCategoriesWithFields(accessToken: string) {
  return apiFetch<Category[]>("/categories", { accessToken });
}

export function fetchClasses(accessToken: string) {
  return apiFetch<ClassItem[]>("/classes", { accessToken });
}

export function fetchClass(accessToken: string, id: string) {
  return apiFetch<ClassItem>(`/classes/${id}`, { accessToken });
}

export function createClass(accessToken: string, input: ClassInput) {
  return apiFetch<ClassItem>("/classes", {
    method: "POST",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function updateClass(accessToken: string, id: string, input: Partial<ClassInput>) {
  return apiFetch<ClassItem>(`/classes/${id}`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function fetchClassEnrollments(accessToken: string, classId: string) {
  return apiFetch<EnrollmentItem[]>(`/classes/${classId}/enrollments`, { accessToken });
}

export function enrollStudent(accessToken: string, classId: string, studentId: string) {
  return apiFetch<ClassItem>(`/classes/${classId}/enrollments`, {
    method: "POST",
    accessToken,
    body: JSON.stringify({ studentId }),
  });
}

export function unenrollStudent(accessToken: string, classId: string, studentId: string) {
  return apiFetch<ClassItem>(`/classes/${classId}/enrollments/${studentId}`, {
    method: "DELETE",
    accessToken,
  });
}

export type InvitationLinkStatus = "ACTIVE" | "REVOKED";

export interface InvitationInfo {
  status: InvitationLinkStatus;
  joinPath: string;
  acceptedCount: number;
}

export interface InvitationHistoryItem {
  id: string;
  acceptedAt: string;
  student: { id: string; name: string; email: string };
}

export function fetchInvitationInfo(accessToken: string, classId: string) {
  return apiFetch<InvitationInfo>(`/classes/${classId}/invitation`, { accessToken });
}

export function setInvitationStatus(
  accessToken: string,
  classId: string,
  status: InvitationLinkStatus,
) {
  return apiFetch<InvitationInfo>(`/classes/${classId}/invitation`, {
    method: "PATCH",
    accessToken,
    body: JSON.stringify({ status }),
  });
}

export function fetchInvitationHistory(accessToken: string, classId: string) {
  return apiFetch<InvitationHistoryItem[]>(`/classes/${classId}/invitations`, { accessToken });
}
