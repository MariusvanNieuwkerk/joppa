import Link from "next/link";

export default function CandidateHomePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Werkzoekenden</h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Dit is de kandidaat‑omgeving. In fase 1 is dit nog klein: je kunt al
          vacatures bekijken. Solliciteren, profielen en matching bouwen we in
          fase 2.
        </p>
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Begin hier
        </div>
        <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
          Bekijk alle live vacatures en filter op locatie en niveau.
        </p>
        <div className="mt-4">
          <Link
            href="/vacatures"
            className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
          >
            Naar vacatures
          </Link>
        </div>
      </div>
    </div>
  );
}

