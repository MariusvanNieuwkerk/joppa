import Link from "next/link";

import { Container } from "@/components/container";
import { HeaderNav } from "@/components/header-nav";
import { ScrollToTop } from "@/components/scroll-to-top";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-gradient-to-b from-amber-50 via-white to-white text-zinc-950 dark:from-black dark:via-black dark:to-black dark:text-zinc-50">
      <header className="sticky top-0 z-40 border-b border-amber-200/80 bg-white/80 backdrop-blur dark:border-zinc-800/60 dark:bg-black/40">
        <Container className="flex h-14 items-center justify-between gap-6">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-semibold tracking-[0.22em] text-zinc-950 dark:text-white"
            >
              <span className="text-sm sm:text-base">JOPPA</span>
            </Link>
            <HeaderNav />
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/create"
              className="inline-flex h-9 items-center rounded-full bg-zinc-950 px-4 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Nieuwe vacature
            </Link>
          </div>
        </Container>
      </header>

      <main>
        <Container className="py-10">{children}</Container>
      </main>
      <ScrollToTop />

      <footer className="border-t border-amber-200/80 py-10 text-sm text-zinc-600 dark:border-zinc-800/60 dark:text-zinc-400">
        <Container className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <p>
            <span className="font-medium text-zinc-700 dark:text-zinc-200">
              Joppa
            </span>{" "}
            — mooie vacatures, zonder gedoe
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            <Link
              href="/dashboard"
              className="hover:text-zinc-950 dark:hover:text-white"
            >
              Mijn vacatures
            </Link>
            <Link
              href="/create"
              className="hover:text-zinc-950 dark:hover:text-white"
            >
              Vacature maken
            </Link>
            <Link
              href="/onboarding"
              className="hover:text-zinc-950 dark:hover:text-white"
            >
              Bedrijfsstijl
            </Link>
            <Link
              href="/pricing"
              className="hover:text-zinc-950 dark:hover:text-white"
            >
              Pricing
            </Link>
          </div>
        </Container>
      </footer>
    </div>
  );
}

