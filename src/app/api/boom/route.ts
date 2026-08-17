import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

/**
 * Always throws. The error escapes the handler so Next's `onRequestError` hook
 * reports it — no manual captureException needed.
 */
export async function GET() {
  Sentry.logger.warn("About to blow up on purpose", { route: "/api/boom" });
  Sentry.metrics.count("demo.errors_triggered", 1, {
    attributes: { kind: "api-route", origin: "server" },
  });

  await new Promise((r) => setTimeout(r, 50));

  throw new Error("Unhandled server error from /api/boom (this is intentional)");
}
