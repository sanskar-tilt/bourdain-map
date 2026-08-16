import Loader from "./components/Loader";
import Reveal from "./components/Reveal";
import HeroPullback from "./components/HeroPullback";
import TrailMap from "./components/TrailMap";
import MaskedText from "./components/MaskedText";
import { homeManifest, homePhotos, allCredits, pick } from "../lib/home";
import { siteStats, n, broadcastLine } from "../lib/stats";
import { placeBySlug } from "../lib/detail";
import { usable, srcsetAttr, largest, type PhotoMeta } from "../lib/about";
import s from "./components/home.module.css";
import Link from "next/link";

export const metadata = {
  title: "Where he ate",
  description:
    "Every place Anthony Bourdain ate, on one map — and a way to go and eat " +
    "there with someone you haven't met.",
};

/* A photo, or a marked gap. Credit renders next to the image, always. */
function Shot({
  file, meta, alt, credit, className, ratio = 1.5, sizes,
}: {
  file?: string; meta?: PhotoMeta; alt?: string; credit?: string;
  className?: string; ratio?: number; sizes: string;
}) {
  if (!file || !usable(meta)) {
    return (
      <div className={`${s.gap} ${className ?? ""}`} style={{ aspectRatio: String(ratio) }}>
        <span>{file ? `${file} — not in public/home/` : "photo"}</span>
      </div>
    );
  }
  return (
    <figure className={s.shot}>
      <img
        className={className}
        src={largest(meta)} srcSet={srcsetAttr(meta)} sizes={sizes}
        alt={alt ?? ""} width={meta.width ?? undefined} height={meta.height ?? undefined}
        style={{ aspectRatio: meta.ratio ? String(meta.ratio) : undefined }}
        decoding="async"
      />
      <figcaption className={s.credit}>
        {credit?.trim()
          ? credit
          : <span className={s.needsCredit}>credit required — set it in content/home.json</span>}
      </figcaption>
    </figure>
  );
}

/** A quote, arriving from behind a mask edge. Never a fade. */
function Quote({ text, big }: { text?: string; big?: boolean }) {
  if (!text?.trim()) {
    return (
      <p className={`${s.quote} ${s.todo}`}>
        <span className="label">yours to supply</span>
        A quote goes here — set it in <code>content/home.json</code>.
      </p>
    );
  }
  return (
    <MaskedText
      as="blockquote"
      text={text}
      className={big ? s.quoteBig : s.quote}
    />
  );
}

export default function Home() {
  const m = homeManifest();
  const photos = homePhotos();
  const credits = allCredits(m);
  const stats = siteStats();
  const range = broadcastLine(stats);

  // Attach the build-time image metadata to each manifest entry once.
  const withMeta = <T extends { photo?: string }>(e?: T) =>
    e ? { ...e, meta: e.photo ? photos[e.photo] : undefined } : undefined;

  const objects = (m.loader?.objects ?? [])
    .filter((o) => o?.photo)
    .map((o) => withMeta(o)!);
  const portrait = withMeta(m.loader?.portrait) ?? null;

  // Never the same twice: one photo and one quote drawn per visit.
  const hero = withMeta(pick(m.hero?.photos));
  const heroQuote = pick((m.hero?.quotes ?? []).filter(Boolean));
  const pair = withMeta(pick(m.pairing?.photos));

  // Where the photographed plate actually is. Null means we do not know, and
  // the hero says so rather than dropping a pin somewhere plausible.
  const heroPlace = hero?.placeSlug ? placeBySlug(hero.placeSlug) : null;
  if (hero?.placeSlug && !heroPlace) {
    console.warn(`[home] content/home.json: no place with slug "${hero.placeSlug}"`);
  }
  if (hero?.photo && !hero.placeSlug) {
    console.warn("[home] hero photo has no placeSlug — the pull-back cannot land on the map");
  }
  const target = heroPlace ? { lon: heroPlace.lon, lat: heroPlace.lat } : null;
  const pairQuote = pick((m.pairing?.quotes ?? []).filter(Boolean));

  return (
    <>
      <Loader objects={objects} portrait={portrait} total={stats.places} />
      <Reveal />

      {/* ------------------------------------------------ pinned hero */}
      <HeroPullback target={target}>
        <Shot
          file={hero?.photo} meta={hero?.meta}
          alt={hero?.alt} credit={hero?.credit}
          className={s.heroImg} ratio={1.6} sizes="100vw"
        />
      </HeroPullback>

      {/* The mark and the sentence sit under the photograph, not over it.
          These lines belong to the opening timeline, not to the observer. */}
      <section className={`${s.section} ${s.heroText}`}>
        <MaskedText as="p" text="Where he ate" className={s.heroMark} arrival />
        {heroQuote ? (
          <MaskedText as="blockquote" text={heroQuote} className={s.quoteBig} arrival />
        ) : (
          <Quote text={heroQuote} big />
        )}
      </section>

      {/* ------------------------------------------------ the counter */}
      <section className={`${s.section} ${s.counterSection} reveal`}>
        <MaskedText as="p" text={n(stats.places)} className={s.counter} />
        <p className="label">places{range ? `, ${range}` : ""}</p>
      </section>

      {/* ------------------------------------------- photo + quote */}
      <section className={`${s.section} ${s.pairing} reveal`}>
        <div>
          <Shot
            file={pair?.photo} meta={pair?.meta}
            alt={pair?.alt} credit={pair?.credit}
            className={s.pairImg} ratio={0.8} sizes="(max-width: 860px) 100vw, 40vw"
          />
        </div>
        <div className={s.pairText}>
          <Quote text={pairQuote} />
        </div>
      </section>

      {/* ------------------------------------------------- the trail */}
      <section className={`${s.section} reveal`}>
        <p className="label">the trail</p>
        <TrailMap height={340} />
      </section>

      {/* ------------------------------------------------- the video */}
      {m.video?.url?.trim() ? (
        <section className={`${s.section} reveal`}>
          <p className="label">{m.video.source || "watch"}</p>
          <div className={s.video}>
            <iframe
              src={m.video.url} title={m.video.title || "Official clip"}
              loading="lazy" allowFullScreen
            />
          </div>
        </section>
      ) : (
        <section className={`${s.section} reveal`}>
          <p className="label">watch</p>
          <p className={s.todo}>
            An official clip goes here when you have one — set{" "}
            <code>video.url</code>. Official uploads only; a dead link is worse
            than no link.
          </p>
        </section>
      )}

      {/* --------------------------------------------- the invitation */}
      <section className={`${s.section} ${s.invite} reveal`}>
        <MaskedText as="p" text="Pick a city." className={s.inviteLine} />
        <MaskedText as="p" text="Open a table." className={s.inviteLine} />
        <MaskedText as="p" text="Eat with a stranger." className={s.inviteLine} />
        <Link className={s.inviteCta} href="/map/">Open the map</Link>
      </section>

      {/* ------------------------------------------------- colophon */}
      <footer className={s.colophon}>
        <div className={s.colGrid}>
          <div>
            <p className="label">the places</p>
            <p className={s.colText}>
              Almost every place here comes from a map <strong>deannd</strong>{" "}
              built on r/AnthonyBourdain over about two years. {n(stats.places)} of them.
              Used with permission. Her descriptions appear throughout, quoted
              and credited — they are hers, not ours.
            </p>
          </div>
          <div>
            <p className="label">what this isn&rsquo;t</p>
            <p className={s.colText}>
              This site sells nothing. No ads, no affiliate links, no bookings,
              no sponsored placement — not now and not later.
            </p>
            <p className={s.colText}>
              It is not affiliated with the Bourdain estate, CNN, or Zero Point
              Zero. Nobody involved with the shows has anything to do with it.
            </p>
          </div>
          <div>
            <p className="label">photographs</p>
            {credits.length ? (
              <ul className={s.creditList}>
                {credits.map((c) => <li key={c.photo}>{c.credit}</li>)}
              </ul>
            ) : (
              <p className={s.colText}>
                <span className={s.needsCredit}>
                  No photo credits set yet. Every image needs one.
                </span>
              </p>
            )}
          </div>
        </div>
        <p className={s.colRule}>
          {m.colophon?.copyright?.trim() || "© the people who took the photographs"}
        </p>
      </footer>
    </>
  );
}
