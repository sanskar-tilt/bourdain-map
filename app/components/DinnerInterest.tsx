"use client";

import { useEffect, useState } from "react";
import { supabase, supabaseConfigured } from "../../lib/supabase";
import {
  onInterest,
  validEmail,
  writeInterest,
  type Interest,
} from "../../lib/londonInterest";
import s from "./ui.module.css";

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
  const [saved, setSaved] = useState<Interest | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => onInterest(setSaved), []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    const payload: Interest = {
      name: name.trim(),
      email: email.trim(),
      note: note.trim(),
      at: Date.now(),
    };
    if (!payload.name || !validEmail(payload.email)) {
      setErr("A name and a real email — that's all.");
      return;
    }
    setBusy(true);
    try {
      try { writeInterest(payload); } catch { /* private mode */ }
      if (supabaseConfigured) {
        const { error } = await supabase.from("dinner_interest").insert({
          name: payload.name,
          email: payload.email,
          note: payload.note || null,
          city: "London",
        });
        if (error) {
          console.warn("[dinner] supabase insert skipped", error.message);
        }
      }
      setSaved(payload);
    } catch {
      setErr("That didn't go through. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (saved) {
    return (
      <div className={s.form} id={id} data-done="true" aria-live="polite">
        <p className={s.h2}>You&rsquo;re on the list</p>
        <p className={s.note}>
          {saved.name}, we&rsquo;ll write when the first London table of{" "}
          {seats} is set. Come alone if you want. That&rsquo;s the point.
        </p>
      </div>
    );
  }

  return (
    <form className={s.form} id={id} onSubmit={onSubmit} noValidate>
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
      {err && <p className={s.err} role="alert">{err}</p>}
    </form>
  );
}
