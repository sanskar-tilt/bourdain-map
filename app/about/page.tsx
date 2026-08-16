import { placeBySlug } from "../../lib/detail";
import { siteStats, n } from "../../lib/stats";
import {
  aboutManifest,
  photoMeta,
  usable,
  srcsetAttr,
  largest,
  type PhotoMeta,
} from "../../lib/about";
import styles from "./about.module.css";

export const metadata = {
  title: "About",
  description:
    "Why this map exists. Fan-made, sells nothing, not affiliated with the " +
    "Bourdain estate, CNN, or Zero Point Zero.",
};

/* A photo, or a marked gap where one goes. Every image reserves its space
   from the intrinsic ratio recorded at build time, so nothing shifts. */
function Photo({
  file,
  meta,
  alt,
  className,
  ratio = 1.5,
  sizes,
}: {
  file?: string;
  meta?: PhotoMeta;
  alt?: string;
  className?: string;
  ratio?: number;
  sizes: string;
}) {
  if (!file || !usable(meta)) {
    return (
      <div
        className={`${styles.gap} ${className ?? ""}`}
        style={{ aspectRatio: String(ratio) }}
      >
        <span>{file ? `${file} — not in public/about/` : "photo"}</span>
      </div>
    );
  }
  return (
    <img
      className={className}
      src={largest(meta)}
      srcSet={srcsetAttr(meta)}
      sizes={sizes}
      alt={alt ?? ""}
      width={meta.width ?? undefined}
      height={meta.height ?? undefined}
      style={{ aspectRatio: meta.ratio ? String(meta.ratio) : undefined }}
      loading="lazy"
      decoding="async"
    />
  );
}

export default function About() {
  const stats = siteStats();
  const m = aboutManifest();
  const photos = photoMeta();
  const places = (m.places ?? []).filter(
    (p) => p && (p.photo || p.caption || p.placeSlug)
  );
  const essay = (m.essay?.paragraphs ?? []).filter((p) => p && p.trim());

  return (
    <article className={styles.about}>
      {/* ---------------------------------------------------------- intro */}
      <header className={styles.intro}>
        <Photo
          file={m.intro?.photo}
          meta={m.intro?.photo ? photos[m.intro.photo] : undefined}
          alt={m.intro?.alt}
          className={styles.introPhoto}
          ratio={1}
          sizes="(max-width: 720px) 40vw, 200px"
        />
        <div className={styles.introText}>
          <h1 className={styles.h1}>About</h1>
          {m.intro?.text?.trim() ? (
            <p className={styles.lede}>{m.intro.text}</p>
          ) : (
            <p className={`${styles.lede} ${styles.todo}`}>
              <span className={styles.todoTag}>Yours to write</span>
              A short introduction — who you are and why you built this. Set{" "}
              <code>intro.text</code> in <code>content/about.json</code>.
            </p>
          )}
        </div>
      </header>

      {/* ------------------------------------------------------ the places */}
      <section className={styles.section}>
        <h2 className={styles.h2}>Places of his I&rsquo;ve been to</h2>
        {places.length === 0 ? (
          <p className={styles.todo}>
            <span className={styles.todoTag}>Empty</span>
            Add entries to <code>places</code> in{" "}
            <code>content/about.json</code> — a filename, a caption, and the
            slug of the pin it belongs to.
          </p>
        ) : (
          <ul className={styles.grid}>
            {places.map((p, i) => {
              const place = p.placeSlug ? placeBySlug(p.placeSlug) : null;
              // A slug that doesn't resolve is a typo, not a reason to hide
              // the photo. Say so at build time and render it unlinked.
              if (p.placeSlug && !place) {
                console.warn(
                  `[about] content/about.json: no place with slug "${p.placeSlug}"`
                );
              }
              const caption = p.caption?.trim() || place?.name || null;
              return (
                <li key={i} className={styles.card} data-cursor="sit">
                  <Photo
                    file={p.photo}
                    meta={p.photo ? photos[p.photo] : undefined}
                    alt={p.alt ?? caption ?? ""}
                    className={styles.cardPhoto}
                    ratio={1.5}
                    sizes="(max-width: 720px) 100vw, 340px"
                  />
                  <figcaption className={styles.caption}>
                    {place ? (
                      <a href={`/place/${place.slug}/`}>
                        {caption}
                        {place.city && (
                          <span className={styles.cardCity}>{place.city}</span>
                        )}
                      </a>
                    ) : (
                      <span>
                        {caption ?? "Caption and place slug go in the manifest"}
                      </span>
                    )}
                  </figcaption>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ----------------------------------------------------- the tattoo */}
      <section className={styles.section}>
        <h2 className={styles.h2}>The tattoo</h2>
        <figure className={styles.tattoo} data-cursor="sit">
          <Photo
            file={m.tattoo?.photo}
            meta={m.tattoo?.photo ? photos[m.tattoo.photo] : undefined}
            alt={m.tattoo?.alt}
            className={styles.tattooPhoto}
            ratio={1.2}
            sizes="(max-width: 720px) 100vw, 420px"
          />
          {m.tattoo?.caption?.trim() ? (
            <figcaption className={styles.caption}>{m.tattoo.caption}</figcaption>
          ) : (
            <figcaption className={`${styles.caption} ${styles.todo}`}>
              <span className={styles.todoTag}>Yours to write</span>
              What it is and why. <code>tattoo.caption</code>.
            </figcaption>
          )}
        </figure>
      </section>

      {/* ------------------------------------------------------- the essay */}
      <section className={styles.section}>
        <h2 className={styles.h2}>What he means to me</h2>
        {essay.length > 0 ? (
          <div className={styles.essay}>
            {essay.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        ) : (
          <div className={styles.placeholder}>
            <p className={styles.todoTag}>
              Placeholder — this section is yours, in your words
            </p>
            <p className={styles.placeholderNote}>
              Add paragraphs to <code>essay.paragraphs</code> in{" "}
              <code>content/about.json</code>. Nothing here is written for you,
              and it shouldn&rsquo;t be — this is the one part of the site that
              has to sound like a person.
            </p>
            <p className={styles.placeholderNote}>
              A shape that might help, from <code>notes/why.md</code>: the idea
              of his that stuck; what you want to do with it; who you&rsquo;re
              hoping turns up. Ignore it if it gets in the way.
            </p>
          </div>
        )}
      </section>

      {/* ------------------------------------------------ non-negotiables */}
      <section className={styles.terms}>
        <h2 className={styles.h2}>The dull but important part</h2>
        <ul className={styles.plain}>
          <li>
            Almost every place on this map comes from a map{" "}
            <strong>deannd</strong> built on r/AnthonyBourdain over about two
            years, watching the shows and writing down where he went.{" "}
            {n(stats.places)} places. Used with permission. Her descriptions appear throughout,
            quoted and credited — they&rsquo;re hers, not mine.
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
        </ul>
      </section>
    </article>
  );
}
