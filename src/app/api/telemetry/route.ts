import * as Sentry from "@sentry/nextjs";

export const dynamic = "force-dynamic";

const LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
type Level = (typeof LEVELS)[number];

function isLevel(value: unknown): value is Level {
  return typeof value === "string" && (LEVELS as readonly string[]).includes(value);
}

/**
 * Emits a server-side log and/or metric on demand, so the Telemetry page can
 * show the difference between browser-originated and server-originated signals.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const level: Level = isLevel(body.level) ? body.level : "info";
  const message: string =
    typeof body.message === "string" && body.message.trim()
      ? body.message.trim()
      : "Manual telemetry from the demo app";

  Sentry.logger[level](message, {
    origin: "server",
    route: "/api/telemetry",
    requestedLevel: level,
  });

  const kind = body.metric as string | undefined;
  let metric: { type: string; name: string; value: number } | null = null;

  if (kind === "count") {
    metric = { type: "count", name: "demo.button_clicks", value: 1 };
    Sentry.metrics.count(metric.name, 1, {
      attributes: { origin: "server", surface: "telemetry-page" },
    });
  } else if (kind === "gauge") {
    const value = Math.round(process.memoryUsage().rss / 1024 / 1024);
    metric = { type: "gauge", name: "demo.rss_megabytes", value };
    Sentry.metrics.gauge(metric.name, value, { unit: "megabyte" });
  } else if (kind === "distribution") {
    const value = Math.round(20 + Math.random() * 400);
    metric = { type: "distribution", name: "demo.simulated_latency", value };
    Sentry.metrics.distribution(metric.name, value, {
      unit: "millisecond",
      attributes: { origin: "server" },
    });
  }

  return Response.json({ ok: true, level, message, metric });
}
