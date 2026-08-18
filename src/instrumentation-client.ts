import * as Sentry from "@sentry/nextjs";

const SESSION_ID_KEY = "session.id";
const getSessionId = () => Sentry.getIsolationScope().getSession()?.sid;

// Streamed telemetry (spans, logs, metrics) carries the session id as an attribute.
const attachSessionId = (item: { attributes?: Record<string, unknown> }) => {
  const sid = getSessionId();
  if (sid) (item.attributes ??= {})[SESSION_ID_KEY] = sid;
};

const attachSessionIdToEvent = <E extends Sentry.Event>(event: E): E => {
  const sid = getSessionId();
  if (sid) event.tags = { [SESSION_ID_KEY]: sid, ...event.tags };
  return event;
};

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment:
    process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,

  tracesSampleRate: 1.0,
  tracePropagationTargets: ["localhost", /^\/api\//],

  replaysSessionSampleRate: 1.0,
  replaysOnErrorSampleRate: 1.0,

  profileSessionSampleRate: 1.0,
  profileLifecycle: "trace",

  integrations: [
    // Mirror console.warn/console.error into Sentry logs.
    Sentry.consoleLoggingIntegration({ levels: ["warn", "error"] }),
    Sentry.replayIntegration(),
    Sentry.browserProfilingIntegration(),
    Sentry.feedbackIntegration(),
  ],
});

const client = Sentry.getClient();
client?.on("processSpan", attachSessionId);
client?.on("beforeCaptureLog", attachSessionId);
client?.on("processMetric", attachSessionId);

// Add session id to all events. This covers errors, feedback, and replays.
Sentry.addEventProcessor(attachSessionIdToEvent);

// Profile chunks have no tags/attributes and there is no specific hook we can use to attach the session id.
// Instead, filter directly from the envelope and attach the session id top level.
client?.on("beforeEnvelope", (envelope) => {
  const sid = getSessionId();
  if (!sid) return;
  for (const [itemHeader, payload] of envelope[1]) {
    if (itemHeader.type === "profile_chunk") {
      (payload as Record<string, unknown>)[SESSION_ID_KEY] = sid;
    }
    console.log("[beforeEnvelope]", itemHeader, payload);
  }
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
