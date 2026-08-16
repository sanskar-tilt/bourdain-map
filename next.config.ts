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
};

export default nextConfig;
