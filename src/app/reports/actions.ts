"use server";

import * as Sentry from "@sentry/nextjs";
import { countOrders } from "@/lib/store";

export type ReportResult = {
  generatedAt: string;
  rows: number;
  revenueCents: number;
  durationMs: number;
};

/** A server action that succeeds, with a nested span and a full set of signals. */
export async function generateReport(): Promise<ReportResult> {
  const start = Date.now();

  return Sentry.startSpan(
    { name: "generate report", op: "function.server_action" },
    async () => {
      const stats = await Sentry.startSpan(
        { name: "aggregate orders", op: "db.query" },
        async () => {
          await new Promise((r) => setTimeout(r, 150 + Math.random() * 350));
          return countOrders();
        },
      );

      const durationMs = Date.now() - start;

      Sentry.logger.info(
        Sentry.logger.fmt`Generated report over ${stats.total} orders`,
        { origin: "server-action", durationMs },
      );
      Sentry.metrics.count("reports.generated", 1, {
        attributes: { outcome: "success" },
      });
      Sentry.metrics.distribution("reports.duration", durationMs, {
        unit: "millisecond",
      });

      return {
        generatedAt: new Date().toISOString(),
        rows: stats.total,
        revenueCents: stats.revenueCents,
        durationMs,
      };
    },
  );
}

/** A server action that always throws, to exercise the server error path. */
export async function generateBrokenReport(): Promise<never> {
  Sentry.logger.error("Report generation is about to fail", {
    origin: "server-action",
  });
  Sentry.metrics.count("reports.generated", 1, {
    attributes: { outcome: "failed" },
  });
  Sentry.metrics.count("demo.errors_triggered", 1, {
    attributes: { kind: "server-action", origin: "server" },
  });

  await new Promise((r) => setTimeout(r, 100));

  throw new Error("Report generation failed in a server action (intentional)");
}
