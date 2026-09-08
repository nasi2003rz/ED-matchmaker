"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth-context";
import { ApiError } from "@/lib/api";
import {
  fetchThread,
  sendMessage,
  markConversationRead,
  type ConversationThread,
} from "@/lib/messaging-api";
import { cn } from "@/lib/utils";
import { AppShell } from "@/components/layout/app-shell";

export default function ConversationThreadPage() {
  const { getAccessToken, isLoading: isAuthLoading } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const conversationId = params.id;

  const [thread, setThread] = useState<ConversationThread | null>(null);
  const [content, setContent] = useState("");
  const [isSending, setIsSending] = useState(false);

  const load = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const data = await fetchThread(token, conversationId);
      setThread(data);
      await markConversationRead(token, conversationId);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطا در بارگذاری گفتگو.");
    }
  }, [getAccessToken, conversationId]);

  useEffect(() => {
    if (isAuthLoading) return;
    if (!getAccessToken()) {
      router.replace("/login");
      return;
    }
    load();
  }, [isAuthLoading, getAccessToken, router, load]);

  async function handleSend() {
    const token = getAccessToken();
    if (!token || !content.trim()) return;
    setIsSending(true);
    try {
      const updated = await sendMessage(token, conversationId, content.trim());
      setThread(updated);
      setContent("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "خطایی رخ داد.");
    } finally {
      setIsSending(false);
    }
  }

  if (isAuthLoading || thread === null) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
    <div className="mx-auto flex h-[calc(100dvh-10.75rem)] max-w-md flex-col lg:h-[calc(100dvh-7.25rem)]">
      <div className="flex items-center justify-between pb-3">
        <h1 className="text-lg font-bold">{thread.otherParty.name}</h1>
        <Button variant="outline" size="sm" onClick={() => router.push("/messages")}>
          بازگشت
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pb-3">
        {thread.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">
            هنوز پیامی رد و بدل نشده است.
          </p>
        ) : (
          thread.messages.map((m) => (
            <div key={m.id} className={cn("flex", m.mine ? "justify-start" : "justify-end")}>
              <div
                className={cn(
                  "max-w-[75%] rounded-lg px-3 py-2 text-sm",
                  m.mine ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                <p>{m.content}</p>
                <p
                  className={cn(
                    "mt-1 text-[10px]",
                    m.mine ? "text-primary-foreground/70" : "text-muted-foreground",
                  )}
                >
                  {new Date(m.createdAt).toLocaleTimeString("fa-IR", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {m.mine && ` — ${m.status === "READ" ? "خوانده‌شده" : "ارسال‌شده"}`}
                </p>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="flex gap-2 border-t pt-3">
        <Input
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="پیام خود را بنویسید..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isSending) handleSend();
          }}
        />
        <Button disabled={!content.trim() || isSending} onClick={handleSend}>
          ارسال
        </Button>
      </div>
    </div>
    </AppShell>
  );
}
