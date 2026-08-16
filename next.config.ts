import type { NextConfig } from "next";

/**
 * Static export. The read path never touches a database: the site is
 * `places.geojson`, `search-index.json` and one JSON per city, served from a
 * CDN and cached. Postgres is the build-time workbench, not the runtime.
 *
 * Verified before committing to this (see notes/decisions.md):
 *   - Supabase magic link works. Both flows resolve in the browser — implicit
 *     puts the token in the URL fragment, PKCE exchanges ?code= via
 *     exchangeCodeForSession(). Neither needs a server route. What would NOT
 *     work is @supabase/ssr's cookie-based session, which requires one.
 *   - Live RSVP counts work. A static page client-fetches the gathering_seats
 *     view with the anon key. Confirmed against the running instance.
 *
 * So the eventual gatherings and auth work does not force SSR later.
 */
const nextConfig: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  // A stray package-lock.json in the home directory makes Turbopack infer the
  // workspace root as ~ and warn on every start. Pinning it silences that and
  // keeps module resolution inside the project.
  turbopack: { root: __dirname },
  // next dev 403s chunk requests whose origin it doesn't recognise, and the
  // symptom is a blank map rather than anything mentioning permissions —
  // /_next/static/chunks/*.js simply abort. Both spellings of localhost are
  // the same machine.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // The dev-tools badge defaults to bottom-left, directly on top of the map's
  // status line. Dev-only, so it never affected production, but it obscured
  // the empty state during development.
  devIndicators: { position: "bottom-right" },
};

export default nextConfig;
