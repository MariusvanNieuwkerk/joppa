import Link from "next/link";

export default function LoginLandingPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Inloggen</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Kies wat bij je past. Je komt daarna in de juiste omgeving.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <Link
          href="/login/bedrijf"
          className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm hover:bg-amber-50/40 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-black"
        >
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Ik ben een bedrijf
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Vacature maken, publiceren en beheren.
          </p>
          <div className="mt-3 text-xs font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100">
            Naar bedrijfsomgeving →
          </div>
        </Link>

        <Link
          href="/login/werkzoekende"
          className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm hover:bg-amber-50/40 dark:border-zinc-800 dark:bg-zinc-950 dark:hover:bg-black"
        >
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Ik zoek werk
          </div>
          <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Vacatures bekijken en straks makkelijk solliciteren.
          </p>
          <div className="mt-3 text-xs font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100">
            Naar vacatures →
          </div>
        </Link>
      </div>
    </div>
  );
}

