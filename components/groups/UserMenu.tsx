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

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
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
        {/* Avatar button */}
        <button
          onClick={() => setOpen((v) => !v)}
          className="w-9 h-9 rounded-full bg-indigo-700 hover:bg-indigo-600 transition flex items-center justify-center text-white text-sm font-bold shrink-0"
          title={displayName}
        >
          {initials}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-11 w-56 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl shadow-2xl z-40 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-300 dark:border-gray-700">
              <p className="text-gray-900 dark:text-white text-sm font-medium truncate">{displayName}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{userEmail}</p>
            </div>

            {groups.length > 0 && (
              <div className="px-4 py-2 border-b border-gray-300 dark:border-gray-700">
                <p className="text-gray-400 dark:text-gray-500 text-xs mb-1">Sällskap</p>
                {groups.map((g) => (
                  <Link
                    key={g.id}
                    href={`/sallskap/${g.id}`}
                    onClick={() => setOpen(false)}
                    className="block text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 text-xs truncate py-0.5 transition"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            )}

            <div className="px-2 py-2 space-y-1">
              <button
                onClick={() => { setOpen(false); setModalOpen(true); }}
                className="w-full text-left px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                Hantera sällskap
              </button>
              <Link
                href="/manual"
                onClick={() => setOpen(false)}
                className="block px-3 py-2 text-sm text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                Användarmanual
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition"
              >
                Logga ut
              </button>
            </div>
          </div>
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
