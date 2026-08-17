"use client";

import * as Sentry from "@sentry/nextjs";
import { useState } from "react";
import { ActivityLog, useActivityLog } from "@/components/activity-log";
import { Button, Card, PageHeader } from "@/components/ui";

class DemoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DemoError";
  }
}

/** Throws during render, which the route's error.tsx boundary catches. */
function Detonator({ armed }: { armed: boolean }) {
  if (armed) {
    throw new DemoError("React render crashed on purpose");
  }
  return null;
}

export default function ErrorsPage() {
  const [armed, setArmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const { entries, push, clear } = useActivityLog();

  function track(kind: string) {
    Sentry.metrics.count("demo.errors_triggered", 1, {
      attributes: { kind, origin: "browser" },
    });
  }

  function handled() {
    const error = new DemoError("Handled client-side exception");
    const id = Sentry.captureException(error, {
      tags: { demo_kind: "handled" },
    });
    track("handled");
    push("error", `captureException → event ${id.slice(0, 8)}…`);
  }

  function unhandled() {
    track("unhandled");
    push("error", "Throwing outside React — check the console and Sentry");
    // Thrown from a timer so React's boundary doesn't swallow it; the SDK's
    // global onerror handler picks it up instead.
    setTimeout(() => {
      throw new DemoError("Unhandled client-side exception");
    }, 0);
  }

  function rejection() {
    track("unhandled-rejection");
    push("error", "Rejecting a promise with no catch handler");
    void Promise.reject(new DemoError("Unhandled promise rejection"));
  }

  function renderCrash() {
    track("render");
    setArmed(true);
  }

  async function serverError() {
    setBusy(true);
    track("api-500");
    try {
      const res = await fetch("/api/boom");
      push("error", `GET /api/boom → ${res.status} ${res.statusText}`);
    } catch (err) {
      push("error", `GET /api/boom failed: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  async function badFetch() {
    setBusy(true);
    track("failed-fetch");
    try {
      const res = await fetch("/api/does-not-exist");
      if (!res.ok) {
        throw new DemoError(`Request failed with ${res.status}`);
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { demo_kind: "failed-fetch" } });
      push("error", `Captured: ${err}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Errors">
        Six different failure modes, each reaching Sentry through a different
        path — manual capture, the global handler, the React error boundary and
        Next&apos;s <code className="font-mono">onRequestError</code> hook. Every
        button also bumps the{" "}
        <code className="font-mono">demo.errors_triggered</code> counter.
      </PageHeader>

      <Detonator armed={armed} />

      <Card
        title="Client errors"
        description="The unhandled variants will also surface in your browser console — that is expected."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={handled}>
            Handled exception
          </Button>
          <Button variant="danger" onClick={unhandled}>
            Unhandled exception
          </Button>
          <Button variant="danger" onClick={rejection}>
            Unhandled promise rejection
          </Button>
          <Button variant="danger" onClick={renderCrash}>
            Crash this route&apos;s render
          </Button>
        </div>
      </Card>

      <Card
        title="Server errors"
        description="/api/boom throws inside the route handler; the 404 is captured manually on the client."
      >
        <div className="flex flex-wrap gap-2">
          <Button variant="danger" onClick={serverError} disabled={busy}>
            GET /api/boom (500)
          </Button>
          <Button variant="danger" onClick={badFetch} disabled={busy}>
            Fetch a missing endpoint (404)
          </Button>
        </div>
      </Card>

      <ActivityLog entries={entries} onClear={clear} />
    </div>
  );
}
