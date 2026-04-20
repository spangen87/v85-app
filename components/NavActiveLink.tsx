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
      className="tn-mono py-4 px-3 text-xs border-b-2 transition-colors"
      style={{
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        borderBottomColor: isActive ? "var(--tn-accent)" : "transparent",
        color: isActive ? "var(--tn-accent)" : "var(--tn-text-faint)",
      }}
    >
      {label}
    </Link>
  );
}
