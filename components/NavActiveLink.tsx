"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { isActivePath } from "@/lib/nav";

interface NavActiveLinkProps {
  href: string;
  label: string;
}

export function NavActiveLink({ href, label }: NavActiveLinkProps) {
  const pathname = usePathname();
  const isActive = isActivePath(pathname ?? "/", href);

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className="h-9 px-3 rounded-md inline-flex items-center text-sm font-medium"
      style={isActive ? { background: "var(--accent-soft)", color: "var(--accent)" } : { color: "var(--ink-muted)" }}
    >
      {label}
    </Link>
  );
}
