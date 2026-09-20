"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../../lib/supabase";
import s from "./ui.module.css";

const KEY = "wha:london-interest";

type Saved = { name: string; email: string; note: string; at: number };

export default function DinnerInterest({
  id = "london",
  seats = 8,
}: {
  id?: string;
  seats?: number;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [note, setNote] = useState("");
  const [done, setDone] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Saved;
      if (saved?.email) setDone(true);
    } catch { /* ignore */ }
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const payload: Saved = {
      name: name.trim(),
      email: email.trim(),
      note: note.trim(),
      at: Date.now(),
    };
    if (!payload.email || !payload.name) {
      setErr("A name and an email — that's all.");
      return;
    }
    setBusy(true);
    try {
      localStorage.setItem(KEY, JSON.stringify(payload));
      if (supabaseConfigured) {
        const { error } = await supabase.from("dinner_interest").insert({
          name: payload.name,
          email: payload.email,
          note: payload.note || null,
          city: "London",
        });
        if (error) {
          // Table may not exist on this build. Local save still stands.
          console.warn("[dinner] supabase insert skipped", error.message);
        }
      }
      setDone(true);
    } catch {
      setErr("That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className={s.form} id={id}>
        <p className={s.h2}>You&rsquo;re on the list</p>
        <p className={s.note}>
          We&rsquo;ll write when the first London table of {seats} is set.
          Come alone if you want. That&rsquo;s the point.
        </p>
      </div>
    );
  }

  return (
    <form className={s.form} id={id} onSubmit={onSubmit}>
      <p className={s.h2}>Hear about the first London dinner</p>
      <p className={s.note}>
        {seats} seats. No date yet. Leave a name and an email — we&rsquo;ll
        write when there&rsquo;s a table.
      </p>
      <label className={s.label} htmlFor={`${id}-name`}>Name</label>
      <input
        id={`${id}-name`}
        className={s.input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoComplete="name"
        required
      />
      <label className={s.label} htmlFor={`${id}-email`}>Email</label>
      <input
        id={`${id}-email`}
        className={s.input}
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        autoComplete="email"
        required
      />
      <label className={s.label} htmlFor={`${id}-note`}>Anything to say</label>
      <input
        id={`${id}-note`}
        className={s.input}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        maxLength={160}
        placeholder="showing up hungry, no plan"
      />
      <button className={s.button} type="submit" disabled={busy}>
        {busy ? "Holding your seat…" : "Put me on the list"}
      </button>
      {err && <p className={s.err}>{err}</p>}
    </form>
  );
}
