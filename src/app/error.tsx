"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { Button } from "@/components/ui";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="rounded-xl border border-red-500/40 bg-red-500/5 p-6">
      <h1 className="text-lg font-semibold">This route crashed</h1>
      <p className="mt-2 text-sm text-muted">
        The error was reported to Sentry
        {error.digest ? ` (digest ${error.digest})` : ""}.
      </p>
      <pre className="mt-4 overflow-x-auto rounded-lg bg-surface p-3 font-mono text-xs">
        {error.message}
      </pre>
      <Button onClick={reset} variant="primary" className="mt-4">
        Try again
      </Button>
    </div>
  );
}
