"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import type { Group } from "@/lib/types";

interface Props {
  group: Group;
  inviteCode: string;
}

type Tab = "register" | "login";

export function JoinPage({ group, inviteCode }: Props) {
  const [tab, setTab] = useState<Tab>("register");
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setInfo(null);

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    if (data.session) {
      const nameParam = displayName.trim()
        ? `?setupName=${encodeURIComponent(displayName.trim())}`
        : "";
      router.push(`/join/${inviteCode}${nameParam}`);
      router.refresh();
    } else {
      setInfo(
        "Vi har skickat ett bekräftelsemejl till " +
          email +
          ". Klicka på länken i mejlet och kom sedan tillbaka hit."
      );
      setLoading(false);
    }
  }

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    router.push(`/join/${inviteCode}`);
    router.refresh();
  }

  const inputStyle = {
    width: "100%",
    padding: "0.5rem 1rem",
    borderRadius: "0.5rem",
    background: "var(--tn-bg-chip)",
    border: "1px solid var(--tn-border)",
    color: "var(--tn-text)",
    fontSize: "0.875rem",
    outline: "none",
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--tn-bg)" }}>
      <div
        className="w-full max-w-sm rounded-xl p-8"
        style={{ background: "var(--tn-bg-card)", border: "1px solid var(--tn-border)" }}
      >
        <div className="text-center mb-6">
          <h1 className="text-xl font-bold" style={{ color: "var(--tn-text)" }}>
            Du är inbjuden till
          </h1>
          <p className="font-semibold text-lg mt-1" style={{ color: "var(--tn-accent)" }}>
            {group.name}
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--tn-text-faint)" }}>
            {tab === "register"
              ? "Skapa ett konto för att gå med."
              : "Logga in för att gå med."}
          </p>
        </div>

        <div
          className="flex rounded-lg overflow-hidden mb-5"
          style={{ border: "1px solid var(--tn-border)" }}
        >
          <button
            onClick={() => { setTab("register"); setError(null); setInfo(null); }}
            className="flex-1 py-2 text-sm font-medium transition"
            style={
              tab === "register"
                ? { background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }
                : { background: "none", color: "var(--tn-text-faint)", border: "none", cursor: "pointer" }
            }
          >
            Registrera
          </button>
          <button
            onClick={() => { setTab("login"); setError(null); setInfo(null); }}
            className="flex-1 py-2 text-sm font-medium transition"
            style={
              tab === "login"
                ? { background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }
                : { background: "none", color: "var(--tn-text-faint)", border: "none", cursor: "pointer" }
            }
          >
            Logga in
          </button>
        </div>

        {tab === "register" ? (
          <form onSubmit={handleRegister} className="space-y-3">
            <input
              type="email"
              placeholder="E-post"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="text"
              placeholder="Visningsnamn (valfritt)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              style={inputStyle}
            />
            {error && <p className="text-sm" style={{ color: "var(--tn-value-low)" }}>{error}</p>}
            {info && <p className="text-sm" style={{ color: "var(--tn-accent)" }}>{info}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg font-semibold disabled:opacity-50 transition"
              style={{ background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }}
            >
              {loading ? "Skapar konto…" : "Skapa konto och gå med"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              type="email"
              placeholder="E-post"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
            <input
              type="password"
              placeholder="Lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={inputStyle}
            />
            {error && <p className="text-sm" style={{ color: "var(--tn-value-low)" }}>{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg font-semibold disabled:opacity-50 transition"
              style={{ background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }}
            >
              {loading ? "Loggar in…" : "Logga in och gå med"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
