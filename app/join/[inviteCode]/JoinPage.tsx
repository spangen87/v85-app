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
      // E-postbekräftelse ej aktiverad — direkt inloggad
      const nameParam = displayName.trim()
        ? `?setupName=${encodeURIComponent(displayName.trim())}`
        : "";
      router.push(`/join/${inviteCode}${nameParam}`);
      router.refresh();
    } else {
      // E-postbekräftelse krävs
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
      <div className="w-full max-w-sm bg-gray-50 dark:bg-gray-900 rounded-xl p-8 shadow-xl">
        {/* Inbjudnings-header */}
        <div className="text-center mb-6">
          <p className="text-3xl mb-2">🏇</p>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Du är inbjuden till
          </h1>
          <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-lg mt-1">
            {group.name}
          </p>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            {tab === "register"
              ? "Skapa ett konto för att gå med."
              : "Logga in för att gå med."}
          </p>
        </div>

        {/* Flik-switcher */}
        <div className="flex rounded-lg overflow-hidden border border-gray-300 dark:border-gray-700 mb-5">
          <button
            onClick={() => { setTab("register"); setError(null); setInfo(null); }}
            className={`flex-1 py-2 text-sm font-medium transition ${
              tab === "register"
                ? "bg-indigo-600 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            Registrera
          </button>
          <button
            onClick={() => { setTab("login"); setError(null); setInfo(null); }}
            className={`flex-1 py-2 text-sm font-medium transition ${
              tab === "login"
                ? "bg-indigo-600 text-white"
                : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800"
            }`}
          >
            Logga in
          </button>
        </div>

        {/* Formulär */}
        {tab === "register" ? (
          <form onSubmit={handleRegister} className="space-y-3">
            <input
              type="email"
              placeholder="E-post"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="text"
              placeholder="Visningsnamn (valfritt)"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="password"
              placeholder="Lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none focus:border-indigo-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {info && <p className="text-blue-400 text-sm">{info}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 transition"
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
              className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="password"
              placeholder="Lösenord"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-white border border-gray-300 dark:border-gray-700 focus:outline-none focus:border-indigo-500"
            />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 transition"
            >
              {loading ? "Loggar in…" : "Logga in och gå med"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
