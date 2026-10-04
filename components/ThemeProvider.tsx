"use client";

import { createContext, useCallback, useContext, useEffect, useSyncExternalStore } from "react";
import { effectiveTheme, parseStoredTheme, THEME_STORAGE_KEY, type ThemeChoice } from "@/lib/theme";

/** "system" = följer enhetens inställning; annars användarens eget val. */
export type ThemeSetting = ThemeChoice | "system";

const ThemeContext = createContext<{
  theme: ThemeChoice;
  choice: ThemeSetting;
  toggle: () => void;
  setChoice: (c: ThemeSetting) => void;
}>({ theme: "light", choice: "system", toggle: () => {}, setChoice: () => {} });

export function useTheme() {
  return useContext(ThemeContext);
}

function readStored(): ThemeChoice | null {
  try {
    return parseStoredTheme(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return null;
  }
}

function writeStored(choice: ThemeSetting) {
  try {
    if (choice === "system") localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    // privat läge: valet gäller bara den här sidvisningen
  }
}

// data-theme sätts även när appen följer systemet: Tailwinds dark:-variant
// (äldre sidor) läser attributet, inte prefers-color-scheme.
function applyTheme(theme: ThemeChoice) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme === "dark");
  root.classList.toggle("light", theme === "light");
}

// Eget val (localStorage) och enhetens läge läses som en extern källa
const listeners = new Set<() => void>();
const DARK_QUERY = "(prefers-color-scheme: dark)";

function subscribe(cb: () => void) {
  const media = window.matchMedia(DARK_QUERY);
  media.addEventListener("change", cb);
  window.addEventListener("storage", cb);
  listeners.add(cb);
  return () => {
    media.removeEventListener("change", cb);
    window.removeEventListener("storage", cb);
    listeners.delete(cb);
  };
}

function snapshot(): string {
  return `${readStored() ?? "system"}:${window.matchMedia(DARK_QUERY).matches ? "dark" : "light"}`;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const snap = useSyncExternalStore(subscribe, snapshot, () => "system:light");
  const [stored, device] = snap.split(":") as [ThemeSetting, ThemeChoice];
  const choice = stored;
  const theme = effectiveTheme(stored === "system" ? null : stored, device === "dark");

  useEffect(() => { applyTheme(theme); }, [theme]);

  const setChoice = useCallback((c: ThemeSetting) => {
    writeStored(c);
    listeners.forEach((f) => f());
  }, []);

  const toggle = useCallback(() => setChoice(theme === "dark" ? "light" : "dark"), [setChoice, theme]);

  return <ThemeContext.Provider value={{ theme, choice, toggle, setChoice }}>{children}</ThemeContext.Provider>;
}
