# Sentry Next.js demo

A small Next.js 16 (App Router) app instrumented with the Sentry Next.js SDK.
It covers **errors, tracing, logs and metrics**. Session Replay is deliberately
left out.

## Running it

```bash
npm install
cp .env.example .env.local   # paste your DSN into NEXT_PUBLIC_SENTRY_DSN
npm run dev
```

The app runs without a DSN — the SDK just no-ops instead of sending, so you can
click through everything before wiring up a project.

## What's where

| Path | What it demonstrates |
| --- | --- |
| `/` | Overview, plus a button that fetches `/api/stats` inside a manual span |
| `/orders` | Server-rendered first paint, then buttons that GET/POST route handlers |
| `/telemetry` | Every log level and all three metric types, from browser and server |
| `/errors` | Six failure modes, each reaching Sentry by a different path |
| `/reports` | Server component with manual spans, plus two server actions |

### API routes

| Route | Behaviour |
| --- | --- |
| `GET /api/orders` | Lists orders; counter, gauge, latency distribution |
| `POST /api/orders` | Creates one (201) or rejects a bad payload (400) |
| `GET /api/stats` | Nested cache span; four gauges |
| `POST /api/telemetry` | Emits a server log at a requested level plus one metric |
| `POST /api/checkout` | Flaky — ~35% return 402 with a `PaymentDeclinedError` |
| `GET /api/boom` | Always throws, reported via `onRequestError` |

## Sentry wiring

| File | Runtime |
| --- | --- |
| `src/instrumentation-client.ts` | Browser. Also exports `onRouterTransitionStart` for navigation spans. |
| `sentry.server.config.ts` | Node |
| `sentry.edge.config.ts` | Edge |
| `src/instrumentation.ts` | Loads the right config per runtime; exports `onRequestError` |
| `next.config.ts` | `withSentryConfig` for source maps |
| `src/app/error.tsx`, `src/app/global-error.tsx` | React error boundaries |

All three runtimes set `tracesSampleRate: 1.0`, `enableLogs: true` and
`enableMetrics: true`. No `replayIntegration` is registered anywhere.

### Two things worth knowing

- **`tunnelRoute` is not enabled.** Under Next 16's Turbopack build the tunnel
  endpoint isn't generated, so setting it makes the browser POST events to a
  404 and they disappear silently. Events go straight to ingest instead. If you
  need the tunnel to dodge ad blockers, verify the route actually responds
  before relying on it.
- **Source maps** need `SENTRY_ORG`, `SENTRY_PROJECT` and `SENTRY_AUTH_TOKEN` at
  build time. Without them the build still succeeds, it just skips the upload.

## Verified

`npm run build`, `npx tsc --noEmit` and `npm run lint` all pass. Server-side
signals were confirmed end to end by pointing the DSN at a local stand-in for
Sentry ingest and driving every route: transaction, `trace_metric`, `log` and
error `event` envelopes all arrived. Browser-side emission was not exercised by
an automated test — click through `/telemetry` and `/errors` to confirm it.
