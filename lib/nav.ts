/** Huvudmenyn — samma fyra namn på mobil och dator. Manualen nås från "?". */
export const NAV_ITEMS = [
  { id: "lopp", label: "Lopp", href: "/" },
  { id: "system", label: "System", href: "/system" },
  { id: "utvardering", label: "Utvärdering", href: "/evaluation" },
  { id: "sallskap", label: "Sällskap", href: "/sallskap" },
] as const;

export type NavId = (typeof NAV_ITEMS)[number]["id"];

export function isActivePath(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
