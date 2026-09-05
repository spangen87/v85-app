"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/aterstall-losenord`,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--tn-bg-chip)",
    border: "1px solid var(--tn-border)",
    color: "var(--tn-text)",
    fontFamily: "var(--font-geist-sans)",
  };

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: "var(--tn-bg)", color: "var(--tn-text)" }}
    >
      <div className="flex flex-col flex-1 px-7 py-10 max-w-sm mx-auto w-full">
        <div className="flex items-center gap-2 mt-6">
          <span
            className="inline-block w-2.5 h-2.5 rounded-full"
            style={{ background: "var(--tn-accent)" }}
          />
          <span className="tn-eyebrow">TRAVAPPEN · GLÖMT LÖSENORD</span>
        </div>

        <div className="flex-1 flex flex-col justify-center py-12">
          <h1
            className="tn-serif"
            style={{ fontSize: 42, lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--tn-text)" }}
          >
            Glömt<br />
            <em style={{ color: "var(--tn-accent)" }}>lösenordet</em>?
          </h1>
          <p
            className="mt-4 text-sm leading-relaxed"
            style={{ color: "var(--tn-text-dim)", maxWidth: "88%" }}
          >
            Ange e-postadressen du registrerade dig med, så skickar vi en länk
            där du kan välja ett nytt lösenord.
          </p>
        </div>

        <div className="pb-10 space-y-3">
          {sent ? (
            <div
              className="text-sm rounded-xl px-4 py-3 leading-relaxed"
              style={{ background: "var(--tn-accent-faint)", color: "var(--tn-text)" }}
            >
              Om <strong>{email.trim()}</strong> finns som konto har vi skickat ett
              mejl med en återställningslänk. Länken gäller i en timme — titta
              även i skräpposten.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="email"
                placeholder="du@exempel.se"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={inputStyle}
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
                style={{ background: "var(--tn-accent)", color: "#fff", marginTop: 4 }}
              >
                {loading ? "Skickar…" : "Skicka återställningslänk"}
              </button>
            </form>
          )}

          <div className="text-center pt-1">
            <Link
              href="/login"
              className="text-sm underline underline-offset-4"
              style={{ color: "var(--tn-text-faint)" }}
            >
              Tillbaka till inloggningen
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
