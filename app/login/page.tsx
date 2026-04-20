"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--tn-bg)", color: "var(--tn-text)" }}
    >
      <div className="flex flex-col flex-1 px-7 py-10 max-w-sm mx-auto w-full">
        {/* Brand */}
        <div className="flex items-center gap-2 mt-6">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ background: "var(--tn-accent)" }}
          />
          <span className="tn-eyebrow">TRAVAPPEN · V75 V85 V64 V86 GS75</span>
        </div>

        {/* Hero */}
        <div className="flex-1 flex flex-col justify-center py-12">
          <h1
            className="tn-serif"
            style={{ fontSize: 52, lineHeight: 1, letterSpacing: "-0.02em", color: "var(--tn-text)" }}
          >
            Analys.<br />
            <em style={{ color: "var(--tn-accent)" }}>Inte</em> tips.
          </h1>
          <p
            className="mt-4 text-sm leading-relaxed"
            style={{ color: "var(--tn-text-dim)", maxWidth: "88%" }}
          >
            Matematisk vinstchans vs streckning. Delade noter med ditt spelgäng. Ett verktyg, alla svenska travspel.
          </p>
        </div>

        {/* Form */}
        <div className="pb-10 space-y-3">
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="du@exempel.se"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: "var(--tn-bg-chip)",
                border: "1px solid var(--tn-border)",
                color: "var(--tn-text)",
                fontFamily: "var(--font-geist-sans)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tn-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tn-border)")}
            />
            <input
              type="password"
              placeholder="Lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
              style={{
                background: "var(--tn-bg-chip)",
                border: "1px solid var(--tn-border)",
                color: "var(--tn-text)",
                fontFamily: "var(--font-geist-sans)",
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tn-accent)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tn-border)")}
            />
            {error && (
              <p
                className="text-sm rounded-lg px-3 py-2"
                style={{ color: "var(--tn-value-low)", background: "var(--tn-value-low-bg)" }}
              >
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{
                background: "var(--tn-accent)",
                color: "#fff",
                marginTop: 4,
              }}
            >
              {loading ? "Loggar in..." : "Logga in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
