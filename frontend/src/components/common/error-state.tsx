"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/**
 * Inline load-failure state (UI plan §5.1). Use for a failed data fetch;
 * use `toast.error` for a failed action.
 */
export function ErrorState({
  title = "بارگذاری ناموفق بود",
  description = "اتصال را بررسی کنید و دوباره تلاش کنید.",
  onRetry,
  className,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-3 rounded-xl border border-border px-6 py-12 text-center",
        className,
      )}
    >
      <AlertCircle className="size-8 text-destructive" />
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        <p className="mx-auto max-w-xs text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw />
          تلاش دوباره
        </Button>
      ) : null}
    </div>
  );
}
