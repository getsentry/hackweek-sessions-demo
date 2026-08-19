"use client";

import * as Sentry from "@sentry/nextjs";
import { useState, useSyncExternalStore } from "react";
import type { ComponentProps, ReactNode } from "react";

type Snapshot = {
  sessionId: string | undefined;
  replayId: string | undefined;
};

const EMPTY: Snapshot = { sessionId: undefined, replayId: undefined };
let snapshot: Snapshot = EMPTY;
const listeners = new Set<() => void>();

function readSnapshot(): Snapshot {
  return {
    sessionId: Sentry.getIsolationScope().getSession()?.sid,
    replayId: Sentry.getReplay()?.getReplayId(),
  };
}

function notify() {
  const next = readSnapshot();
  if (
    next.sessionId === snapshot.sessionId &&
    next.replayId === snapshot.replayId
  ) {
    return;
  }
  snapshot =
    next.sessionId === undefined && next.replayId === undefined ? EMPTY : next;
  for (const listener of listeners) listener();
}

function subscribe(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  snapshot = readSnapshot();
  if (
    snapshot.sessionId === undefined &&
    snapshot.replayId === undefined
  ) {
    snapshot = EMPTY;
  }

  const client = Sentry.getClient();
  const unsubs = [
    client?.on("replayStart", notify),
    client?.on("replayEnd", notify),
    client?.on("beforeSendSession", notify),
  ];

  return () => {
    listeners.delete(onStoreChange);
    for (const unsub of unsubs) unsub?.();
  };
}

function getSnapshot() {
  return snapshot;
}

function getServerSnapshot() {
  return EMPTY;
}

function shortId(id: string | undefined) {
  if (!id) return "—";
  return id.length > 8 ? `${id.slice(0, 8)}…` : id;
}

function MiniButton({ children, ...props }: ComponentProps<"button">) {
  return (
    <button
      {...props}
      type="button"
      className="rounded-md border border-border bg-background px-2 py-1 text-xs font-medium text-foreground transition-colors hover:border-muted disabled:cursor-not-allowed disabled:opacity-50"
    >
      {children}
    </button>
  );
}

export function SessionControls() {
  const { sessionId, replayId } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );
  const [replayBusy, setReplayBusy] = useState(false);

  function startSession() {
    Sentry.startSession({ ignoreDuration: true });
    Sentry.captureSession();
    notify();
  }

  function endSession() {
    Sentry.endSession();
    notify();
  }

  function startReplay() {
    Sentry.getReplay()?.start();
    notify();
  }

  async function stopReplay() {
    setReplayBusy(true);
    try {
      await Sentry.getReplay()?.stop();
    } finally {
      setReplayBusy(false);
      notify();
    }
  }

  return (
    <div className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-6 py-2 text-xs">
        <ControlGroup
          label="Session"
          id={sessionId}
          active={Boolean(sessionId)}
        >
          <MiniButton
            aria-label={sessionId ? "Start new session" : "Start session"}
            onClick={startSession}
          >
            {sessionId ? "Start new" : "Start"}
          </MiniButton>
          <MiniButton
            aria-label="End session"
            onClick={endSession}
            disabled={!sessionId}
          >
            End
          </MiniButton>
        </ControlGroup>

        <ControlGroup label="Replay" id={replayId} active={Boolean(replayId)}>
          <MiniButton
            aria-label="Start replay"
            onClick={startReplay}
            disabled={Boolean(replayId) || replayBusy}
          >
            Start
          </MiniButton>
          <MiniButton
            aria-label="Stop replay"
            onClick={stopReplay}
            disabled={!replayId || replayBusy}
          >
            {replayBusy ? "Stopping…" : "Stop"}
          </MiniButton>
        </ControlGroup>
      </div>
    </div>
  );
}

function ControlGroup({
  label,
  id,
  active,
  children,
}: {
  label: string;
  id: string | undefined;
  active: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        aria-hidden
        className={`inline-block size-1.5 rounded-full ${
          active ? "bg-accent" : "bg-border"
        }`}
      />
      <span className="font-medium">{label}</span>
      <code className="font-mono text-muted" title={id}>
        {shortId(id)}
      </code>
      {children}
    </div>
  );
}
