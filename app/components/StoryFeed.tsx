"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../../lib/supabase";
import { loadSearchIndex, type SearchPlace } from "../../lib/artifacts";
import DinnerInterest from "./DinnerInterest";
import s from "./ui.module.css";
import Link from "next/link";

type Row = {
  id: string; place_id: string; body: string; visited_on: string; created_at: string;
};

const STORY_KEY = "wha:story-draft";

function StoryInterest() {
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORY_KEY)) setDone(true);
    } catch { /* ignore */ }
  }, []);

  if (done) {
    return (
      <p className={s.note}>
        Held. After the first dinner, this is where those pieces live.
      </p>
    );
  }

  return (
    <form
      className={s.form}
      onSubmit={(e) => {
        e.preventDefault();
        if (body.trim().length < 40) return;
        try {
          localStorage.setItem(STORY_KEY, JSON.stringify({
            name: name.trim(), body: body.trim(), at: Date.now(),
          }));
        } catch { /* ignore */ }
        setDone(true);
      }}
    >
      <p className={s.h2}>Write one anyway</p>
      <p className={s.note}>
        Not a review. Who you sat with, what got said. Held on this device
        until there&rsquo;s a real table to attach it to.
      </p>
      <label className={s.label} htmlFor="sn">Your name</label>
      <input id="sn" className={s.input} value={name} onChange={(e) => setName(e.target.value)} />
      <label className={s.label} htmlFor="sb">Who you met</label>
      <textarea
        id="sb"
        className={s.textarea}
        value={body}
        onChange={(e) => setBody(e.target.value)}
        maxLength={2000}
        placeholder="A person, a sentence, a table."
      />
      <button className={s.button} type="submit" disabled={body.trim().length < 40}>
        Keep this
      </button>
    </form>
  );
}

export default function StoryFeed() {
  const [rows, setRows] = useState<Row[]>([]);
  const [places, setPlaces] = useState<Record<string, SearchPlace>>({});
  const [ready, setReady] = useState(!supabaseConfigured);

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

  return (
    <div className={`${s.form} ${s.page}`}>
      <h2 className={s.h2}>Stories</h2>
      <p className={s.note}>
        After the meal, whoever went writes a short piece about who they met.
        Not a review — a story.
      </p>

      {!ready && <p className={s.note}>Looking…</p>}
      {ready && rows.length === 0 && (
        <p className={s.note}>
          Nothing published yet. The first London dinner has to happen first.
        </p>
      )}
      {rows.map((r) => {
        const p = places[r.place_id];
        return (
          <article key={r.id} className={s.story}>
            <p className={s.storyMeta}>
              {p?.slug ? <Link href={`/place/${p.slug}/`}>{p.name}</Link> : "a place"}
              {p?.city ? ` · ${p.city}` : ""} · {r.visited_on}
            </p>
            <p className={s.storyBody}>{r.body}</p>
          </article>
        );
      })}

      <StoryInterest />
      <DinnerInterest id="stories-london" />
    </div>
  );
}
