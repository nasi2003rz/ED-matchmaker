"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  fetchCategories,
  fetchLocations,
  fetchInstructorProfile,
  updateInstructorProfile,
  uploadInstructorAvatar,
  type Category,
  type Location,
  type InstructorProfile,
  type DeliveryMode,
} from "@/lib/instructor-api";

const DELIVERY_LABELS: Record<DeliveryMode, string> = {
  ONLINE: "آنلاین",
  OFFLINE: "حضوری",
  BOTH: "آنلاین و حضوری",
};

export default function InstructorOnboardingPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [profile, setProfile] = useState<InstructorProfile | null>(null);

  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [experienceYears, setExperienceYears] = useState("");
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [categoryIds, setCategoryIds] = useState<Set<string>>(new Set());
  const [subjectsText, setSubjectsText] = useState("");

  useEffect(() => {
    if (isAuthLoading) return;

    const token = getAccessToken();
    if (!token) {
      router.replace("/login");
      return;
    }
    if (!user?.roles.includes("INSTRUCTOR")) {
      router.replace("/");
      return;
    }

    Promise.all([
      fetchCategories(token),
      fetchLocations(token),
      fetchInstructorProfile(token),
    ])
      .then(([cats, locs, me]) => {
        setCategories(cats);
        setLocations(locs);
        setProfile(me);
        setPhone(me.phone ?? "");
        setBio(me.bio ?? "");
        setExperienceYears(me.experienceYears?.toString() ?? "");
        setDeliveryMode(me.deliveryMode ?? null);
        setLocationId(me.location?.id ?? null);
        setCategoryIds(new Set(me.categories.map((c) => c.id)));
        setSubjectsText(me.subjects.join("، "));
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری اطلاعات.");
      })
      .finally(() => setIsLoading(false));
  }, [isAuthLoading, getAccessToken, user, router]);

  function toggleCategory(id: string) {
    setCategoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleAvatarChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const token = getAccessToken();
    if (!token) return;

    setIsUploadingAvatar(true);
    try {
      const updated = await uploadInstructorAvatar(token, file);
      setProfile(updated);
      toast.success("عکس پروفایل به‌روزرسانی شد.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در آپلود عکس.");
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const token = getAccessToken();
    if (!token) return;

    setIsSaving(true);
    try {
      await updateInstructorProfile(token, {
        phone: phone || undefined,
        bio: bio || undefined,
        experienceYears: experienceYears ? Number(experienceYears) : undefined,
        deliveryMode: deliveryMode ?? undefined,
        locationId: locationId ?? undefined,
        categoryIds: Array.from(categoryIds),
        subjects: subjectsText
          .split(/[،,]/)
          .map((s) => s.trim())
          .filter(Boolean),
      });
      toast.success("پروفایل مربی‌گری ذخیره شد.");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 p-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-40 w-full max-w-md" />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>تکمیل پروفایل مربی‌گری</CardTitle>
          <CardDescription>
            این اطلاعات به دانش‌آموزان و اولیا کمک می‌کند شما را بهتر بشناسند.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="flex items-center gap-4">
              <Avatar className="size-16">
                <AvatarImage src={profile?.avatarUrl ?? undefined} />
                <AvatarFallback>{isUploadingAvatar ? "..." : "؟"}</AvatarFallback>
              </Avatar>
              <div className="space-y-1.5">
                <Label htmlFor="avatar">عکس پروفایل</Label>
                <Input
                  id="avatar"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={handleAvatarChange}
                  disabled={isUploadingAvatar}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="phone">شماره تماس</Label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="09xxxxxxxxx"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">بیوگرافی کوتاه</Label>
              <Textarea
                id="bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                rows={3}
                maxLength={500}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="experience">سابقه‌ی تدریس (سال)</Label>
              <Input
                id="experience"
                type="number"
                min={0}
                max={80}
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label>نحوه‌ی تدریس</Label>
              <Select
                value={deliveryMode}
                onValueChange={(v) => setDeliveryMode(v as DeliveryMode | null)}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب کنید">
                    {(v: DeliveryMode | null) => (v ? DELIVERY_LABELS[v] : "انتخاب کنید")}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(DELIVERY_LABELS) as DeliveryMode[]).map((mode) => (
                    <SelectItem key={mode} value={mode}>
                      {DELIVERY_LABELS[mode]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {deliveryMode !== "ONLINE" && (
              <div className="space-y-1.5">
                <Label>شهر</Label>
                <Select value={locationId} onValueChange={(v) => setLocationId(v)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="انتخاب شهر">
                      {(v: string | null) =>
                        locations.find((loc) => loc.id === v)?.city ?? "انتخاب شهر"
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {locations.map((loc) => (
                      <SelectItem key={loc.id} value={loc.id}>
                        {loc.city}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label>دسته‌بندی‌های تدریس</Label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map((category) => (
                  <label
                    key={category.id}
                    className="flex items-center gap-2 rounded-md border border-border p-2 text-sm"
                  >
                    <Checkbox
                      checked={categoryIds.has(category.id)}
                      onCheckedChange={() => toggleCategory(category.id)}
                    />
                    {category.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="subjects">موضوعات (با ویرگول جدا کنید)</Label>
              <Input
                id="subjects"
                value={subjectsText}
                onChange={(e) => setSubjectsText(e.target.value)}
                placeholder="مثلاً: شنا، والیبال"
              />
            </div>
          </form>
        </CardContent>
        <CardFooter className="justify-end gap-2">
          <Button variant="outline" onClick={() => router.push("/")}>
            بعداً
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? "در حال ذخیره..." : "ذخیره"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
