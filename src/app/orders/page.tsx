import * as Sentry from "@sentry/nextjs";
import { listOrders } from "@/lib/store";
import { OrdersClient } from "./orders-client";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  // First paint comes from the server, inside the document request's trace.
  const initialOrders = await Sentry.startSpan(
    { name: "load initial orders", op: "function.server_component" },
    () => listOrders(),
  );

  return <OrdersClient initialOrders={initialOrders} />;
}
