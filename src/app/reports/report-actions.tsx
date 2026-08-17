"use client";

import * as Sentry from "@sentry/nextjs";
import { useState, useTransition } from "react";
import { ActivityLog, useActivityLog } from "@/components/activity-log";
import { Button, Card, Stat } from "@/components/ui";
import { formatMoney } from "@/lib/orders";
import {
  generateBrokenReport,
  generateReport,
  type ReportResult,
} from "./actions";

export function ReportActions() {
  const [result, setResult] = useState<ReportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const { entries, push, clear } = useActivityLog();

  function run() {
    startTransition(async () => {
      try {
        const report = await generateReport();
        setResult(report);
        push("success", `generateReport() → ${report.rows} rows in ${report.durationMs}ms`);
      } catch (err) {
        push("error", `generateReport() threw: ${err}`);
        Sentry.captureException(err);
      }
    });
  }

  function runBroken() {
    startTransition(async () => {
      try {
        await generateBrokenReport();
      } catch (err) {
        // Already reported server-side via onRequestError; capturing here too
        // shows the client's view of the same failure.
        Sentry.captureException(err, { tags: { demo_kind: "server-action" } });
        push("error", `generateBrokenReport() threw: ${err}`);
      }
    });
  }

  return (
    <>
      <Card
        title="Server actions"
        description="Both run on the server. The first records a nested span plus a counter and a duration distribution; the second throws so Next's onRequestError hook reports it."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="primary" onClick={run} disabled={pending}>
            {pending ? "Running…" : "Generate report"}
          </Button>
          <Button variant="danger" onClick={runBroken} disabled={pending}>
            Generate report (throws)
          </Button>
        </div>

        {result ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Stat label="Rows" value={result.rows} />
            <Stat label="Revenue" value={formatMoney(result.revenueCents)} />
            <Stat label="Duration" value={`${result.durationMs}ms`} />
          </div>
        ) : null}
      </Card>

      <ActivityLog entries={entries} onClear={clear} />
    </>
  );
}
