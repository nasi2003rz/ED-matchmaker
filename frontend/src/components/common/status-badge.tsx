import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { TONE_BADGE_CLASS, type StatusMeta } from "@/lib/status";

/** Renders a status from the `@/lib/status` registry as a coloured badge. */
export function StatusBadge({
  meta,
  className,
}: {
  meta: StatusMeta;
  className?: string;
}) {
  const Icon = meta.icon;
  return (
    <Badge variant="secondary" className={cn(TONE_BADGE_CLASS[meta.tone], className)}>
      {Icon ? <Icon /> : null}
      {meta.label}
    </Badge>
  );
}
