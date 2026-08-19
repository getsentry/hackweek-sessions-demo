"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Leaves a structured log when a page mounts, so the session trail is searchable. */
export function PageViewLog({ page }: { page: string }) {
  useEffect(() => {
    Sentry.logger.info("Viewed page", { origin: "browser", page });
  }, [page]);
  return null;
}
