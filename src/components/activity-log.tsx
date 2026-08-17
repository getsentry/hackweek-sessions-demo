"use client";

import { useCallback, useState } from "react";

export type Tone = "info" | "success" | "error";

export type Entry = {
  id: number;
  at: string;
  tone: Tone;
  text: string;
};

let nextId = 0;

export function useActivityLog() {
  const [entries, setEntries] = useState<Entry[]>([]);

  const push = useCallback((tone: Tone, text: string) => {
    const entry: Entry = {
      id: nextId++,
      // Only ever called from an event handler, so no hydration concern.
      at: new Date().toLocaleTimeString(),
      tone,
      text,
    };
    setEntries((prev) => [entry, ...prev].slice(0, 40));
  }, []);

  const clear = useCallback(() => setEntries([]), []);

  return { entries, push, clear };
}

const TONE_CLASS: Record<Tone, string> = {
  info: "text-muted",
  success: "text-emerald-600 dark:text-emerald-400",
  error: "text-red-600 dark:text-red-400",
};

export function ActivityLog({
  entries,
  onClear,
}: {
  entries: Entry[];
  onClear: () => void;
}) {
  return (
    <section className="rounded-xl border border-border bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">Activity</h2>
        <button
          onClick={onClear}
          disabled={entries.length === 0}
          className="text-xs text-muted underline-offset-2 hover:underline disabled:opacity-40 disabled:no-underline"
        >
          Clear
        </button>
      </div>

      <ul className="mt-3 max-h-80 space-y-1.5 overflow-y-auto font-mono text-xs leading-relaxed">
        {entries.length === 0 ? (
          <li className="text-muted">
            Nothing yet — press a button above.
          </li>
        ) : (
          entries.map((entry) => (
            <li key={entry.id} className="flex gap-3">
              <span className="shrink-0 text-muted/70">{entry.at}</span>
              <span className={`break-all ${TONE_CLASS[entry.tone]}`}>
                {entry.text}
              </span>
            </li>
          ))
        )}
      </ul>
    </section>
  );
}
