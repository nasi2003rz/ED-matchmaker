"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

const ORDER = ["system", "light", "dark"] as const;
type Mode = (typeof ORDER)[number];

const META: Record<Mode, { icon: typeof Sun; label: string }> = {
  system: { icon: Monitor, label: "پوسته: خودکار" },
  light: { icon: Sun, label: "پوسته: روشن" },
  dark: { icon: Moon, label: "پوسته: تاریک" },
};

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current: Mode =
    mounted && theme && (ORDER as readonly string[]).includes(theme)
      ? (theme as Mode)
      : "system";
  const { icon: Icon, label } = META[current];

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      className={className}
      aria-label={label}
      title={label}
      onClick={() => setTheme(ORDER[(ORDER.indexOf(current) + 1) % ORDER.length])}
    >
      <Icon />
    </Button>
  );
}
