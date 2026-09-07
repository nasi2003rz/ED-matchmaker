import type { ReactNode } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

/**
 * Page title row: an optional RTL back affordance, the title, and one
 * primary action slot. Replaces the hand-rolled `flex justify-between`
 * header repeated across pages.
 */
export function PageHeader({
  title,
  description,
  action,
  backHref,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  backHref?: string;
}) {
  return (
    <div className="mb-6 space-y-1">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="بازگشت"
              className="-ms-1 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              {/* RTL: "back" points to the right */}
              <ArrowRight className="size-5" />
            </Link>
          ) : null}
          <h1 className="text-xl font-bold tracking-tight text-balance">{title}</h1>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}
