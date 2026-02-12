import Link from "next/link";

function PriceCard({
  title,
  price,
  subtitle,
  bullets,
  ctaLabel,
  ctaHref,
  featured,
}: {
  title: string;
  price: string;
  subtitle: string;
  bullets: string[];
  ctaLabel: string;
  ctaHref: string;
  featured?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-6 shadow-sm dark:bg-zinc-950 ${
        featured
          ? "border-zinc-900 ring-1 ring-zinc-900 dark:border-white dark:ring-white"
          : "border-amber-200/80 dark:border-zinc-800"
      }`}
    >
      <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
        {title}
      </div>
      <div className="mt-2 text-3xl font-semibold tracking-tight">{price}</div>
      <div className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
        {subtitle}
      </div>

      <ul className="mt-5 space-y-2 text-sm text-zinc-700 dark:text-zinc-200">
        {bullets.map((b) => (
          <li key={b} className="flex gap-2">
            <span className="mt-0.5 text-zinc-900 dark:text-zinc-100">•</span>
            <span>{b}</span>
          </li>
        ))}
      </ul>

      <div className="mt-6">
        <Link
          href={ctaHref}
          className={`inline-flex h-11 w-full items-center justify-center rounded-full px-5 text-sm font-medium shadow-sm ${
            featured
              ? "bg-zinc-950 text-white hover:bg-zinc-800 dark:bg-white dark:text-black dark:hover:bg-zinc-200"
              : "border border-zinc-200 bg-white text-zinc-900 hover:bg-zinc-50 dark:border-zinc-800 dark:bg-black dark:text-zinc-100 dark:hover:bg-zinc-900"
          }`}
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="space-y-10">
      <div className="max-w-2xl">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200/70 bg-white px-3 py-1 text-xs font-medium text-amber-900 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200">
          Prijzen (Nederland)
        </div>
        <h1 className="mt-4 text-4xl font-semibold tracking-tight md:text-5xl">
          Simpel, eerlijk en voorspelbaar.
        </h1>
        <p className="mt-4 text-lg leading-8 text-zinc-600 dark:text-zinc-300">
          Indeed is inbegrepen. Je begint gratis en groeit mee zodra je meer
          vacatures live zet.
        </p>
      </div>

      <div className="grid gap-5 md:grid-cols-3">
        <PriceCard
          title="Gratis"
          price="€0"
          subtitle="Voor proberen en de eerste vacatures."
          bullets={[
            "Tot 5 live vacatures per maand (Indeed inbegrepen)",
            "Joppa vacaturepagina + deelbare link",
            "Downloadpakket (teksten + visuals)",
            "Mijn vacatures (basis)",
          ]}
          ctaLabel="Probeer gratis"
          ctaHref="/create"
        />

        <PriceCard
          title="Pro"
          price="€149/m"
          subtitle="Jaarlijks (of €179/m maandelijks)."
          bullets={[
            "Tot 50 live vacatures per maand (Indeed inbegrepen)",
            "Team (bijv. 3 gebruikers inbegrepen)",
            "Nette versiegeschiedenis + betere exports",
            "Bedrijfsstijl & templates volledig benut",
          ]}
          ctaLabel="Start Pro"
          ctaHref="/create"
          featured
        />

        <PriceCard
          title="Business"
          price="Vanaf €499/m"
          subtitle="Jaarlijks (of €599/m maandelijks)."
          bullets={[
            "Onbeperkt / maatwerk",
            "Multi‑brand/labels",
            "Integraties (ATS, tracking, etc.)",
            "Support/SLA + onboarding",
          ]}
          ctaLabel="Neem contact op"
          ctaHref="/onboarding"
        />
      </div>

      <div className="rounded-2xl border border-amber-200/80 bg-white p-6 text-sm text-zinc-600 shadow-sm dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
        <div className="font-semibold text-zinc-900 dark:text-zinc-100">
          Add‑ons
        </div>
        <div className="mt-2 grid gap-2 md:grid-cols-3">
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-zinc-800 dark:bg-black">
            Extra teamleden: €15–€25 / gebruiker / maand
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-zinc-800 dark:bg-black">
            Extra vacatures: bundels (bijv. +50 voor €79–€129 / maand)
          </div>
          <div className="rounded-xl border border-amber-200/80 bg-amber-50/50 p-4 dark:border-zinc-800 dark:bg-black">
            Onboarding “done with you”: €750–€1.500 eenmalig
          </div>
        </div>
        <p className="mt-4 text-xs leading-5 text-zinc-500 dark:text-zinc-400">
          Soms vraagt Indeed om een korte goedkeuring of instelling. Wij helpen
          je daar stap‑voor‑stap doorheen.
        </p>
      </div>
    </div>
  );
}

