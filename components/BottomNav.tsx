"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    label: "Lopp",
    href: "/",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 18h18M5 14l2-4h10l2 4M8 14v4M16 14v4M9 10V6h6v4" />
      </svg>
    ),
  },
  {
    label: "Analys",
    href: "/evaluation",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 20V6M4 20h16M8 16V10M12 16V8M16 16V12M20 20V4" />
      </svg>
    ),
  },
  {
    label: "System",
    href: "/system",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </svg>
    ),
  },
  {
    label: "Profil",
    href: "/sallskap",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
      </svg>
    ),
  },
];

export function BottomNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 md:hidden"
      style={{
        background: "color-mix(in oklab, var(--tn-bg-raised) 92%, transparent)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid var(--tn-border)",
      }}
    >
      <div
        className="grid"
        style={{
          gridTemplateColumns: `repeat(${isAdmin ? 5 : 4}, 1fr)`,
          padding: "8px 8px 22px",
        }}
      >
        {tabs.map((tab) => {
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg transition-colors"
              style={{
                color: isActive ? "var(--tn-accent)" : "var(--tn-text-faint)",
                fontSize: "10px",
                fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
              }}
            >
              {tab.icon}
              {tab.label}
            </Link>
          );
        })}
        {isAdmin && (
          <Link
            href="/admin"
            className="flex flex-col items-center gap-1 py-1.5 px-1 rounded-lg transition-colors"
            style={{
              color: pathname.startsWith("/admin") ? "var(--tn-accent)" : "var(--tn-text-faint)",
              fontSize: "10px",
              fontFamily: "var(--font-geist-mono), ui-monospace, monospace",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" />
            </svg>
            Admin
          </Link>
        )}
      </div>
    </nav>
  );
}
