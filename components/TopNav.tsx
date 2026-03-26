"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: 'Analys', href: '/' },
  { label: 'Utvärdering', href: '/evaluation' },
  { label: 'System', href: '/system' },
  { label: 'Manual', href: '/manual' },
];

export function TopNav() {
  const pathname = usePathname();

  return (
    <nav className="hidden md:flex sticky top-0 z-50 bg-white/90 dark:bg-gray-950/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-800 px-6 gap-6">
      {tabs.map((tab) => {
        const isActive =
          tab.href === "/"
            ? pathname === "/"
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`py-4 text-xs uppercase tracking-wide font-semibold border-b-2 transition-colors ${
              isActive
                ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
                : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
