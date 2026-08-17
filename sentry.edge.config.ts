import * as Sentry from "@sentry/nextjs";

// Runs in the Vercel Edge runtime (edge routes, proxy/middleware).
Sentry.init({
  dsn: process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,

  tracesSampleRate: 1.0,
});
