"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchCategoriesWithFields } from "@/lib/classes-api";
import type {
  Category,
  ClassInput,
  ClassItem,
  ClassType,
  DeliveryMode,
  Location,
  Weekday,
} from "@/lib/classes-api";
import { fetchLocations } from "@/lib/instructor-api";
import {
  CLASS_TYPE_LABELS,
  DELIVERY_MODE_LABELS,
  WEEKDAY_LABELS,
  WEEKDAY_ORDER,
} from "@/lib/classes-labels";

interface ClassFormProps {
  initial?: ClassItem;
  onSubmit: (input: ClassInput) => Promise<void>;
  submitLabel: string;
}

export function ClassForm({ initial, onSubmit, submitLabel }: ClassFormProps) {
  const { getAccessToken } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [isLoadingRefs, setIsLoadingRefs] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [name, setName] = useState(initial?.name ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(initial?.category?.id ?? null);
  const [locationId, setLocationId] = useState<string | null>(initial?.location?.id ?? null);
  const [deliveryMode, setDeliveryMode] = useState<DeliveryMode | null>(
    initial?.deliveryMode ?? null,
  );
  const [classType, setClassType] = useState<ClassType>(initial?.classType ?? "GROUP");
  const [capacity, setCapacity] = useState(initial?.capacity?.toString() ?? "");
  const [startDate, setStartDate] = useState(initial?.startDate?.slice(0, 10) ?? "");
  const [endDate, setEndDate] = useState(initial?.endDate?.slice(0, 10) ?? "");
  const [days, setDays] = useState<Set<Weekday>>(new Set(initial?.days ?? []));
  const [startTime, setStartTime] = useState(initial?.startTime ?? "");
  const [endTime, setEndTime] = useState(initial?.endTime ?? "");
  const [price, setPrice] = useState(initial?.price?.toString() ?? "");
  const [numberOfSessions, setNumberOfSessions] = useState(
    initial?.numberOfSessions?.toString() ?? "",
  );
  const [attributes, setAttributes] = useState<Record<string, string | boolean>>(
    initial?.attributes ?? {},
  );

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    Promise.all([fetchCategoriesWithFields(token), fetchLocations(token)])
      .then(([cats, locs]) => {
        setCategories(cats);
        setLocations(locs);
      })
      .catch((err) => {
        toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری اطلاعات.");
      })
      .finally(() => setIsLoadingRefs(false));
  }, [getAccessToken]);

  const selectedCategory = categories.find((c) => c.id === categoryId) ?? null;

  function toggleDay(day: Weekday) {
    setDays((prev) => {
      const next = new Set(prev);
      if (next.has(day)) next.delete(day);
      else next.add(day);
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        name,
        description: description || undefined,
        categoryId: categoryId ?? undefined,
        locationId: locationId ?? undefined,
        deliveryMode: deliveryMode ?? undefined,
        classType,
        capacity: capacity ? Number(capacity) : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        days: Array.from(days),
        startTime: startTime || undefined,
        endTime: endTime || undefined,
        price: price ? Number(price) : undefined,
        numberOfSessions: numberOfSessions ? Number(numberOfSessions) : undefined,
        attributes: selectedCategory ? attributes : undefined,
      });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoadingRefs) {
    return <p className="text-sm text-muted-foreground">در حال بارگذاری...</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5" noValidate dir="rtl">
      <div className="space-y-1.5">
        <Label htmlFor="name">نام کلاس</Label>
        <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">توضیحات</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label>دسته‌بندی</Label>
        <Select
          value={categoryId}
          onValueChange={(v) => {
            setCategoryId(v);
            setAttributes({});
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue placeholder="انتخاب کنید">
              {(v: string | null) => categories.find((c) => c.id === v)?.name ?? "انتخاب کنید"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedCategory && selectedCategory.fieldDefinitions.length > 0 && (
        <div className="space-y-3 rounded-lg border border-border p-3">
          <p className="text-sm font-medium">فیلدهای اختصاصی {selectedCategory.name}</p>
          {selectedCategory.fieldDefinitions.map((def) => (
            <div key={def.fieldKey} className="space-y-1.5">
              <Label htmlFor={`attr-${def.fieldKey}`}>
                {def.label}
                {def.required && <span className="text-destructive"> *</span>}
              </Label>
              {def.type === "SELECT" ? (
                <Select
                  value={(attributes[def.fieldKey] as string) ?? null}
                  onValueChange={(v) =>
                    setAttributes((prev) => ({ ...prev, [def.fieldKey]: v ?? "" }))
                  }
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="انتخاب کنید">
                      {(v: string | null) => v || "انتخاب کنید"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {def.options.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : def.type === "BOOLEAN" ? (
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={Boolean(attributes[def.fieldKey])}
                    onCheckedChange={(checked) =>
                      setAttributes((prev) => ({ ...prev, [def.fieldKey]: checked }))
                    }
                  />
                  <span className="text-sm text-muted-foreground">بله</span>
                </label>
              ) : def.type === "DATE" ? (
                <Input
                  id={`attr-${def.fieldKey}`}
                  type="date"
                  value={(attributes[def.fieldKey] as string)?.slice(0, 10) ?? ""}
                  onChange={(e) =>
                    setAttributes((prev) => ({ ...prev, [def.fieldKey]: e.target.value }))
                  }
                />
              ) : def.type === "NUMBER" ? (
                <Input
                  id={`attr-${def.fieldKey}`}
                  type="number"
                  value={(attributes[def.fieldKey] as string) ?? ""}
                  onChange={(e) =>
                    setAttributes((prev) => ({ ...prev, [def.fieldKey]: e.target.value }))
                  }
                />
              ) : (
                <Input
                  id={`attr-${def.fieldKey}`}
                  value={(attributes[def.fieldKey] as string) ?? ""}
                  onChange={(e) =>
                    setAttributes((prev) => ({ ...prev, [def.fieldKey]: e.target.value }))
                  }
                />
              )}
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label>نحوه‌ی برگزاری</Label>
          <Select value={deliveryMode} onValueChange={(v) => setDeliveryMode(v as DeliveryMode)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="انتخاب کنید">
                {(v: DeliveryMode | null) => (v ? DELIVERY_MODE_LABELS[v] : "انتخاب کنید")}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(DELIVERY_MODE_LABELS) as DeliveryMode[]).map((m) => (
                <SelectItem key={m} value={m}>
                  {DELIVERY_MODE_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label>نوع کلاس</Label>
          <Select value={classType} onValueChange={(v) => setClassType(v as ClassType)}>
            <SelectTrigger className="w-full">
              <SelectValue>{(v: ClassType) => CLASS_TYPE_LABELS[v]}</SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(CLASS_TYPE_LABELS) as ClassType[]).map((t) => (
                <SelectItem key={t} value={t}>
                  {CLASS_TYPE_LABELS[t]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {deliveryMode !== "ONLINE" && (
        <div className="space-y-1.5">
          <Label>شهر</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="انتخاب شهر">
                {(v: string | null) => locations.find((l) => l.id === v)?.city ?? "انتخاب شهر"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {locations.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.city}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label>روزهای برگزاری</Label>
        <div className="grid grid-cols-4 gap-2">
          {WEEKDAY_ORDER.map((day) => (
            <label
              key={day}
              className="flex items-center gap-1.5 rounded-md border border-border p-1.5 text-sm"
            >
              <Checkbox checked={days.has(day)} onCheckedChange={() => toggleDay(day)} />
              {WEEKDAY_LABELS[day]}
            </label>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startTime">ساعت شروع</Label>
          <Input
            id="startTime"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endTime">ساعت پایان</Label>
          <Input
            id="endTime"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="startDate">تاریخ شروع</Label>
          <Input
            id="startDate"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="endDate">تاریخ پایان</Label>
          <Input
            id="endDate"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="capacity">ظرفیت</Label>
          <Input
            id="capacity"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price">شهریه (تومان)</Label>
          <Input
            id="price"
            type="number"
            min={0}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="sessions">تعداد جلسات</Label>
          <Input
            id="sessions"
            type="number"
            min={1}
            value={numberOfSessions}
            onChange={(e) => setNumberOfSessions(e.target.value)}
          />
        </div>
      </div>

      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? "در حال ذخیره..." : submitLabel}
      </Button>
    </form>
  );
}
