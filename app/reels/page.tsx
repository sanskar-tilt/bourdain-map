import { reelEntries } from "../../lib/reels";
import NativeReels from "../components/NativeReels";

export const metadata = {
  title: "Reels",
  description: "Short films from the table. Played here. Nothing leaves the site.",
};

export default function Reels() {
  const reels = reelEntries();
  return <NativeReels reels={reels} fullPage />;
}
