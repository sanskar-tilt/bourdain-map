"use client";

import { usePathname } from "next/navigation";
import MapShell from "./MapShell";
import SiteHeader from "./SiteHeader";
import SmoothScroll from "./SmoothScroll";
import styles from "./SiteShell.module.css";

/* Two layouts, chosen by route.

   Map routes keep the full-bleed map with a panel over it. Everything else
   is an ordinary document. The map only mounts on the routes that need it —
   the homepage should not be paying for MapLibre. Within the map routes it
   still never unmounts, so navigating pin → city → pin costs nothing. */

const isMapRoute = (p: string) =>
  p === "/map" || p.startsWith("/map/") ||
  p.startsWith("/place/") || p.startsWith("/city/");

export default function SiteShell({ children }: { children: React.ReactNode }) {
  const path = usePathname() ?? "/";

  // No smoothing on map routes: the map owns the wheel there.
  if (isMapRoute(path)) return <MapShell>{children}</MapShell>;

  return (
    <div className={styles.doc}>
      <SmoothScroll />
      <SiteHeader />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
