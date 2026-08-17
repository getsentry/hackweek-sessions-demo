"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          padding: "3rem",
          lineHeight: 1.6,
        }}
      >
        <h1>Something went wrong</h1>
        <p>The error was reported to Sentry.</p>
      </body>
    </html>
  );
}
