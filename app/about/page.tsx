import { siteStats, n } from "../../lib/stats";
import { aboutManifest } from "../../lib/about";
import Credits from "../components/Credits";
import styles from "./about.module.css";
import Link from "next/link";

export const metadata = {
  title: "About",
  description:
    "Why this map exists. Fan-made, sells nothing, not affiliated with the " +
    "Bourdain estate, CNN, or Zero Point Zero.",
};

export default function About() {
  const stats = siteStats();
  const m = aboutManifest();
  const essay = (m.essay?.paragraphs ?? []).filter((p) => p && p.trim());

  return (
    <article className={styles.about}>
      <header className={styles.intro}>
        <div className={styles.introText}>
          <h1 className={styles.h1}>About</h1>
          <p className={styles.lede}>
            {m.intro?.text?.trim() ||
              "A map of where Anthony Bourdain ate, and a way for strangers to sit down at those places and eat together."}
          </p>
        </div>
      </header>

      <section className={styles.section}>
        <h2 className={styles.h2}>The idea</h2>
        <div className={styles.essay}>
          {essay.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>
        <p>
          <Link href="/tables/#london">Hear about the first London dinner</Link>
          {" · "}
          <Link href="/map/">Open the map</Link>
        </p>
      </section>

      <section className={styles.terms}>
        <h2 className={styles.h2}>The dull but important part</h2>
        <ul className={styles.plain}>
          <li>
            Almost every place on this map comes from a map{" "}
            <strong>deannd</strong> built on r/AnthonyBourdain over about two
            years, watching the shows and writing down where he went.{" "}
            {n(stats.places)} places. Used with permission. Her descriptions
            appear throughout, quoted and credited — they&rsquo;re hers, not
            the site&rsquo;s voice.
          </li>
          <li>
            This site sells nothing. No ads, no affiliate links, no bookings,
            no sponsored placement. Not now and not later.
          </li>
          <li>
            It is not affiliated with the Bourdain estate, CNN, or Zero Point
            Zero. Nobody involved with the shows has anything to do with it.
          </li>
          <li>
            Some of these places are gone. They stay on the map, greyed out,
            because a restaurant closing is part of the story — and because it
            stops you turning up to a shuttered address.
          </li>
          <li>
            The pullback film is by MANIFESTO (@bymnfsto), used with
            permission. Food stills are CC0 / public domain. Portraits of him
            are CC BY 2.0 via Wikimedia Commons.
          </li>
        </ul>
      </section>

      <Credits />
    </article>
  );
}
