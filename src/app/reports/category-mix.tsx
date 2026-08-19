"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import { PageViewLog } from "@/components/page-view-log";
import { Button, Card } from "@/components/ui";
import { formatMoney, type Order } from "@/lib/orders";
import { netAmountCents, readStorefrontPreview } from "@/lib/partner-discount";

type MixRow = {
  item: string;
  netCents: number;
  share: number;
};

function formatPercent(share: number) {
  if (!Number.isFinite(share)) {
    throw new TypeError("Cannot convert NaN to a percentage");
  }
  return `${(share * 100).toFixed(1)}%`;
}

function computeCategoryMix(orders: Order[], discountBps: number): MixRow[] {
  const totals = new Map<string, number>();
  let netTotal = 0;

  for (const order of orders) {
    const net = netAmountCents(order.amountCents, discountBps);
    netTotal += net;
    totals.set(order.item, (totals.get(order.item) ?? 0) + net);
  }

  return [...totals.entries()].map(([item, netCents]) => ({
    item,
    netCents,
    share: netCents / netTotal,
  }));
}

export function CategoryMix() {
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<MixRow[] | null>(null);
  const [crash, setCrash] = useState<Error | null>(null);

  if (crash) throw crash;

  async function compute() {
    setBusy(true);
    setRows(null);
    try {
      await Sentry.startSpan(
        { name: "compute category mix", op: "ui.action.click" },
        async () => {
          const res = await fetch("/api/orders");
          const data = (await res.json()) as { orders: Order[] };
          const discountBps = readStorefrontPreview()?.discountBps ?? 0;
          const mix = computeCategoryMix(data.orders, discountBps);
          for (const row of mix) formatPercent(row.share);
          setRows(mix);
        },
      );
    } catch (err) {
      setCrash(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card
      title="Category mix"
      description="Share of net revenue by item."
    >
      <PageViewLog page="reports" />
      <Button variant="primary" onClick={compute} disabled={busy}>
        {busy ? "Computing…" : "Compute category mix"}
      </Button>

      {rows ? (
        <table className="mt-4 w-full text-left text-sm">
          <thead className="text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="py-2 font-medium">Item</th>
              <th className="py-2 text-right font-medium">Net</th>
              <th className="py-2 text-right font-medium">Share</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.item} className="border-t border-border">
                <td className="py-2">{row.item}</td>
                <td className="py-2 text-right font-mono text-xs">
                  {formatMoney(row.netCents)}
                </td>
                <td className="py-2 text-right font-mono text-xs">
                  {formatPercent(row.share)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </Card>
  );
}
