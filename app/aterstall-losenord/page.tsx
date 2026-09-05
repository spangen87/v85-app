"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Status = "verifying" | "ready" | "invalid" | "done";

const LINK_ERROR =
  "Länken är ogiltig eller har gått ut. Begär en ny återställningslänk och öppna den i samma webbläsare som du beställde den från.";

export default function ResetPasswordPage() {
  const [status, setStatus] = useState<Status>("verifying");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  // Återställningslänken kan komma i tre former beroende på Supabase-konfiguration:
  // ?code= (PKCE), ?token_hash=&type=recovery (mallade länkar) eller #access_token
  // (implicit flow, som supabase-js själv plockar upp via detectSessionInUrl).
  useEffect(() => {
    let cancelled = false;

    async function verify() {
      const url = new URL(window.location.href);
      const hashParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      const linkError =
        url.searchParams.get("error_description") ?? hashParams.get("error_description");

      if (linkError) {
        if (!cancelled) setStatus("invalid");
        return;
      }

      // getSession() väntar in supabase-js egen hantering av URL:en.
      const { data } = await supabase.auth.getSession();
      let ok = data.session != null;

      if (!ok) {
        const code = url.searchParams.get("code");
        const tokenHash = url.searchParams.get("token_hash");

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          ok = !error;
        } else if (tokenHash) {
          const { error } = await supabase.auth.verifyOtp({
            type: "recovery",
            token_hash: tokenHash,
          });
          ok = !error;
        }
      }

      if (cancelled) return;

      if (ok) {
        // Ta bort token ur adressfältet så den inte ligger kvar i historiken.
        window.history.replaceState({}, "", "/aterstall-losenord");
        setStatus("ready");
      } else {
        setStatus("invalid");
      }
    }

    verify();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Lösenorden matchar inte.");
      return;
    }
    if (password.length < 8) {
      setError("Lösenordet måste vara minst 8 tecken.");
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setStatus("done");
    setLoading(false);
    router.refresh();
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
          <span className="tn-eyebrow">TRAVAPPEN · NYTT LÖSENORD</span>
        </div>

        <div className="flex-1 flex flex-col justify-center py-12">
          <h1
            className="tn-serif"
            style={{ fontSize: 42, lineHeight: 1.05, letterSpacing: "-0.02em", color: "var(--tn-text)" }}
          >
            Välj ett<br />
            <em style={{ color: "var(--tn-accent)" }}>nytt</em> lösenord.
          </h1>
          <p
            className="mt-4 text-sm leading-relaxed"
            style={{ color: "var(--tn-text-dim)", maxWidth: "88%" }}
          >
            {status === "verifying" && "Kontrollerar din återställningslänk…"}
            {status === "ready" && "Minst 8 tecken. Du loggas in direkt när lösenordet är sparat."}
            {status === "invalid" && LINK_ERROR}
            {status === "done" && "Klart! Ditt lösenord är uppdaterat."}
          </p>
        </div>

        <div className="pb-10 space-y-3">
          {status === "ready" && (
            <form onSubmit={handleSubmit} className="space-y-3">
              <input
                type="password"
                placeholder="Nytt lösenord"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-colors"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = "var(--tn-accent)")}
                onBlur={(e) => (e.currentTarget.style.borderColor = "var(--tn-border)")}
              />
              <input
                type="password"
                placeholder="Upprepa lösenordet"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
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
                {loading ? "Sparar…" : "Spara nytt lösenord"}
              </button>
            </form>
          )}

          {status === "done" && (
            <Link
              href="/"
              className="block w-full py-3.5 rounded-xl text-sm font-semibold text-center"
              style={{ background: "var(--tn-accent)", color: "#fff" }}
            >
              Till appen
            </Link>
          )}

          {status === "invalid" && (
            <Link
              href="/glomt-losenord"
              className="block w-full py-3.5 rounded-xl text-sm font-semibold text-center"
              style={{ background: "var(--tn-accent)", color: "#fff" }}
            >
              Begär en ny länk
            </Link>
          )}

          {status !== "done" && (
            <div className="text-center pt-1">
              <Link
                href="/login"
                className="text-sm underline underline-offset-4"
                style={{ color: "var(--tn-text-faint)" }}
              >
                Tillbaka till inloggningen
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
