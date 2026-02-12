import Link from "next/link";

import { PublicJobClient } from "@/components/public-job-client";

export default function PublicJobPage({
  params,
}: {
  params: { companySlug: string; jobSlug: string };
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between">
        <Link
          href="/"
          className="text-sm font-medium text-zinc-600 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white"
        >
          ← Back to Joppa
        </Link>
        <Link
          href="/create"
          className="text-sm font-medium text-zinc-900 underline underline-offset-2 dark:text-zinc-100"
        >
          Create a job
        </Link>
      </div>

      <PublicJobClient companySlug={params.companySlug} jobSlug={params.jobSlug} />
    </div>
  );
}

