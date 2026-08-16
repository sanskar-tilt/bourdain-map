"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase, supabaseConfigured, useAuth } from "../../lib/supabase";
import s from "./ui.module.css";

/* Everything you can do at a place: open a table, take a seat, write a
   story, flag something wrong. Client-side against Supabase, sitting on a
   static page. RLS does the gating. */

type Gathering = {
  id: string; starts_at: string; seats: number; blurb: string | null;
  host_id: string; status: string;
};
type Seats = { gathering_id: string; seats: number; seats_taken: number };
type Story = {
  id: string; body: string; visited_on: string; author_id: string; created_at: string;
};

export default function PlaceActions({ placeId, placeName }: { placeId: string; placeName: string }) {
  const { user, ready } = useAuth();
  const [tables, setTables] = useState<Gathering[]>([]);
  const [seats, setSeats] = useState<Record<string, Seats>>({});
  const [mine, setMine] = useState<Set<string>>(new Set());
  const [guests, setGuests] = useState<Record<string, string[]>>({});
  const [stories, setStories] = useState<Story[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [open, setOpen] = useState<"none" | "table" | "story" | "fix">("none");

  const load = useCallback(async () => {
    if (!supabaseConfigured) return;
    const { data: g } = await supabase.from("gatherings")
      .select("id,starts_at,seats,blurb,host_id,status")
      .eq("place_id", placeId).order("starts_at");
    const list = (g ?? []) as Gathering[];
    setTables(list);

    if (list.length) {
      const ids = list.map((t) => t.id);
      const { data: sc } = await supabase.from("gathering_seats")
        .select("gathering_id,seats,seats_taken").in("gathering_id", ids);
      const m: Record<string, Seats> = {};
      (sc ?? []).forEach((r) => { m[(r as Seats).gathering_id] = r as Seats; });
      setSeats(m);

      // Only your own RSVPs are readable — that is the point of the view.
      const { data: r } = await supabase.from("rsvps")
        .select("gathering_id,status").in("gathering_id", ids);
      setMine(new Set((r ?? []).filter((x) => (x as { status: string }).status === "going")
        .map((x) => (x as { gathering_id: string }).gathering_id)));

      // A host can see their own table's guest list.
      const hosted = list.filter((t) => t.host_id === user?.id).map((t) => t.id);
      if (hosted.length) {
        const { data: hr } = await supabase.from("rsvps")
          .select("gathering_id,user_id").in("gathering_id", hosted);
        const byT: Record<string, string[]> = {};
        (hr ?? []).forEach((x) => {
          const row = x as { gathering_id: string; user_id: string };
          (byT[row.gathering_id] ??= []).push(row.user_id);
        });
        setGuests(byT);
        const uids = [...new Set(Object.values(byT).flat())];
        if (uids.length) {
          const { data: p } = await supabase.from("profiles")
            .select("id,display_name").in("id", uids);
          const nm: Record<string, string> = {};
          (p ?? []).forEach((x) => {
            const row = x as { id: string; display_name: string };
            nm[row.id] = row.display_name;
          });
          setNames(nm);
        }
      }
    }

    const { data: st } = await supabase.from("stories")
      .select("id,body,visited_on,author_id,created_at")
      .eq("place_id", placeId).order("visited_on", { ascending: false });
    setStories((st ?? []) as Story[]);
  }, [placeId, user?.id]);

  useEffect(() => { void load(); }, [load]);

  if (!supabaseConfigured) return null;

  const fmt = (d: string) =>
    new Date(d).toLocaleString(undefined, {
      weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
    });

  return (
    <>
      {/* ------------------------------------------------------- tables */}
      <section className={s.section}>
        <h2 className={s.h2}>Tables</h2>

        {tables.length === 0 && (
          <p className={s.note}>
            Nobody has opened a table here. Somebody has to be first.
          </p>
        )}

        {tables.map((t) => {
          const sc = seats[t.id];
          const taken = sc?.seats_taken ?? 0;
          const free = Math.max(0, t.seats - taken);
          const going = mine.has(t.id);
          const isHost = t.host_id === user?.id;
          return (
            <div key={t.id} className={s.table}>
              <div className={s.tableTop}>
                <span className={s.tableWhen}>{fmt(t.starts_at)}</span>
                <span>{t.status}</span>
              </div>
              {t.blurb && <p className={s.blurb}>{t.blurb}</p>}
              <div className={s.chairs}>
                {Array.from({ length: t.seats }).map((_, i) => (
                  <span key={i} className={s.chair}
                    data-taken={i < taken} data-free={i >= taken} />
                ))}
              </div>
              <p className={s.seatLine}>
                {free === 0 ? "Full." : `${free} seat${free === 1 ? "" : "s"} still empty.`}
              </p>
              {isHost && (guests[t.id]?.length ?? 0) > 0 && (
                <div className={s.who}>
                  {guests[t.id].map((uid) => (
                    <span key={uid} className={s.whoChip}>{names[uid] ?? "someone"}</span>
                  ))}
                </div>
              )}
              {user ? (
                <button
                  className={going ? s.ghost : s.button}
                  disabled={!going && free === 0}
                  onClick={async () => {
                    setErr(null);
                    if (going) {
                      const { error } = await supabase.from("rsvps").delete()
                        .eq("gathering_id", t.id).eq("user_id", user.id);
                      if (error) return setErr(error.message);
                    } else {
                      const { error } = await supabase.from("rsvps")
                        .insert({ gathering_id: t.id, user_id: user.id });
                      if (error) return setErr(error.message);
                    }
                    void load();
                  }}
                >
                  {going ? "Give up my seat" : free === 0 ? "Full" : "Take a seat"}
                </button>
              ) : (
                <p className={s.note}><a href="/account/">Sign in</a> to take a seat.</p>
              )}
            </div>
          );
        })}

        {user && open !== "table" && (
          <button className={s.ghost} onClick={() => setOpen("table")}>Open a table here</button>
        )}
        {user && open === "table" && (
          <TableForm placeId={placeId} onDone={() => { setOpen("none"); void load(); }} />
        )}
        {!user && ready && (
          <p className={s.note}><a href="/account/">Sign in</a> to open one.</p>
        )}
      </section>

      {/* ------------------------------------------------------ stories */}
      <section className={s.section}>
        <h2 className={s.h2}>Stories</h2>
        {stories.length === 0 && (
          <p className={s.note}>
            Nobody has written about eating here yet. Not a review — who you met.
          </p>
        )}
        {stories.map((st) => (
          <article key={st.id} className={s.story}>
            <p className={s.storyMeta}>{st.visited_on}</p>
            <p className={s.storyBody}>{st.body}</p>
          </article>
        ))}
        {user && open !== "story" && (
          <button className={s.ghost} onClick={() => setOpen("story")}>Write one</button>
        )}
        {user && open === "story" && (
          <StoryForm placeId={placeId} onDone={() => { setOpen("none"); void load(); }} />
        )}
      </section>

      {/* -------------------------------------------------- corrections */}
      <section className={s.section}>
        <h2 className={s.h2}>Something wrong?</h2>
        {open === "fix" ? (
          <CorrectionForm placeId={placeId} onDone={() => setOpen("none")} />
        ) : user ? (
          <button className={s.linkButton} onClick={() => setOpen("fix")}>
            Tell us about {placeName}
          </button>
        ) : (
          <p className={s.note}>
            <a href="/account/">Sign in</a> to flag a closed place or a wrong pin.
          </p>
        )}
      </section>

      {err && <p className={s.err}>{err}</p>}
    </>
  );
}

/* ---------------------------------------------------------------- forms */

function TableForm({ placeId, onDone }: { placeId: string; onDone: () => void }) {
  const { user } = useAuth();
  const [when, setWhen] = useState("");
  const [seats, setSeats] = useState(4);
  const [blurb, setBlurb] = useState("");
  const [err, setErr] = useState<string | null>(null);
  return (
    <form className={s.form} onSubmit={async (e) => {
      e.preventDefault();
      setErr(null);
      if (!user) return;
      const { error } = await supabase.from("gatherings").insert({
        place_id: placeId, host_id: user.id,
        starts_at: new Date(when).toISOString(), seats, blurb: blurb.trim() || null,
      });
      if (error) return setErr(error.message);
      onDone();
    }}>
      <div className={s.row}>
        <div>
          <label className={s.label} htmlFor="when">When</label>
          <input id="when" className={s.input} type="datetime-local" required
            value={when} onChange={(e) => setWhen(e.target.value)} />
        </div>
        <div className={s.rowNarrow}>
          <label className={s.label} htmlFor="seats">Seats</label>
          <input id="seats" className={s.input} type="number" min={2} max={20} required
            value={seats} onChange={(e) => setSeats(Number(e.target.value))} />
        </div>
      </div>
      <label className={s.label} htmlFor="blurb">Anything to say</label>
      <input id="blurb" className={s.input} value={blurb} maxLength={140}
        onChange={(e) => setBlurb(e.target.value)} placeholder="showing up hungry, no plan" />
      <div className={s.row}>
        <button className={s.button} type="submit">Open the table</button>
        <button className={s.ghost} type="button" onClick={onDone}>Cancel</button>
      </div>
      {err && <p className={s.err}>{err}</p>}
    </form>
  );
}

function StoryForm({ placeId, onDone }: { placeId: string; onDone: () => void }) {
  const { user } = useAuth();
  const [body, setBody] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [err, setErr] = useState<string | null>(null);
  const short = body.trim().length < 100;
  return (
    <form className={s.form} onSubmit={async (e) => {
      e.preventDefault();
      setErr(null);
      if (!user) return;
      const { data, error } = await supabase.from("stories").insert({
        place_id: placeId, author_id: user.id, visited_on: date, body: body.trim(),
      }).select("id").single();
      if (error) return setErr(error.message);
      // The author publishes their own story; there is no queue.
      const { error: e2 } = await supabase.from("stories")
        .update({ published: true }).eq("id", (data as { id: string }).id);
      if (e2) return setErr(e2.message);
      onDone();
    }}>
      <label className={s.label} htmlFor="visited">When you went</label>
      <input id="visited" className={s.input} type="date" required
        value={date} onChange={(e) => setDate(e.target.value)} />
      <label className={s.label} htmlFor="body">Who you met</label>
      <textarea id="body" className={s.textarea} value={body} maxLength={2000}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Not a review. Who was there, what got said." />
      <p className={s.count}>
        {body.trim().length}/100 minimum{short ? "" : " · good"}
      </p>
      <div className={s.row}>
        <button className={s.button} type="submit" disabled={short}>Post it</button>
        <button className={s.ghost} type="button" onClick={onDone}>Cancel</button>
      </div>
      {err && <p className={s.err}>{err}</p>}
    </form>
  );
}

function CorrectionForm({ placeId, onDone }: { placeId: string; onDone: () => void }) {
  const { user } = useAuth();
  const [kind, setKind] = useState("closed");
  const [body, setBody] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  if (done) {
    return (
      <p className={s.note}>
        Thanks — that goes straight to whoever maintains this. Nothing else happens
        automatically, a person reads it.
      </p>
    );
  }
  return (
    <form className={s.form} onSubmit={async (e) => {
      e.preventDefault();
      setErr(null);
      const { error } = await supabase.from("corrections").insert({
        place_id: placeId, submitter_id: user?.id ?? null, kind, body: body.trim(),
      });
      if (error) return setErr(error.message);
      setDone(true);
    }}>
      <label className={s.label} htmlFor="kind">What&rsquo;s wrong</label>
      <select id="kind" className={s.select} value={kind} onChange={(e) => setKind(e.target.value)}>
        <option value="closed">It&rsquo;s closed</option>
        <option value="wrong_coords">The pin is in the wrong place</option>
        <option value="missing_info">Something here is wrong or missing</option>
        <option value="episode">Wrong show or episode</option>
      </select>
      <label className={s.label} htmlFor="fixbody">Tell us</label>
      <textarea id="fixbody" className={s.textarea} required value={body} maxLength={1000}
        onChange={(e) => setBody(e.target.value)} placeholder="What you know." />
      <div className={s.row}>
        <button className={s.button} type="submit">Send it</button>
        <button className={s.ghost} type="button" onClick={onDone}>Cancel</button>
      </div>
      {err && <p className={s.err}>{err}</p>}
    </form>
  );
}
