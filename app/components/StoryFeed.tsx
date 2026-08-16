"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../../lib/supabase";
import { loadSearchIndex, type SearchPlace } from "../../lib/artifacts";
import s from "./ui.module.css";

type Row = {
  id: string; place_id: string; body: string; visited_on: string; created_at: string;
};

export default function StoryFeed() {
  const [rows, setRows] = useState<Row[]>([]);
  const [places, setPlaces] = useState<Record<string, SearchPlace>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      if (!supabaseConfigured) { setReady(true); return; }
      const { data } = await supabase.from("stories")
        .select("id,place_id,body,visited_on,created_at")
        .eq("published", true)
        .order("created_at", { ascending: false }).limit(100);
      setRows((data ?? []) as Row[]);
      const idx = await loadSearchIndex().catch(() => null);
      if (idx) {
        const byId: Record<string, SearchPlace> = {};
        idx.places.forEach((p) => { byId[p.id] = p; });
        setPlaces(byId);
      }
      setReady(true);
    })();
  }, []);

  if (!supabaseConfigured) {
    return <p className={s.note}>Stories aren&rsquo;t configured on this build.</p>;
  }

  return (
    <div className={s.form}>
      <h2 className={s.h2}>Stories</h2>
      {!ready && <p className={s.note}>…</p>}
      {ready && rows.length === 0 && (
        <p className={s.note}>
          Nothing here yet. After the first dinner there will be. Not reviews —
          who people met.
        </p>
      )}
      {rows.map((r) => {
        const p = places[r.place_id];
        return (
          <article key={r.id} className={s.story}>
            <p className={s.storyMeta}>
              {p?.slug ? <a href={`/place/${p.slug}/`}>{p.name}</a> : "a place"}
              {p?.city ? ` · ${p.city}` : ""} · {r.visited_on}
            </p>
            <p className={s.storyBody}>{r.body}</p>
          </article>
        );
      })}
    </div>
  );
}
