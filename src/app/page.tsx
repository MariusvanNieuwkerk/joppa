import Link from "next/link";

export default function Home() {
  return (
    <div className="py-10">
      <div className="grid gap-12 md:grid-cols-12 md:items-center">
        <div className="md:col-span-12">
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
      </div>

      <div className="mt-10 rounded-2xl border border-amber-200/80 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
          Zo werkt Joppa voor bedrijven
        </div>
        <div className="mt-3 grid gap-4 text-sm text-zinc-600 dark:text-zinc-300 md:grid-cols-3">
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-zinc-800 dark:bg-black">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              1) Maak ’m in de wizard
            </div>
            <p className="mt-1 leading-6">
              Stap‑voor‑stap invullen in gewone taal. Joppa helpt je van ruwe input
              naar een complete vacature.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-zinc-800 dark:bg-black">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              2) Check en keur goed
            </div>
            <p className="mt-1 leading-6">
              Je reviewt gegevens, teksten per kanaal en beelden. Social posts zie je
              in het juiste formaat: goedkeuren, kopiëren en delen.
            </p>
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-zinc-800 dark:bg-black">
            <div className="font-medium text-zinc-900 dark:text-zinc-100">
              3) Live + verspreiden
            </div>
            <p className="mt-1 leading-6">
              Zet je vacature live op Joppa (deelbare pagina). Indeed loopt mee (na
              koppelen) en je export staat klaar.
            </p>
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          Resultaat: een strakke vacaturepagina + teksten en beelden per kanaal, klaar om
          te plaatsen.
        </p>
      </div>
    </div>
  );
}
