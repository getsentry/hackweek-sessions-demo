import * as Sentry from "@sentry/nextjs";
import { createOrder } from "@/lib/store";

export const dynamic = "force-dynamic";

class PaymentDeclinedError extends Error {
  constructor(readonly reason: string) {
    super(`Payment declined: ${reason}`);
    this.name = "PaymentDeclinedError";
  }
}

const DECLINE_REASONS = [
  "insufficient_funds",
  "card_expired",
  "issuer_unavailable",
];

/**
 * A flaky endpoint: roughly a third of calls fail. Useful for generating a mix
 * of successful and errored transactions in the same trace view.
 */
export async function POST() {
  const start = Date.now();

  try {
    return await Sentry.startSpan(
      { name: "checkout", op: "function", attributes: { flow: "demo-checkout" } },
      async () => {
        const charge = await Sentry.startSpan(
          { name: "POST payments.example/charges", op: "http.client" },
          async () => {
            await new Promise((r) => setTimeout(r, 120 + Math.random() * 300));
            if (Math.random() < 0.35) {
              throw new PaymentDeclinedError(
                DECLINE_REASONS[Math.floor(Math.random() * DECLINE_REASONS.length)],
              );
            }
            return { id: `ch_${Math.random().toString(36).slice(2, 10)}` };
          },
        );

        const order = await createOrder();

        Sentry.logger.info(
          Sentry.logger.fmt`Checkout succeeded for ${order.id}`,
          { chargeId: charge.id, amountCents: order.amountCents },
        );
        Sentry.metrics.count("checkout.completed", 1, {
          attributes: { outcome: "success" },
        });

        return Response.json({ ok: true, order, chargeId: charge.id });
      },
    );
  } catch (error) {
    const reason =
      error instanceof PaymentDeclinedError ? error.reason : "unknown";

    Sentry.logger.error("Checkout failed", { reason });
    Sentry.metrics.count("checkout.completed", 1, {
      attributes: { outcome: "failed", reason },
    });
    Sentry.captureException(error, { tags: { flow: "demo-checkout", reason } });

    return Response.json({ ok: false, error: String(error) }, { status: 402 });
  } finally {
    Sentry.metrics.distribution("checkout.latency", Date.now() - start, {
      unit: "millisecond",
    });
  }
}
