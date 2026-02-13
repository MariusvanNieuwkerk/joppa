import { Suspense } from "react";

import { AuthCallbackClient } from "./auth-callback-client";

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-md rounded-2xl border border-amber-200/80 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Inloggen
          </div>
          <div className="mt-2 text-sm leading-6 text-zinc-600 dark:text-zinc-300">
            Even een moment…
          </div>
        </div>
      }
    >
      <AuthCallbackClient />
    </Suspense>
  );
}

