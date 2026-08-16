import { allPlaces, placeBySlug, SHOW_NAMES } from "../../../lib/detail";
import styles from "./place.module.css";

export function generateStaticParams() {
  return allPlaces().map((p) => ({ slug: p.slug }));
}

const regionName = (cc: string | null) => {
  if (!cc) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(cc) ?? cc;
  } catch {
    return cc;
  }
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = placeBySlug(slug);
  if (!p) return { title: "Not found" };
  const where = p.city ?? regionName(p.cc);
  return {
    title: `${p.name}${where ? ` — ${where}` : ""}`,
    description: `Anthony Bourdain went to ${p.name}${where ? ` in ${where}` : ""}.`,
  };
}

export default async function PlacePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const place = placeBySlug(slug);
  if (!place) {
    return (
      <p className={styles.missing}>
        No such place. It may have been merged into another pin.
      </p>
    );
  }

  const gone = place.status === "closed";
  const unnamed = /^meals? with/i.test(place.name);
  const country = regionName(place.cc);

  return (
    <article className={styles.place} data-gone={gone}>
      <h1 className={styles.name}>{place.name}</h1>

      <p className={styles.meta}>
        {place.citySlug ? (
          <a href={`/city/${place.citySlug}/`}>{place.city}</a>
        ) : (
          /* McMurdo Station is not in a city, and that is the correct answer
             rather than missing data. It still gets a name, a country and a
             page. */
          <span>{country ?? "Somewhere unmapped"}</span>
        )}
        {gone && <span className={styles.gone}>gone</span>}
      </p>

      {place.statusNote && <p className={styles.statusNote}>{place.statusNote}</p>}

      {unnamed && (
        <p className={styles.unnamed}>
          Nobody wrote down whose table this was.
        </p>
      )}

      <ol className={styles.visits}>
        {place.appearances.map((a, i) => {
          const inferred = a.episodeSource === "inferred";
          return (
            <li key={i} className={styles.visit}>
              <p className={styles.show}>
                {SHOW_NAMES[a.show] ?? a.show}
                {a.season != null && <span className={styles.se}>S{a.season}</span>}
                {a.episode != null && (
                  <span className={inferred ? styles.seSoft : styles.se}>
                    E{a.episode}
                  </span>
                )}
              </p>

              {a.episodeTitle && (
                <p className={inferred ? styles.epTitleSoft : styles.epTitle}>
                  {a.episodeTitle}
                  {inferred && (
                    /* An episode we attributed from the city rather than
                       established for this place. Saying so costs one line and
                       buys the rest of the page its credibility. */
                    <span className={styles.qualifier}>
                      likely — matched on the city, not this place
                    </span>
                  )}
                </p>
              )}

              {a.ate && <p className={styles.ate}>{a.ate}</p>}

              {a.note && (
                /* deannd's words, quoted and credited. Not the site's voice. */
                <figure className={styles.quote}>
                  <blockquote>{a.note}</blockquote>
                  <figcaption>deannd</figcaption>
                </figure>
              )}
            </li>
          );
        })}
      </ol>

      <p className={styles.credit}>
        This place, and what he ate here, comes from the map <strong>deannd</strong>{" "}
        built on r/AnthonyBourdain over two years. Used with permission.
      </p>
    </article>
  );
}
