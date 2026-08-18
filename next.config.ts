import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Document-Policy",
            value: "js-profiling",
          },
        ],
      },
    ];
  },
};

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,

  // NOTE: `tunnelRoute` is deliberately not set. Under Next 16's Turbopack
  // build the tunnel endpoint isn't generated, so enabling it makes the client
  // POST events to a 404 and they vanish. Send directly to ingest instead.

  // Upload source maps but keep them off the public bundle.
  sourcemaps: { deleteSourcemapsAfterUpload: true },

  silent: !process.env.CI,
});
