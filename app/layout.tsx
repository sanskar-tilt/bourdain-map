import type { Metadata } from "next";
import { Instrument_Serif, Inter_Tight } from "next/font/google";
import "./tokens.css";
import "./globals.css";
import MapShell from "./components/MapShell";

/* next/font self-hosts these at build time, so there is no runtime request to
   a font CDN and no silent fallback. Two families, no more: a display serif
   with actual character for names, one plain grotesk for everything else. */
const display = Instrument_Serif({
  variable: "--font-display-loaded",
  subsets: ["latin"],
  weight: "400",
  display: "swap",
});
const body = Inter_Tight({
  variable: "--font-body-loaded",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Where he ate",
  description:
    "Every place Anthony Bourdain ate, on one map. Fan-made, non-commercial, " +
    "not affiliated with the Bourdain estate, CNN, or Zero Point Zero.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {/* The map is mounted here, above the router, and never unmounts.
            Navigating to /place/x or /city/y changes what is selected and
            where the camera is — it does not rebuild the map, so there is no
            white flash and no tile refetch. */}
        <MapShell>{children}</MapShell>
      </body>
    </html>
  );
}
