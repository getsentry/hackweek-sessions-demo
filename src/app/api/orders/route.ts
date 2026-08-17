import * as Sentry from "@sentry/nextjs";
import { createOrder, listOrders } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  const orders = await listOrders();

  Sentry.logger.info("Listed orders", {
    route: "/api/orders",
    count: orders.length,
  });
  Sentry.metrics.count("orders.listed", 1, {
    attributes: { route: "/api/orders" },
  });
  Sentry.metrics.gauge("orders.total", orders.length);
  Sentry.metrics.distribution("orders.list_latency", Date.now() - start, {
    unit: "millisecond",
  });

  return Response.json({ orders });
}

export async function POST(request: Request) {
  const start = Date.now();
  let status: "success" | "failed" = "success";

  try {
    const body = await request.json().catch(() => ({}));

    // A deliberately validated field, so the demo has a real 400 path.
    if (body.amountCents !== undefined && typeof body.amountCents !== "number") {
      status = "failed";
      Sentry.logger.warn("Rejected order with malformed amount", {
        route: "/api/orders",
        received: typeof body.amountCents,
      });
      return Response.json(
        { error: "amountCents must be a number" },
        { status: 400 },
      );
    }

    const order = await createOrder(body);

    Sentry.logger.info(
      Sentry.logger.fmt`Created order ${order.id} for ${order.customer}`,
      { route: "/api/orders", orderId: order.id, item: order.item },
    );
    Sentry.metrics.count("orders.created", 1, {
      attributes: { item: order.item, customer: order.customer },
    });
    Sentry.metrics.distribution("orders.amount", order.amountCents / 100, {
      unit: "none",
      attributes: { item: order.item },
    });

    return Response.json({ order }, { status: 201 });
  } catch (error) {
    status = "failed";
    Sentry.captureException(error);
    throw error;
  } finally {
    Sentry.metrics.distribution("orders.create_latency", Date.now() - start, {
      unit: "millisecond",
      attributes: { status },
    });
  }
}
