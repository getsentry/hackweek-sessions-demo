"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import { Button, Stat } from "@/components/ui";

type Stats = {
  total: number;
  pending: number;
  shipped: number;
  revenueCents: number;
  uptimeSeconds: number;
};

export function HealthPanel() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);

    // Wrap the click in a span so the fetch shows up nested under it.
    await Sentry.startSpan(
      { name: "load health snapshot", op: "ui.action.click" },
      async () => {
        const started = performance.now();
        try {
          const res = await fetch("/api/stats");
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          setStats(await res.json());
          Sentry.logger.info("Loaded health snapshot", { origin: "browser" });
        } catch (err) {
          setError(String(err));
          Sentry.captureException(err);
        } finally {
          Sentry.metrics.distribution(
            "ui.stats_fetch",
            Math.round(performance.now() - started),
            { unit: "millisecond", attributes: { page: "overview" } },
          );
          setLoading(false);
        }
      },
    );
  }

  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">Health snapshot</h2>
          <p className="mt-1 text-sm text-muted">
            Fetches <code className="font-mono">/api/stats</code>, which records
            four gauges and a nested cache span.
          </p>
        </div>
        <Button onClick={load} disabled={loading} variant="primary">
          {loading ? "Loading…" : "Fetch stats"}
        </Button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      {stats ? (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Orders" value={stats.total} />
          <Stat label="Pending" value={stats.pending} />
          <Stat label="Revenue" value={`$${(stats.revenueCents / 100).toFixed(0)}`} />
          <Stat label="Uptime" value={`${stats.uptimeSeconds}s`} />
        </div>
      ) : null}
    </section>
  );
}
