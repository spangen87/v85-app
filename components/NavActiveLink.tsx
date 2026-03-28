"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavActiveLinkProps {
  href: string;
  label: string;
}

export function NavActiveLink({ href, label }: NavActiveLinkProps) {
  const pathname = usePathname();
  const isActive =
    href === "/" ? pathname === "/" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={`py-4 text-xs uppercase tracking-wide font-semibold border-b-2 transition-colors ${
        isActive
          ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
          : "border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-900 dark:hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
