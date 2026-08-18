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

  // Errors go through the event pipeline, not span streaming, so tag them here.
  beforeSend(event) {
    return attachSessionIdToEvent(event);
  },
});

const client = Sentry.getClient();
client?.on("processSpan", attachSessionId);
client?.on("beforeCaptureLog", attachSessionId);
client?.on("processMetric", attachSessionId);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
