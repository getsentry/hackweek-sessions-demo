import * as Sentry from "@sentry/nextjs";
import { Suspense } from "react";
import { PageHeader, Stat } from "@/components/ui";
import { formatMoney } from "@/lib/orders";
import { listOrders } from "@/lib/store";
import { CategoryMix } from "./category-mix";
import { ReportActions } from "./report-actions";

export const dynamic = "force-dynamic";

async function Summary() {
  const orders = await Sentry.startSpan(
    { name: "load orders for report", op: "function.server_component" },
    () => listOrders(),
  );

  const revenue = orders.reduce((sum, o) => sum + o.amountCents, 0);
  const average = orders.length ? Math.round(revenue / orders.length) : 0;

  Sentry.logger.info("Rendered reports summary", {
    origin: "server-component",
    orders: orders.length,
  });
  Sentry.metrics.gauge("reports.orders_in_summary", orders.length);

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      <Stat label="Orders" value={orders.length} />
      <Stat label="Revenue" value={formatMoney(revenue)} />
      <Stat label="Average" value={formatMoney(average)} />
      <Stat
        label="Pending"
        value={orders.filter((o) => o.status === "pending").length}
      />
    </div>
  );
}

export default function ReportsPage() {
  return (
    <div className="space-y-8">
      <PageHeader title="Reports">
        This page is server-rendered. The summary below is fetched inside a
        manual span during render, so it appears in the same trace as the
        document request.
      </PageHeader>

      <Suspense
        fallback={
          <div className="h-[86px] animate-pulse rounded-lg border border-border bg-surface" />
        }
      >
        <Summary />
      </Suspense>

      <CategoryMix />

      <ReportActions />
    </div>
  );
}
