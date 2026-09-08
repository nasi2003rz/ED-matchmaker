"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import { fetchSchedule, type ScheduleSession } from "@/lib/schedule-api";
import {
  addDays,
  startOfDay,
  startOfWeek,
  getMonthGrid,
  isSameDay,
  formatDayLabel,
  formatShortDay,
  formatMonthLabel,
  formatTime,
} from "@/lib/calendar-utils";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/app-shell";

type ViewMode = "day" | "week" | "month";

export default function SchedulePage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();

  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [anchor, setAnchor] = useState(() => startOfDay(new Date()));
  const [sessions, setSessions] = useState<ScheduleSession[] | null>(null);

  const range = useMemo(() => {
    if (viewMode === "day") {
      const from = startOfDay(anchor);
      return { from, to: addDays(from, 1) };
    }
    if (viewMode === "week") {
      const from = startOfWeek(anchor);
      return { from, to: addDays(from, 7) };
    }
    const grid = getMonthGrid(anchor);
    return { from: grid[0][0], to: addDays(grid[grid.length - 1][6], 1) };
  }, [viewMode, anchor]);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchSchedule(token, range.from, range.to);
      setSessions(data);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری برنامه.");
    }
  }, [getAccessToken, range]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    if (!user?.roles.includes("INSTRUCTOR")) {
      router.replace("/");
      return;
    }
    setSessions(null);
    load();
  }, [isAuthLoading, getAccessToken, user, router, load]);

  function step(direction: 1 | -1) {
    if (viewMode === "day") setAnchor((a) => addDays(a, direction));
    else if (viewMode === "week") setAnchor((a) => addDays(a, direction * 7));
    else setAnchor((a) => new Date(a.getFullYear(), a.getMonth() + direction, 1));
  }

  if (isAuthLoading || sessions === null) {
    return (
      <AppShell>
        <div className="mx-auto max-w-2xl space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
    <div className="mx-auto max-w-2xl space-y-4">
      <h1 className="text-xl font-bold">برنامه‌ی هفتگی</h1>

      <div className="flex items-center justify-between">
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
          <TabsList>
            <TabsTrigger value="day">روز</TabsTrigger>
            <TabsTrigger value="week">هفته</TabsTrigger>
            <TabsTrigger value="month">ماه</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="flex items-center gap-1">
          <Button variant="outline" size="sm" onClick={() => step(-1)}>
            قبلی
          </Button>
          <Button variant="outline" size="sm" onClick={() => setAnchor(startOfDay(new Date()))}>
            امروز
          </Button>
          <Button variant="outline" size="sm" onClick={() => step(1)}>
            بعدی
          </Button>
        </div>
      </div>

      {viewMode === "day" && (
        <DayView date={anchor} sessions={sessions} />
      )}
      {viewMode === "week" && (
        <WeekView weekStart={startOfWeek(anchor)} sessions={sessions} />
      )}
      {viewMode === "month" && (
        <MonthView
          anchor={anchor}
          sessions={sessions}
          onSelectDay={(d) => {
            setAnchor(d);
            setViewMode("day");
          }}
        />
      )}
    </div>
    </AppShell>
  );
}

function SessionRow({ session }: { session: ScheduleSession }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between py-2.5 text-sm">
        <div>
          <div className="font-medium">{session.class.name}</div>
          <div className="text-xs text-muted-foreground">
            {formatTime(session.startsAt)} تا {formatTime(session.endsAt)}
            {session.class.location && ` — ${session.class.location.city}`}
          </div>
        </div>
        <Badge variant="secondary">{session.class.classType === "GROUP" ? "گروهی" : "خصوصی"}</Badge>
      </CardContent>
    </Card>
  );
}

function DayView({ date, sessions }: { date: Date; sessions: ScheduleSession[] }) {
  const daySessions = sessions
    .filter((s) => isSameDay(new Date(s.startsAt), date))
    .sort((a, b) => a.startsAt.localeCompare(b.startsAt));

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{formatDayLabel(date)}</p>
      {daySessions.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">جلسه‌ای در این روز نیست.</p>
      ) : (
        daySessions.map((s) => <SessionRow key={s.id} session={s} />)
      )}
    </div>
  );
}

function WeekView({ weekStart, sessions }: { weekStart: Date; sessions: ScheduleSession[] }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-4">
      {days.map((day) => {
        const daySessions = sessions
          .filter((s) => isSameDay(new Date(s.startsAt), day))
          .sort((a, b) => a.startsAt.localeCompare(b.startsAt));
        return (
          <div key={day.toISOString()}>
            <p className="mb-1.5 text-sm font-medium text-muted-foreground">
              {formatShortDay(day)}
            </p>
            {daySessions.length === 0 ? (
              <p className="text-xs text-muted-foreground">—</p>
            ) : (
              <div className="space-y-1.5">
                {daySessions.map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MonthView({
  anchor,
  sessions,
  onSelectDay,
}: {
  anchor: Date;
  sessions: ScheduleSession[];
  onSelectDay: (date: Date) => void;
}) {
  const grid = getMonthGrid(anchor);
  const today = startOfDay(new Date());
  const currentMonth = anchor.getMonth();

  return (
    <div className="space-y-2">
      <p className="text-center text-sm font-medium">{formatMonthLabel(anchor)}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
        {["ش", "ی", "د", "س", "چ", "پ", "ج"].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {grid.flat().map((day) => {
          const count = sessions.filter((s) => isSameDay(new Date(s.startsAt), day)).length;
          const inMonth = day.getMonth() === currentMonth;
          return (
            <button
              key={day.toISOString()}
              type="button"
              onClick={() => onSelectDay(day)}
              className={cn(
                "flex aspect-square flex-col items-center justify-center rounded-md text-xs",
                inMonth ? "text-foreground" : "text-muted-foreground/40",
                isSameDay(day, today) && "bg-accent font-semibold",
              )}
            >
              <span>{day.toLocaleDateString("fa-IR", { day: "numeric" })}</span>
              {count > 0 && <span className="mt-0.5 size-1 rounded-full bg-primary" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}
