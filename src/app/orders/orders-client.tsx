"use client";

import * as Sentry from "@sentry/nextjs";
import { useCallback, useState, useSyncExternalStore } from "react";
import { ActivityLog, useActivityLog } from "@/components/activity-log";
import { PageViewLog } from "@/components/page-view-log";
import { Button, Card, PageHeader } from "@/components/ui";
import { formatMoney, type Order } from "@/lib/orders";
import {
  clearStorefrontPreview,
  getServerStorefrontPreviewBps,
  getStorefrontPreviewBps,
  netAmountCents,
  subscribeStorefrontPreview,
  writeStorefrontPreview,
} from "@/lib/partner-discount";

export function OrdersClient({ initialOrders }: { initialOrders: Order[] }) {
  // Rendered on the server first, then kept fresh through the API.
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [busy, setBusy] = useState<string | null>(null);
  const discountBps = useSyncExternalStore(
    subscribeStorefrontPreview,
    getStorefrontPreviewBps,
    getServerStorefrontPreviewBps,
  );
  const { entries, push, clear } = useActivityLog();

  const refresh = useCallback(
    async (silent = false) => {
      setBusy("refresh");
      try {
        const res = await fetch("/api/orders");
        const data = await res.json();
        setOrders(data.orders);
        if (!silent) push("success", `GET /api/orders → ${data.orders.length} orders`);
      } catch (err) {
        push("error", `GET /api/orders failed: ${err}`);
        Sentry.captureException(err);
      } finally {
        setBusy(null);
      }
    },
    [push],
  );

  async function createOrder() {
    setBusy("create");
    await Sentry.startSpan(
      { name: "create order", op: "ui.action.click" },
      async () => {
        try {
          const res = await fetch("/api/orders", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ customer: "demo-user" }),
          });
          const data = await res.json();
          push("success", `POST /api/orders → 201 ${data.order.id}`);
          Sentry.metrics.count("ui.orders_created", 1, {
            attributes: { page: "orders" },
          });
          await refresh(true);
        } catch (err) {
          push("error", `POST /api/orders failed: ${err}`);
          Sentry.captureException(err);
        } finally {
          setBusy(null);
        }
      },
    );
  }

  async function checkout() {
    setBusy("checkout");
    try {
      const res = await fetch("/api/checkout", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        push("success", `POST /api/checkout → 200 charge ${data.chargeId}`);
        await refresh(true);
      } else {
        push("error", `POST /api/checkout → ${res.status} ${data.error}`);
      }
    } catch (err) {
      push("error", `POST /api/checkout failed: ${err}`);
      Sentry.captureException(err);
    } finally {
      setBusy(null);
    }
  }

  function applyPartnerDiscount() {
    const next = { discountBps: 10000, appliedAt: new Date().toISOString() };
    Sentry.startSpan(
      {
        name: "apply partner discount",
        op: "ui.action.click",
        attributes: {
          "storefront.discount_bps": next.discountBps,
          page: "orders",
        },
      },
      () => {
        writeStorefrontPreview(next);
        Sentry.logger.info("Applied storefront partner discount", {
          origin: "browser",
          page: "orders",
          discountBps: next.discountBps,
          appliedAt: next.appliedAt,
        });
        Sentry.addBreadcrumb({
          category: "storefront",
          message: "Updated storefront preview",
          level: "info",
        });
        push("success", "Partner discount applied for this tab");
      },
    );
  }

  function clearPartnerDiscount() {
    clearStorefrontPreview();
    Sentry.logger.info("Cleared storefront partner discount", {
      origin: "browser",
      page: "orders",
    });
    push("info", "Partner discount cleared");
  }

  async function sendMalformed() {
    setBusy("malformed");
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountCents: "not-a-number" }),
      });
      const data = await res.json();
      push(
        res.ok ? "success" : "error",
        `POST /api/orders (bad payload) → ${res.status} ${data.error ?? ""}`,
      );
      Sentry.logger.warn("Sent a deliberately malformed order", {
        origin: "browser",
        status: res.status,
      });
    } catch (err) {
      push("error", `Request failed: ${err}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-8">
      <PageViewLog page="orders" />
      <PageHeader title="Orders">
        Every button here makes a real fetch to a route handler. The browser
        span and the server span share a trace, so you can follow a click all
        the way into the simulated database call.
      </PageHeader>

      <Card
        title="Partner discount"
        description="Preview this tab as a partner account. Totals update immediately and stay until you clear them or close the tab."
      >
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="primary"
            onClick={applyPartnerDiscount}
            disabled={busy !== null || discountBps === 10000}
          >
            Apply partner discount
          </Button>
          <Button
            onClick={clearPartnerDiscount}
            disabled={busy !== null || discountBps === 0}
          >
            Clear discount
          </Button>
          <span className="text-sm text-muted">
            {discountBps === 0
              ? "No discount"
              : `Partner rate: ${discountBps / 100}%`}
          </span>
        </div>
      </Card>

      <Card
        title="Actions"
        description="Checkout is flaky on purpose — roughly a third of calls return 402 and report a PaymentDeclinedError."
      >
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => refresh()} disabled={busy !== null}>
            {busy === "refresh" ? "Loading…" : "GET /api/orders"}
          </Button>
          <Button
            variant="primary"
            onClick={createOrder}
            disabled={busy !== null}
          >
            {busy === "create" ? "Creating…" : "POST /api/orders"}
          </Button>
          <Button onClick={checkout} disabled={busy !== null}>
            {busy === "checkout" ? "Charging…" : "POST /api/checkout (flaky)"}
          </Button>
          <Button onClick={sendMalformed} disabled={busy !== null}>
            Send malformed payload (400)
          </Button>
        </div>
      </Card>

      <div className="overflow-hidden rounded-xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase tracking-wide text-muted">
            <tr>
              <th className="px-4 py-2.5 font-medium">Order</th>
              <th className="px-4 py-2.5 font-medium">Customer</th>
              <th className="px-4 py-2.5 font-medium">Item</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted">
                  No orders loaded.
                </td>
              </tr>
            ) : (
              orders.map((order) => (
                <tr key={order.id} className="border-t border-border">
                  <td className="px-4 py-2.5 font-mono text-xs">{order.id}</td>
                  <td className="px-4 py-2.5">{order.customer}</td>
                  <td className="px-4 py-2.5 text-muted">{order.item}</td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-surface px-2 py-0.5 text-xs">
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono text-xs">
                    {formatMoney(
                      netAmountCents(order.amountCents, discountBps),
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <ActivityLog entries={entries} onClear={clear} />
    </div>
  );
}
