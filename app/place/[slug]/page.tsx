import { allPlaces, placeBySlug, SHOW_NAMES } from "../../../lib/detail";
import styles from "./place.module.css";

export function generateStaticParams() {
  return allPlaces().map((p) => ({ slug: p.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }) {
  const p = placeBySlug(params.slug);
  if (!p) return { title: "Not found" };
  return {
    title: `${p.name}${p.city ? ` — ${p.city}` : ""}`,
    description: `Anthony Bourdain ate at ${p.name}${p.city ? ` in ${p.city}` : ""}.`,
  };
}

export default function PlacePage({ params }: { params: { slug: string } }) {
  const place = placeBySlug(params.slug);
  if (!place) {
    return <p className={styles.missing}>No such place. It may have been merged into another pin.</p>;
  }

  const gone = place.status === "closed";
  const unnamed = /^meals? with/i.test(place.name);

  return (
    <article className={styles.place}>
      <h1 className={styles.name}>{place.name}</h1>

      <p className={styles.meta}>
        {place.citySlug ? (
          <a href={`/city/${place.citySlug}/`}>{place.city}</a>
        ) : (
          <span>Location unresolved</span>
        )}
        {gone && <span className={styles.gone}>Gone</span>}
      </p>

      {place.statusNote && <p className={styles.statusNote}>{place.statusNote}</p>}

      {unnamed && (
        <p className={styles.unnamed}>
          Nobody wrote down whose table this was.
        </p>
      )}

      <ol className={styles.visits}>
        {place.appearances.map((a, i) => (
          <li key={i} className={styles.visit}>
            <p className={styles.show}>
              {SHOW_NAMES[a.show] ?? a.show}
              {a.season != null && <span className={styles.se}>Season {a.season}</span>}
              {a.episode != null && <span className={styles.se}>Episode {a.episode}</span>}
            </p>
            {a.episodeTitle && <p className={styles.epTitle}>{a.episodeTitle}</p>}
            {a.ate && <p className={styles.ate}>{a.ate}</p>}
            {a.note && (
              /* deannd's words, quoted and credited. Not the site's voice. */
              <figure className={styles.quote}>
                <blockquote>{a.note}</blockquote>
                <figcaption>deannd</figcaption>
              </figure>
            )}
          </li>
        ))}
      </ol>

      <p className={styles.credit}>
        This place, and what he ate here, comes from the map{" "}
        <strong>deannd</strong> built on r/AnthonyBourdain over two years. Used
        with permission.
      </p>
    </article>
  );
}
