import * as Sentry from "@sentry/nextjs";
import { countOrders } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Rolls up a few numbers, with an artificial slow "cache lookup" child span so
 * there is something interesting to look at in the trace waterfall.
 */
export async function GET() {
  return Sentry.startSpan({ name: "compute stats", op: "function" }, async () => {
    const stats = await Sentry.startSpan(
      { name: "cache.get stats", op: "cache.get" },
      async () => {
        await new Promise((r) => setTimeout(r, 80 + Math.random() * 200));
        return countOrders();
      },
    );

    const uptimeSeconds = Math.round(process.uptime());

    Sentry.metrics.gauge("orders.pending", stats.pending);
    Sentry.metrics.gauge("orders.shipped", stats.shipped);
    Sentry.metrics.gauge("server.uptime", uptimeSeconds, { unit: "second" });
    Sentry.metrics.gauge(
      "server.heap_used",
      process.memoryUsage().heapUsed,
      { unit: "byte" },
    );
    Sentry.logger.debug("Served stats snapshot", { ...stats, uptimeSeconds });

    return Response.json({ ...stats, uptimeSeconds });
  });
}
