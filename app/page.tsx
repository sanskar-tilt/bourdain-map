import Loader from "./components/Loader";
import Reveal from "./components/Reveal";
import PinnedHero from "./components/PinnedHero";
import TrailMap from "./components/TrailMap";
import { homeManifest, homePhotos, allCredits } from "../lib/home";
import { siteStats, n, broadcastLine } from "../lib/stats";
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

/** A quote as masked lines rising, 50ms apart. */
function Quote({ text, big }: { text?: string; big?: boolean }) {
  if (!text?.trim()) {
    return (
      <p className={`${s.quote} ${s.todo}`}>
        <span className="label">yours to supply</span>
        A quote goes here — set it in <code>content/home.json</code>.
      </p>
    );
  }
  // Split on sentences so each mask holds a whole thought.
  const lines = text.split(/(?<=[.?!—])\s+/).filter(Boolean);
  return (
    <blockquote className={big ? s.quoteBig : s.quote}>
      {lines.map((l, i) => (
        <span key={i} className="line-mask" style={{ ["--i" as string]: i }}>
          <span>{l}</span>
        </span>
      ))}
    </blockquote>
  );
}

export default function Home() {
  const m = homeManifest();
  const photos = homePhotos();
  const credits = allCredits(m);
  const flicker = m.loader?.flicker ?? [];
  const stats = siteStats();
  const range = broadcastLine(stats);

  return (
    <>
      <Loader flicker={flicker} total={stats.places} />
      <Reveal />

      {/* ------------------------------------------------ pinned hero */}
      <PinnedHero>
        <div className={s.heroMedia}>
          <Shot
            file={m.hero?.photo} meta={m.hero?.photo ? photos[m.hero.photo] : undefined}
            alt={m.hero?.alt} credit={m.hero?.credit}
            className={s.heroImg} ratio={1.6} sizes="100vw"
          />
        </div>
        <div className={s.heroText}>
          <p className={s.heroMark}>Where he ate</p>
          <Quote text={m.hero?.quote} big />
        </div>
      </PinnedHero>

      {/* ------------------------------------------------ the counter */}
      <section className={`${s.section} ${s.counterSection} reveal`}>
        <p className={s.counter}>{n(stats.places)}</p>
        <p className="label">places{range ? `, ${range}` : ""}</p>
      </section>

      {/* ------------------------------------------- photo + quote */}
      <section className={`${s.section} ${s.pairing} reveal`}>
        <div>
          <Shot
            file={m.pairing?.photo} meta={m.pairing?.photo ? photos[m.pairing.photo] : undefined}
            alt={m.pairing?.alt} credit={m.pairing?.credit}
            className={s.pairImg} ratio={0.8} sizes="(max-width: 860px) 100vw, 40vw"
          />
        </div>
        <div className={s.pairText}>
          <Quote text={m.pairing?.quote} />
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
        <p className={s.inviteLine}>Pick a city.</p>
        <p className={s.inviteLine}>Open a table.</p>
        <p className={s.inviteLine}>Eat with a stranger.</p>
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
