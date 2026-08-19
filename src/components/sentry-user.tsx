"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";
import { pickRandomDemoUser } from "@/lib/demo-users";

const LOGIN_DELAY_MS = 5000;

// Stands in for a real auth flow: nobody is identified for the first few
// seconds, then a randomly picked user "logs in" and gets attached to Sentry.
export function SentryUser() {
  useEffect(() => {
    const timer = setTimeout(() => {
      const user = pickRandomDemoUser();
      Sentry.setUser(user);
      Sentry.logger.info("Simulated login", { origin: "browser", ...user });
    }, LOGIN_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  return null;
}
