import Link from "next/link";
import { HealthPanel } from "@/components/health-panel";
import { PageHeader } from "@/components/ui";

const SECTIONS = [
  {
    href: "/orders",
    label: "Orders",
    blurb:
      "Buttons that GET and POST to route handlers. Each request produces a trace with a database span, plus counters and latency distributions.",
  },
  {
    href: "/telemetry",
    label: "Telemetry",
    blurb:
      "Emit structured logs at every level and all three metric types, from either the browser or the server.",
  },
  {
    href: "/errors",
    label: "Errors",
    blurb:
      "Six ways to break things: handled, unhandled, promise rejection, render crash, API 500 and a failed fetch.",
  },
  {
    href: "/reports",
    label: "Reports",
    blurb:
      "Server-rendered data with manual spans, and a server action that throws so you can see the server-side error path.",
  },
];

export default function Home() {
  return (
    <div className="space-y-8">
      <PageHeader title="Sentry Next.js demo">
        A small app wired up with the Sentry Next.js SDK across the browser,
        Node and edge runtimes. Errors, tracing, logs and metrics are all
        enabled; Session Replay is deliberately left out.
      </PageHeader>

      <HealthPanel />

      <div className="grid gap-4 sm:grid-cols-2">
        {SECTIONS.map((section) => (
          <Link
            key={section.href}
            href={section.href}
            className="group rounded-xl border border-border bg-surface p-5 transition-colors hover:border-accent"
          >
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              {section.label}
              <span
                aria-hidden
                className="text-muted transition-transform group-hover:translate-x-0.5"
              >
                →
              </span>
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {section.blurb}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
