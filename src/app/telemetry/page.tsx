"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import { ActivityLog, useActivityLog } from "@/components/activity-log";
import { Button, Card, PageHeader } from "@/components/ui";

const LEVELS = ["trace", "debug", "info", "warn", "error", "fatal"] as const;
type Level = (typeof LEVELS)[number];

export default function TelemetryPage() {
  const [busy, setBusy] = useState(false);
  const { entries, push, clear } = useActivityLog();

  // --- Logs from the browser ------------------------------------------------
  function clientLog(level: Level) {
    Sentry.logger[level](`Demo ${level} log from the browser`, {
      origin: "browser",
      page: "telemetry",
      clickedAt: new Date().toISOString(),
    });
    push("info", `Sentry.logger.${level}(…) — client`);
  }

  // --- Metrics from the browser ---------------------------------------------
  function clientCount() {
    Sentry.metrics.count("demo.button_clicks", 1, {
      attributes: { origin: "browser", surface: "telemetry-page" },
    });
    push("success", "metrics.count('demo.button_clicks', 1) — client");
  }

  function clientGauge() {
    const value = Math.round(window.innerWidth);
    Sentry.metrics.gauge("demo.viewport_width", value, { unit: "none" });
    push("success", `metrics.gauge('demo.viewport_width', ${value}) — client`);
  }

  function clientDistribution() {
    const value = Math.round(performance.now());
    Sentry.metrics.distribution("demo.time_on_page", value, {
      unit: "millisecond",
      attributes: { origin: "browser" },
    });
    push(
      "success",
      `metrics.distribution('demo.time_on_page', ${value}ms) — client`,
    );
  }

  // --- A manual span --------------------------------------------------------
  async function customSpan() {
    setBusy(true);
    await Sentry.startSpan(
      {
        name: "expensive client work",
        op: "function",
        attributes: { page: "telemetry" },
      },
      async (span) => {
        await new Promise((r) => setTimeout(r, 400));
        span.setAttribute("items_processed", 128);
        push("success", "Recorded span 'expensive client work' (~400ms)");
      },
    );
    setBusy(false);
  }

  // --- Server-side signals --------------------------------------------------
  async function serverSignal(level: Level, metric: string) {
    setBusy(true);
    try {
      const res = await fetch("/api/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level,
          metric,
          message: `Demo ${level} log from the server`,
        }),
      });
      const data = await res.json();
      push(
        "success",
        `server: logger.${data.level}(…) + metrics.${data.metric.type}('${data.metric.name}', ${data.metric.value})`,
      );
    } catch (err) {
      push("error", `POST /api/telemetry failed: ${err}`);
      Sentry.captureException(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Telemetry">
        Logs and metrics, emitted on demand. Everything on this page is a real
        SDK call — the activity list below just mirrors what was sent so you
        know what to look for in Sentry.
      </PageHeader>

      <Card
        title="Structured logs (browser)"
        description="Sentry.logger.<level>(message, attributes). Each carries origin, page and a timestamp attribute."
      >
        <div className="flex flex-wrap gap-2">
          {LEVELS.map((level) => (
            <Button key={level} onClick={() => clientLog(level)}>
              logger.{level}
            </Button>
          ))}
        </div>
      </Card>

      <Card
        title="Metrics (browser)"
        description="The three metric types: a counter, a gauge and a distribution."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={clientCount}>
            count · button_clicks
          </Button>
          <Button onClick={clientGauge}>gauge · viewport_width</Button>
          <Button onClick={clientDistribution}>
            distribution · time_on_page
          </Button>
        </div>
      </Card>

      <Card
        title="Tracing"
        description="Opens a manual span that sits inside the current page's transaction."
      >
        <Button onClick={customSpan} disabled={busy}>
          {busy ? "Working…" : "Record a 400ms span"}
        </Button>
      </Card>

      <Card
        title="Server-side signals"
        description="POSTs to /api/telemetry, which emits the log and metric from the Node runtime instead of the browser."
      >
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => serverSignal("info", "count")}
            disabled={busy}
          >
            info log + counter
          </Button>
          <Button
            onClick={() => serverSignal("warn", "gauge")}
            disabled={busy}
          >
            warn log + gauge
          </Button>
          <Button
            onClick={() => serverSignal("error", "distribution")}
            disabled={busy}
          >
            error log + distribution
          </Button>
        </div>
      </Card>

      <ActivityLog entries={entries} onClear={clear} />
    </div>
  );
}
