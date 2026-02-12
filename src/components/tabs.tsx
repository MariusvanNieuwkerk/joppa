"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { cn } from "@/lib/cn";

export type TabItem = {
  id: string;
  label: string;
};

export function Tabs({
  items,
  param = "tab",
  basePath,
}: {
  items: TabItem[];
  param?: string;
  basePath?: string;
}) {
  const pathname = usePathname();
  const search = useSearchParams();
  const active = search.get(param) ?? items[0]?.id ?? "";
  const path = basePath ?? pathname;

  return (
    <div className="flex flex-wrap gap-2">
      {items.map((it) => {
        const sp = new URLSearchParams(search.toString());
        sp.set(param, it.id);
        const href = `${path}?${sp.toString()}`;
        const isActive = it.id === active;
        return (
          <Link
            key={it.id}
            href={href}
            className={cn(
              "inline-flex h-9 items-center rounded-full border px-4 text-sm font-medium transition-colors",
              isActive
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-black"
                : "border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
            )}
          >
            {it.label}
          </Link>
        );
      })}
    </div>
  );
}

