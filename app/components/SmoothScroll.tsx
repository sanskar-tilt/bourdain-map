"use client";

import { useEffect } from "react";
import { startScroll } from "../../lib/scroll";

/** Boots the single Lenis instance and the one rAF loop the site shares. */
export default function SmoothScroll() {
  useEffect(() => startScroll(), []);
  return null;
}
