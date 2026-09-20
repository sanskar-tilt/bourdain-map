"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../../lib/supabase";
import { loadSearchIndex, type SearchPlace } from "../../lib/artifacts";
import DinnerInterest from "./DinnerInterest";
import s from "./ui.module.css";
import Link from "next/link";

type Row = {
  id: string; place_id: string; starts_at: string; seats: number;
  blurb: string | null; status: string;
};

export default function UpcomingTables() {
  const [rows, setRows] = useState<Row[]>([]);
  const [seats, setSeats] = useState<Record<string, { seats: number; seats_taken: number }>>({});
  const [places, setPlaces] = useState<Record<string, SearchPlace>>({});
  const [ready, setReady] = useState(!supabaseConfigured);

  useEffect(() => {
    (async () => {
      if (!supabaseConfigured) { setReady(true); return; }
      const { data } = await supabase.from("gatherings")
        .select("id,place_id,starts_at,seats,blurb,status")
        .gte("starts_at", new Date().toISOString())
        .eq("status", "open").order("starts_at").limit(200);
      const list = (data ?? []) as Row[];
      setRows(list);
      if (list.length) {
        const { data: sc } = await supabase.from("gathering_seats")
          .select("gathering_id,seats,seats_taken")
          .in("gathering_id", list.map((r) => r.id));
        const m: Record<string, { seats: number; seats_taken: number }> = {};
        (sc ?? []).forEach((r) => {
          const row = r as { gathering_id: string; seats: number; seats_taken: number };
          m[row.gathering_id] = row;
        });
        setSeats(m);
      }
      const idx = await loadSearchIndex().catch(() => null);
      if (idx) {
        const byId: Record<string, SearchPlace> = {};
        idx.places.forEach((p) => { byId[p.id] = p; });
        setPlaces(byId);
      }
      setReady(true);
    })();
  }, []);

  const emptySeats = rows.reduce((n, r) => {
    const sc = seats[r.id];
    return n + Math.max(0, (sc?.seats ?? r.seats) - (sc?.seats_taken ?? 0));
  }, 0);

  return (
    <div className={`${s.form} ${s.page}`}>
      <h2 className={s.h2}>Tables</h2>
      <p className={s.note}>
        Someone picks a place, opens seats, strangers take them. The first
        one is in London.
      </p>

      <DinnerInterest seats={8} />

      <section className={s.section}>
        <h2 className={s.h2}>Open now</h2>
        {!ready && <p className={s.note}>Looking…</p>}
        {ready && rows.length === 0 && (
          <p className={s.note}>
            None open yet. The London list above is how you get to the first
            one. Or find a pin on the{" "}
            <Link href="/map/">map</Link> and be the person who opens a table.
          </p>
        )}
        {ready && rows.length > 0 && (
          <p className={s.note}>
            {emptySeats} seat{emptySeats === 1 ? "" : "s"} waiting, across{" "}
            {rows.length} table{rows.length === 1 ? "" : "s"}.
          </p>
        )}
        {rows.map((r) => {
          const p = places[r.place_id];
          const sc = seats[r.id];
          const total = sc?.seats ?? r.seats;
          const taken = sc?.seats_taken ?? 0;
          const free = Math.max(0, total - taken);
          return (
            <div key={r.id} className={s.table}>
              <div className={s.tableTop}>
                <span className={s.tableWhen}>
                  {new Date(r.starts_at).toLocaleString(undefined, {
                    weekday: "short", day: "numeric", month: "short",
                    hour: "2-digit", minute: "2-digit",
                  })}
                </span>
                <span>{p?.city ?? ""}</span>
              </div>
              {p?.slug ? (
                <Link className={s.tableWhen} href={`/place/${p.slug}/`}>{p.name}</Link>
              ) : (
                <span className={s.tableWhen}>a place on the map</span>
              )}
              {r.blurb && <p className={s.blurb}>{r.blurb}</p>}
              <div className={s.chairs}>
                {Array.from({ length: total }).map((_, i) => (
                  <span key={i} className={s.chair} data-taken={i < taken} data-free={i >= taken} />
                ))}
              </div>
              <p className={s.seatLine}>
                {free === 0 ? "Full." : `${free} seat${free === 1 ? "" : "s"} still empty.`}
              </p>
            </div>
          );
        })}
      </section>
    </div>
  );
}
