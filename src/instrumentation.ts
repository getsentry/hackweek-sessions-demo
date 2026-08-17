import * as Sentry from "@sentry/nextjs";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  }

  if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

// Forwards errors thrown in server components, route handlers and server
// actions to Sentry with the right request context attached.
export const onRequestError = Sentry.captureRequestError;
