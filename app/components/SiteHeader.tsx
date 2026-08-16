"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./SiteShell.module.css";

const NAV = [
  { href: "/map/", label: "Map" },
  { href: "/tables/", label: "Tables" },
  { href: "/stories/", label: "Stories" },
  { href: "/about/", label: "About" },
];

export default function SiteHeader() {
  const path = usePathname() ?? "/";
  return (
    <header className={styles.header}>
      {/* next/link prefetches on hover by default in production builds. */}
      <Link href="/" className={styles.wordmark}>Where he ate</Link>
      <nav className={styles.nav}>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} aria-current={path.startsWith(n.href) ? "page" : undefined}>
            {n.label}
          </Link>
        ))}
        <Link href="/account/">You</Link>
      </nav>
    </header>
  );
}
