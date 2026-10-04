import Link from "next/link";
import type { ReactNode } from "react";

/** Sidans huvud: rubrik (h1), en rad undertext, valfri tillbakalänk och handling. */
export function PageHeader({ title, sub, backHref, backLabel = "Tillbaka", action, sticky = true }: {
  title: string;
  sub?: ReactNode;
  backHref?: string;
  backLabel?: string;
  action?: ReactNode;
  /** Sitter fast upptill på mobil */
  sticky?: boolean;
}) {
  return (
    <header className={sticky ? "ta-page-head sticky top-0 z-30 md:static" : "ta-page-head"}>
      {backHref && (
        <Link href={backHref} className="ta-iconbtn" aria-label={backLabel}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m15 6-6 6 6 6" /></svg>
        </Link>
      )}
      <div className="min-w-0 flex-1">
        <h1 className="ta-page-title">{title}</h1>
        {sub && <p className="ta-page-sub">{sub}</p>}
      </div>
      {action}
    </header>
  );
}
