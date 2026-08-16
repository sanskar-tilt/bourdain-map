import { allCities, cityBySlug, SHOW_NAMES } from "../../../lib/detail";
import styles from "./city.module.css";

export function generateStaticParams() {
  return allCities().map((c) => ({ slug: c.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const c = cityBySlug(params.slug);
  if (!c) return { title: "Not found" };
  return {
    title: `${c.name} — where he ate`,
    description: `${c.places.length} places Anthony Bourdain went in ${c.name}.`,
  };
}

/* Where a city already has a good guide elsewhere, link it rather than
   thinning it into a summary. These people did the work. */
function elsewhere(city: { name: string }) {
  const q = encodeURIComponent(city.name);
  return [
    {
      href: `https://eatlikebourdain.com/?s=${q}`,
      label: "eatlikebourdain.com",
      what: "City guides in far more detail than we carry",
    },
    {
      href: `https://www.reddit.com/r/AnthonyBourdain/search/?q=${q}&restrict_sr=1`,
      label: "r/AnthonyBourdain",
      what: "What people who went are saying",
    },
  ];
}

export default function CityPage({ params }: { params: { slug: string } }) {
  const city = cityBySlug(params.slug);
  if (!city) return <p className={styles.missing}>No such city.</p>;

  const gone = city.places.filter((p) => p.status === "closed").length;
  // Only exact matches are stated plainly; weaker ones are marked as such,
  // because a country-level match is a guess with a nice haircut.
  const episodes = city.episodes.filter((e) => e.match === "exact");
  const looser = city.episodes.filter((e) => e.match !== "exact");

  return (
    <article className={styles.city}>
      <h1 className={styles.name}>{city.name}</h1>
      <p className={styles.count}>
        {city.places.length} place{city.places.length === 1 ? "" : "s"}
        {gone > 0 && <>, {gone} of them gone</>}
      </p>

      {episodes.length > 0 && (
        <section className={styles.section}>
          <h2 className={styles.h2}>He filmed here</h2>
          <ul className={styles.eps}>
            {episodes.map((e, i) => (
              <li key={i}>
                <span className={styles.epShow}>{SHOW_NAMES[e.show] ?? e.show}</span>
                <span className={styles.epNum}>
                  {e.season != null && `S${e.season}`}
                  {e.episode != null && `E${e.episode}`}
                </span>
                <span className={styles.epTitle}>{e.title}</span>
                {e.airDate && <span className={styles.epDate}>{e.airDate}</span>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {city.videoUrl ? (
        <section className={styles.section}>
          <h2 className={styles.h2}>Watch</h2>
          <a className={styles.video} href={city.videoUrl} rel="noreferrer" target="_blank">
            {city.videoTitle ?? "Official clip"}
            <span className={styles.videoSource}>{city.videoSource}</span>
          </a>
        </section>
      ) : (
        <section className={styles.section}>
          <h2 className={styles.h2}>Watch</h2>
          <p className={styles.empty}>
            No official clip for {city.name} that we can point at. Only the real
            uploads go here — the rips get taken down and the link rots.
          </p>
        </section>
      )}

      <section className={styles.section}>
        <h2 className={styles.h2}>The places</h2>
        <ul className={styles.places}>
          {city.places.map((p) => (
            <li key={p.slug ?? p.name} data-gone={p.status === "closed"}>
              {p.slug ? (
                <a className={styles.placeName} href={`/place/${p.slug}/`}>{p.name}</a>
              ) : (
                <span className={styles.placeName}>{p.name}</span>
              )}
              <span className={styles.placeShows}>
                {p.shows.map((s) => SHOW_NAMES[s] ?? s).join(" · ")}
                {p.status === "closed" && " · gone"}
              </span>
              {(p.ate || p.note) && (
                <span className={styles.placeAte}>{p.ate ?? p.note}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className={styles.section}>
        <h2 className={styles.h2}>Elsewhere</h2>
        <p className={styles.elsewhereIntro}>
          Other people have written about {city.name} at length. Go and read
          them.
        </p>
        <ul className={styles.links}>
          {elsewhere(city).map((l) => (
            <li key={l.href}>
              <a href={l.href} rel="noreferrer" target="_blank">{l.label}</a>
              <span>{l.what}</span>
            </li>
          ))}
        </ul>
      </section>

      {looser.length > 0 && (
        <p className={styles.looser}>
          {looser.length} other episode{looser.length === 1 ? "" : "s"} may cover
          this city — matched on country or region rather than by name, so
          they&rsquo;re not stated as fact here.
        </p>
      )}
    </article>
  );
}
