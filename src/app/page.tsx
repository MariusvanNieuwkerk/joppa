import Link from "next/link";

export default function Home() {
  return (
    <div className="py-10">
      <div className="grid gap-12 md:grid-cols-12 md:items-center">
        <div className="md:col-span-7">
          <h1 className="mt-5 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-white md:text-5xl">
            Maak in minuten een mooie, strakke vacature.
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            Vertel gewoon wie je zoekt (in je eigen woorden). Joppa zet het om
            naar een complete vacaturetekst én een set visuals die je zo kunt
            plaatsen op je kanalen.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/create"
              className="inline-flex h-11 items-center justify-center rounded-full bg-zinc-950 px-5 text-sm font-medium text-white shadow-sm hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
            >
              Probeer het meteen
            </Link>
            <Link
              href="/onboarding"
              className="inline-flex h-11 items-center justify-center rounded-full border border-zinc-200 bg-white px-5 text-sm font-medium text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            >
              Stel je bedrijfsstijl in
            </Link>
          </div>

          <div className="mt-5 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
            Geen technische kennis nodig. Je ziet meteen resultaat, en je kunt
            alles rustig aanpassen.
          </div>
        </div>

        <div className="md:col-span-5">
          <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Zo werkt het
            </div>
            <ol className="mt-3 space-y-3 text-sm text-zinc-600 dark:text-zinc-300">
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs text-white dark:bg-white dark:text-black">
                  1
                </span>
                <span>Schrijf in je eigen woorden wie je zoekt</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs text-white dark:bg-white dark:text-black">
                  2
                </span>
                <span>Joppa maakt een nette vacaturetekst (en meerdere versies)</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs text-white dark:bg-white dark:text-black">
                  3
                </span>
                <span>Kies een stijl (of upload een foto) voor je visuals</span>
              </li>
              <li className="flex gap-3">
                <span className="mt-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-900 text-xs text-white dark:bg-white dark:text-black">
                  4
                </span>
                <span>Pak je export (tekst + visuals) en plaats op je kanalen</span>
              </li>
            </ol>

            <div className="mt-5 rounded-xl border border-amber-200/80 bg-amber-50/60 p-4 text-xs text-amber-900/80 dark:border-zinc-800 dark:bg-black dark:text-zinc-300">
              Je begint met mooie standaard templates (gratis). Wil je een andere
              sfeer? Dan kun je met één klik een andere stijl kiezen.
            </div>
          </div>
        </div>
      </div>

      <div className="mt-10 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Waar komt je vacature te staan?
        </div>
        <div className="mt-3 grid gap-4 text-sm text-zinc-600 dark:text-zinc-300 md:grid-cols-3">
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-zinc-800 dark:bg-black">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              Op Joppa (altijd)
            </div>
            <p className="mt-1 leading-6">
              Elke vacature krijgt een mooie pagina op Joppa die je kunt delen.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-zinc-800 dark:bg-black">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              Op Indeed (altijd)
            </div>
            <p className="mt-1 leading-6">
              Je vacature kan ook op Indeed. Meestal is dit één keer koppelen,
              daarna gaat het vanzelf.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-zinc-800 dark:bg-black">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              Op social (makkelijk)
            </div>
            <p className="mt-1 leading-6">
              Je krijgt kant‑en‑klare teksten en beelden voor LinkedIn,
              Instagram, Facebook en TikTok. Kopiëren, downloaden, klaar.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          Soms vraagt Indeed om een korte goedkeuring of instelling. Wij helpen
          je daar stap‑voor‑stap doorheen.
        </p>
      </div>

      <div className="mt-14 grid gap-6 md:grid-cols-3">
        <FeatureCard
          title="Makkelijk voor iedereen"
          body="Geen jargon, geen ingewikkelde knoppen. Je ziet direct wat je krijgt en past het aan in gewone taal."
        />
        <FeatureCard
          title="Altijd strak en consistent"
          body="Tekst en visuals sluiten op elkaar aan. Handig als je meerdere vacatures maakt, of meerdere kanalen beheert."
        />
        <FeatureCard
          title="Klaar om te plaatsen"
          body="Je krijgt een pakket met teksten en beelden in de juiste formaten. Kopiëren, downloaden, klaar."
        />
      </div>
    </div>
  );
}

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </div>
      <p className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
        {body}
      </p>
    </div>
  );
}
