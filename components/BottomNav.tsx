"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NAV_ITEMS, isActivePath, type NavId } from "@/lib/nav";

const ICONS: Record<NavId | "admin", ReactNode> = {
  lopp: <path d="M4 18c0-4 3.5-7 8-7s8 3 8 7M4 18h16M12 11V5m0 0 4 2-4 2" />,
  system: (
    <>
      <rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" />
      <rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" />
    </>
  ),
  utvardering: <path d="M5 19V11M12 19V5M19 19v-6M3 19h18" />,
  sallskap: (
    <>
      <circle cx="9" cy="9" r="3.2" /><circle cx="16.5" cy="10" r="2.5" />
      <path d="M3.5 19c.6-3 2.8-4.6 5.5-4.6s4.9 1.6 5.5 4.6M15 14.6c2.6-.3 4.8 1.1 5.4 4.4" />
    </>
  ),
  admin: <><circle cx="12" cy="12" r="3" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14" /></>,
};

function Icon({ id }: { id: NavId | "admin" }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {ICONS[id]}
    </svg>
  );
}

export function BottomNav({ isAdmin = false, sallskapBadge = 0 }: {
  isAdmin?: boolean;
  /** Antal osedda händelser i användarens sällskap */
  sallskapBadge?: number;
}) {
  const pathname = usePathname() ?? "/";
  const items: { id: NavId | "admin"; label: string; href: string }[] = [
    ...NAV_ITEMS,
    ...(isAdmin ? [{ id: "admin" as const, label: "Admin", href: "/admin" }] : []),
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden">
      <nav className="ta-nav" aria-label="Huvudmeny">
        {items.map((it) => {
          const active = isActivePath(pathname, it.href);
          const count = it.id === "sallskap" ? sallskapBadge : 0;
          return (
            <Link key={it.href} href={it.href} className={`ta-nav-item${active ? " ta-nav-active" : ""}`}
              aria-current={active ? "page" : undefined}>
              <span className="ta-nav-icon">
                <Icon id={it.id} />
                {count > 0 && (
                  <span className="ta-nav-count" aria-label={`${count} nya händelser i dina sällskap`}>
                    {count > 9 ? "9+" : count}
                  </span>
                )}
              </span>
              <span>{it.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
