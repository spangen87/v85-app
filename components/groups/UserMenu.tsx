"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { GroupAdminModal } from "./GroupAdminModal";
import type { Group, Profile } from "@/lib/types";

interface UserMenuProps {
  profile: Profile | null;
  groups: Group[];
  userEmail: string;
  /** Osedda händelser per sällskap — visar prick på avataren och antal i listan */
  unseenByGroup?: Record<string, number>;
}

export function UserMenu({ profile, groups, userEmail, unseenByGroup = {} }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const displayName = profile?.display_name || userEmail.split("@")[0];
  const initials = displayName.slice(0, 2).toUpperCase();
  const unseenTotal = Object.values(unseenByGroup).reduce((a, b) => a + b, 0);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition"
          style={{ background: "var(--tn-accent)", color: "#fff" }}
          title={unseenTotal > 0 ? `${displayName} — ${unseenTotal} nya händelser i dina sällskap` : displayName}
        >
          {initials}
          {unseenTotal > 0 && (
            <span
              className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full"
              style={{ background: "var(--tn-warn)", border: "2px solid var(--tn-bg)" }}
              aria-label={`${unseenTotal} nya händelser i dina sällskap`}
            />
          )}
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
            <div
              className="absolute right-0 top-11 w-56 rounded-xl shadow-2xl z-40 overflow-hidden"
              style={{ background: "var(--tn-bg-raised)", border: "1px solid var(--tn-border)" }}
            >
              <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--tn-border)" }}>
                <p className="text-sm font-medium truncate" style={{ color: "var(--tn-text)" }}>{displayName}</p>
                <p className="text-xs truncate" style={{ color: "var(--tn-text-faint)" }}>{userEmail}</p>
              </div>

              {groups.length > 0 && (
                <div className="px-4 py-2" style={{ borderBottom: "1px solid var(--tn-border)" }}>
                  <p className="text-xs mb-1" style={{ color: "var(--tn-text-faint)" }}>Sällskap</p>
                  {groups.map((g) => {
                    const unseen = unseenByGroup[g.id] ?? 0;
                    return (
                      <Link
                        key={g.id}
                        href={`/sallskap/${g.id}`}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-2 text-xs py-0.5 transition"
                        style={{ color: "var(--tn-text-dim)" }}
                      >
                        <span className="truncate">{g.name}</span>
                        {unseen > 0 && (
                          <span
                            className="shrink-0 min-w-[16px] h-4 px-1 rounded-full flex items-center justify-center text-[9px] font-bold"
                            style={{ background: "var(--tn-accent)", color: "#fff" }}
                          >
                            {unseen > 9 ? "9+" : unseen}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}

              <div className="px-2 py-2 space-y-1">
                <button
                  onClick={() => { setOpen(false); setModalOpen(true); }}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg transition"
                  style={{ color: "var(--tn-text)", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tn-bg-card)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  Hantera sällskap
                </button>
                <Link
                  href="/manual"
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 text-sm rounded-lg transition"
                  style={{ color: "var(--tn-text)" }}
                >
                  Användarmanual
                </Link>
                <button
                  onClick={handleSignOut}
                  className="w-full text-left px-3 py-2 text-sm rounded-lg transition"
                  style={{ color: "var(--tn-value-low)", background: "none", border: "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "var(--tn-bg-card)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "none"; }}
                >
                  Logga ut
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      <GroupAdminModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        profile={profile}
        initialGroups={groups}
      />
    </>
  );
}
