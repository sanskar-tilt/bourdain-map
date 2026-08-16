"use client";

import { createClient, type Session } from "@supabase/supabase-js";
import { useEffect, useState } from "react";

/* The write path. The read path is static artifacts and never touches this.
   Static export, so everything here runs in the browser with the anon key
   and RLS doing the gating. */

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

export const supabaseConfigured = Boolean(url && key);

export const supabase = createClient(
  url || "http://localhost:54321",
  key || "public-anon-key",
  { auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true } }
);

export type Profile = { id: string; display_name: string; bio: string | null; city: string | null };

/** Session + the caller's profile row, refreshed on auth changes. */
export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured) { setReady(true); return; }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) { setProfile(null); return; }
    supabase.from("profiles").select("id,display_name,bio,city").eq("id", session.user.id)
      .maybeSingle().then(({ data }) => setProfile(data as Profile | null));
  }, [session?.user?.id]);

  return { session, user: session?.user ?? null, profile, ready, setProfile };
}

export async function signIn(email: string) {
  return supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
  });
}

export const signOut = () => supabase.auth.signOut();
