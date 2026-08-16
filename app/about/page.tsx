import styles from "./about.module.css";

export const metadata = {
  title: "About",
  description:
    "A fan-made map of every place Anthony Bourdain ate. Sells nothing, " +
    "not affiliated with the Bourdain estate, CNN, or Zero Point Zero.",
};

export default function About() {
  return (
    <article className={styles.about}>
      <h1 className={styles.h1}>About</h1>

      <p className={styles.lede}>
        A map of everywhere Anthony Bourdain ate, and a way to go and eat
        there with someone you haven&rsquo;t met.
      </p>

      <p>
        The idea it&rsquo;s built on is one of his, and it&rsquo;s not
        complicated: people everywhere are broadly the same, most of them are
        kind, and everyone has a story worth hearing. That&rsquo;s easy to put
        on an About page and hard to build into a website. The attempt here is
        the table — someone picks a place, sets a date, opens a few seats,
        strangers take them. Afterwards whoever went writes something about who
        they met. Not a review. There are no stars anywhere on this site and
        there never will be.
      </p>

      <p>
        Some of these places are gone. They&rsquo;re still on the map, greyed
        out, because a restaurant closing is part of the story and because it
        stops you turning up to a shuttered address.
      </p>

      <h2 className={styles.h2}>Where the places came from</h2>
      <p>
        Almost all of them come from a map that <strong>deannd</strong> built
        on r/AnthonyBourdain over about two years, watching the shows and
        writing down where he went. That&rsquo;s 2,095 places. It is the entire
        foundation of this site and it is used with permission.
      </p>
      <p>
        Her descriptions appear throughout, quoted and credited. They&rsquo;re
        hers, not ours, and they&rsquo;re marked that way everywhere they
        appear.
      </p>

      <h2 className={styles.h2}>What this isn&rsquo;t</h2>
      <ul className={styles.plain}>
        <li>
          This site sells nothing. No ads, no affiliate links, no bookings, no
          sponsored placement. Not now and not later — it&rsquo;s a condition
          of using the data.
        </li>
        <li>
          It is not affiliated with the Bourdain estate, CNN, or Zero Point
          Zero. Nobody involved with the shows has anything to do with it.
        </li>
        <li>
          It is not a memorial. He would have hated that.
        </li>
      </ul>

      <h2 className={styles.h2}>Corrections</h2>
      <p>
        Plenty of this is wrong. Places have closed, coordinates are off, and
        the episode data is thinner than it looks. If you know better, say so —
        that&rsquo;s what the box on each place is for.
      </p>
    </article>
  );
}
