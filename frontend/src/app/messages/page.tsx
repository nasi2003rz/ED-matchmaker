"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth-context";
import { activeRole } from "@/components/layout/nav-config";
import { ApiError } from "@/lib/api";
import {
  fetchInstructorConversations,
  fetchMyConversations,
  fetchStartableInstructors,
  fetchMyAnnouncements,
  startConversation,
  startConversationAsStudentOrParent,
  type ConversationSummary,
  type Announcement,
} from "@/lib/messaging-api";
import { fetchRoster, type RosterEntry } from "@/lib/students-api";

export default function MessagesPage() {
  const { getAccessToken, isLoading: isAuthLoading, user } = useAuth();
  const router = useRouter();
  const role = user ? activeRole(user.roles) : null;

  const [conversations, setConversations] = useState<ConversationSummary[] | null>(null);
  const [roster, setRoster] = useState<RosterEntry[] | null>(null);
  const [instructors, setInstructors] = useState<{ id: string; name: string }[] | null>(null);
  const [announcements, setAnnouncements] = useState<Announcement[] | null>(null);
  const [showStart, setShowStart] = useState(false);
  const [targetId, setTargetId] = useState<string | null>(null);
  const [content, setContent] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token || !role) return;
    try {
      if (role === "INSTRUCTOR") {
        const [convData, rosterData] = await Promise.all([
          fetchInstructorConversations(token),
          fetchRoster(token, "ACTIVE"),
        ]);
        setConversations(convData);
        setRoster(rosterData);
      } else {
        const [convData, instructorData, announcementData] = await Promise.all([
          fetchMyConversations(token),
          fetchStartableInstructors(token),
          fetchMyAnnouncements(token, role === "PARENT"),
        ]);
        setConversations(convData);
        setInstructors(instructorData);
        setAnnouncements(announcementData);
      }
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری پیام‌ها.");
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

  async function handleStart() {
    const token = getAccessToken();
    if (!token || !targetId || !content.trim()) return;
    setIsStarting(true);
    try {
      const thread =
        role === "INSTRUCTOR"
          ? await startConversation(token, { studentId: targetId, content: content.trim() })
          : await startConversationAsStudentOrParent(token, {
              instructorId: targetId,
              content: content.trim(),
            });
      router.push(`/messages/${thread.id}`);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsStarting(false);
    }
  }

  if (isAuthLoading || conversations === null) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6">
        <Skeleton className="h-8 w-40" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const pickerOptions =
    role === "INSTRUCTOR"
      ? (roster ?? []).map((r) => ({ id: r.student.id, name: r.student.name }))
      : (instructors ?? []);

  return (
    <div className="mx-auto max-w-md space-y-4 p-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">پیام‌ها</h1>
        <Button size="sm" onClick={() => setShowStart((v) => !v)}>
          گفتگوی جدید
        </Button>
      </div>

      {showStart && (
        <Card>
          <CardContent className="space-y-3 py-4">
            <div className="space-y-1.5">
              <Label>{role === "INSTRUCTOR" ? "دانش‌آموز" : "مربی"}</Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="انتخاب کنید">
                    {(v: string | null) =>
                      pickerOptions.find((o) => o.id === v)?.name ?? "انتخاب کنید"
                    }
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {pickerOptions.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">موردی یافت نشد.</div>
                  ) : (
                    pickerOptions.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.name}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="start-content">پیام</Label>
              <Input id="start-content" value={content} onChange={(e) => setContent(e.target.value)} />
            </div>
            <Button
              className="w-full"
              disabled={!targetId || !content.trim() || isStarting}
              onClick={handleStart}
            >
              {isStarting ? "در حال ارسال..." : "شروع گفتگو"}
            </Button>
          </CardContent>
        </Card>
      )}

      {role === "INSTRUCTOR" ? (
        <ConversationList conversations={conversations} onOpen={(id) => router.push(`/messages/${id}`)} />
      ) : (
        <Tabs defaultValue="conversations">
          <TabsList>
            <TabsTrigger value="conversations">گفتگوها</TabsTrigger>
            <TabsTrigger value="announcements">اعلان‌ها</TabsTrigger>
          </TabsList>
          <TabsContent value="conversations" className="pt-3">
            <ConversationList
              conversations={conversations}
              onOpen={(id) => router.push(`/messages/${id}`)}
            />
          </TabsContent>
          <TabsContent value="announcements" className="space-y-2 pt-3">
            {announcements === null || announcements.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                اعلانی برای شما ثبت نشده است.
              </p>
            ) : (
              announcements.map((a) => (
                <Card key={a.id}>
                  <CardContent className="space-y-1 py-3">
                    {a.class && <p className="text-xs text-muted-foreground">{a.class.name}</p>}
                    <p className="text-sm">{a.content}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(a.createdAt).toLocaleDateString("fa-IR")}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ConversationList({
  conversations,
  onOpen,
}: {
  conversations: ConversationSummary[];
  onOpen: (id: string) => void;
}) {
  if (conversations.length === 0) {
    return <p className="py-10 text-center text-sm text-muted-foreground">هنوز گفتگویی ندارید.</p>;
  }
  return (
    <div className="space-y-2">
      {conversations.map((c) => (
        <Card
          key={c.id}
          className="cursor-pointer transition-colors hover:bg-muted/50"
          onClick={() => onOpen(c.id)}
        >
          <CardContent className="flex items-center gap-3 py-3">
            <Avatar className="size-9">
              <AvatarFallback>{c.otherParty.name.slice(0, 1)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{c.otherParty.name}</span>
                {c.unreadCount > 0 && (
                  <Badge variant="default" className="shrink-0">
                    {c.unreadCount}
                  </Badge>
                )}
              </div>
              <p className="truncate text-xs text-muted-foreground">
                {c.lastMessage ? `${c.lastMessage.mine ? "شما: " : ""}${c.lastMessage.content}` : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
