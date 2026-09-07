import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { TONE_TEXT_CLASS, type Tone } from "@/lib/status";

/** A single dashboard metric (UI plan §6.2). */
export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  href,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  icon?: LucideIcon;
  tone?: Tone;
  href?: string;
}) {
  const body = (
    <div
      className={cn(
        "flex h-full flex-col gap-1 rounded-xl border border-border bg-card p-4",
        href && "transition-colors hover:border-primary/50",
      )}
    >
      <div className="flex items-center justify-between text-muted-foreground">
        <span className="text-xs">{label}</span>
        {Icon ? <Icon className="size-4" /> : null}
      </div>
      <span className={cn("text-2xl font-bold tabular-nums", TONE_TEXT_CLASS[tone])}>
        {value}
      </span>
      {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
    </div>
  );

  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}
