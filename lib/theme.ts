/** Tema: "light"/"dark" när användaren valt själv, annars följer appen systemet. */
export type ThemeChoice = "light" | "dark";

export const THEME_STORAGE_KEY = "theme";

export function parseStoredTheme(v: string | null): ThemeChoice | null {
  return v === "light" || v === "dark" ? v : null;
}

export function effectiveTheme(stored: ThemeChoice | null, prefersDark: boolean): ThemeChoice {
  return stored ?? (prefersDark ? "dark" : "light");
}

/**
 * Körs i <head> innan sidan ritas så att ett eget val inte blinkar i fel tema.
 * Utan eget val gör den inget — CSS:ens prefers-color-scheme sköter det.
 */
export const THEME_INIT_SCRIPT =
  '(function(){try{var t=localStorage.getItem("theme");if(t==="light"||t==="dark"){var r=document.documentElement;r.setAttribute("data-theme",t);r.classList.add(t);}}catch(e){}})();';
