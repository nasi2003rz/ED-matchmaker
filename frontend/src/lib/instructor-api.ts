import { apiFetch } from "./api";

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Location {
  id: string;
  city: string;
  province: string | null;
  country: string;
}

export type DeliveryMode = "ONLINE" | "OFFLINE" | "BOTH";

export interface InstructorProfile {
  id: string;
  experienceYears: number | null;
  deliveryMode: DeliveryMode | null;
  subjects: string[];
  location: Location | null;
  categories: Category[];
  phone: string | null;
  bio: string | null;
  avatarUrl: string | null;
}

export interface UpdateInstructorProfileInput {
  phone?: string;
  bio?: string;
  experienceYears?: number;
  deliveryMode?: DeliveryMode;
  locationId?: string;
  categoryIds?: string[];
  subjects?: string[];
}

export function fetchCategories(accessToken: string) {
  return apiFetch<Category[]>("/categories", { accessToken });
}

export function fetchLocations(accessToken: string) {
  return apiFetch<Location[]>("/locations", { accessToken });
}

export function fetchInstructorProfile(accessToken: string) {
  return apiFetch<InstructorProfile>("/instructors/me", { accessToken });
}

export function updateInstructorProfile(
  accessToken: string,
  input: UpdateInstructorProfileInput,
) {
  return apiFetch<InstructorProfile>("/instructors/me", {
    method: "PATCH",
    accessToken,
    body: JSON.stringify(input),
  });
}

export function uploadInstructorAvatar(accessToken: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiFetch<InstructorProfile>("/instructors/me/avatar", {
    method: "POST",
    accessToken,
    body: formData,
  });
}
