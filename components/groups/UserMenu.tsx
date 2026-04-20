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
}

export function UserMenu({ profile, groups, userEmail }: UserMenuProps) {
  const [open, setOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const displayName = profile?.display_name || userEmail.split("@")[0];
  const initials = displayName.slice(0, 2).toUpperCase();

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
          className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 transition"
          style={{ background: "var(--tn-accent)", color: "#fff" }}
          title={displayName}
        >
          {initials}
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
                  {groups.map((g) => (
                    <Link
                      key={g.id}
                      href={`/sallskap/${g.id}`}
                      onClick={() => setOpen(false)}
                      className="block text-xs truncate py-0.5 transition"
                      style={{ color: "var(--tn-text-dim)" }}
                    >
                      {g.name}
                    </Link>
                  ))}
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
