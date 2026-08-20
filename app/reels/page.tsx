import { reelEntries } from "../../lib/reels";
import Reveal from "../components/Reveal";
import ReelEmbed from "./ReelEmbed";
import styles from "./reels.module.css";

export const metadata = {
  title: "Reels",
  description:
    "Clips of Anthony Bourdain, played through Instagram and TikTok's own " +
    "embeds. This site hosts nothing.",
};

export default function Reels() {
  const reels = reelEntries();

  return (
    <article className={styles.page}>
      <Reveal />
      <header className={styles.head}>
        <h1 className={styles.h1}>Reels</h1>
        {/* One expression, one text node — the build asserts on this HTML. */}
        <p className="label">
          {`${reels.length} ${reels.length === 1 ? "reel" : "reels"}`}
        </p>
      </header>

      {reels.length === 0 ? (
        <div className={styles.emptyGap}>
          <span>reels go in content/reels.json</span>
        </div>
      ) : (
        <div className={styles.feed}>
          {reels.map((reel) => (
            <ReelEmbed key={reel.url} reel={reel} />
          ))}
        </div>
      )}

    </article>
  );
}
