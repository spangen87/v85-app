"use client";

import { useState, useEffect } from "react";
import { getGroupNotesForGame, type RaceWithNotes } from "@/lib/actions/notes";
import { NoteLabelDot } from "@/components/notes/NoteLabel";

type Game = { id: string; date: string; track: string | null };

interface NotesTabProps {
  groupId: string;
  games: Game[];
  initialGameId: string | null;
  initialNotes: RaceWithNotes[];
}

function formatTime(isoStr: string): string {
  try { return new Date(isoStr).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" }); }
  catch { return ""; }
}

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just nu";
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} dag${days > 1 ? "ar" : ""} sedan`;
  return new Date(dateStr).toLocaleDateString("sv-SE");
}

export function NotesTab({ groupId, games, initialGameId, initialNotes }: NotesTabProps) {
  const [selectedGameId, setSelectedGameId] = useState(initialGameId);
  const [races, setRaces] = useState<RaceWithNotes[]>(initialNotes);
  const [loading, setLoading] = useState(false);

  useEffect(() => { setRaces(initialNotes); }, [initialNotes]);

  async function handleGameChange(gameId: string) {
    setSelectedGameId(gameId);
    setLoading(true);
    const data = await getGroupNotesForGame(groupId, gameId);
    setRaces(data);
    setLoading(false);
  }

  const totalNotes = races.reduce((sum, r) => sum + r.horses.reduce((s, h) => s + h.notes.length, 0), 0);

  return (
    <div className="px-4 py-5 space-y-4 max-w-2xl mx-auto">
      {games.length > 0 && (
        <select
          value={selectedGameId ?? ""}
          onChange={(e) => handleGameChange(e.target.value)}
          className="w-full rounded-lg px-3 py-2 text-sm outline-none"
          style={{ background: "var(--tn-bg-chip)", border: "1px solid var(--tn-border)", color: "var(--tn-text)" }}
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>{g.date}{g.track ? ` – ${g.track}` : ""}</option>
          ))}
        </select>
      )}

      {games.length === 0 && (
        <p className="text-sm italic" style={{ color: "var(--tn-text-faint)" }}>
          Ingen omgång inladdad ännu. Hämta en V85-omgång på startsidan först.
        </p>
      )}

      {loading && <p className="text-sm text-center py-4" style={{ color: "var(--tn-text-faint)" }}>Laddar…</p>}

      {!loading && selectedGameId && races.length === 0 && (
        <p className="text-sm italic text-center py-6" style={{ color: "var(--tn-text-faint)" }}>
          Inga sällskapsanteckningar finns för denna omgång.
        </p>
      )}

      {!loading && races.length > 0 && (
        <>
          <p className="text-xs" style={{ color: "var(--tn-text-faint)" }}>
            {totalNotes} anteckning{totalNotes !== 1 ? "ar" : ""} på {races.reduce((s, r) => s + r.horses.length, 0)} hästar
          </p>
          <div className="space-y-4">
            {races.map((race) => (
              <div key={race.race_number} className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="tn-eyebrow">
                    Avd {race.race_number}{race.race_name ? ` – ${race.race_name}` : ""}{race.start_time ? ` · ${formatTime(race.start_time)}` : ""}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--tn-border)" }} />
                </div>

                {race.horses.map((horse) => (
                  <div key={horse.horse_id} className="space-y-2">
                    <p className="text-xs font-medium pl-1" style={{ color: "var(--tn-text-dim)" }}>
                      {horse.start_number}. {horse.horse_name}
                    </p>
                    <div className="space-y-2 pl-1">
                      {horse.notes.map((note) => (
                        <div key={note.id} className="rounded-lg p-3 space-y-1.5" style={{ background: "var(--tn-bg-chip)" }}>
                          <div className="flex items-center gap-2 flex-wrap">
                            <NoteLabelDot label={note.label} />
                            <span className="text-xs font-medium" style={{ color: "var(--tn-text)" }}>{note.author_display_name}</span>
                            <span className="text-xs ml-auto" style={{ color: "var(--tn-text-faint)" }}>{relativeTime(note.created_at)}</span>
                          </div>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--tn-text)" }}>{note.content}</p>
                          {note.replies.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {note.replies.map((reply) => (
                                <div key={reply.id} className="ml-4 pl-3" style={{ borderLeft: "2px solid var(--tn-border)" }}>
                                  <div className="rounded-lg p-2.5 space-y-1" style={{ background: "var(--tn-bg-card)" }}>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium" style={{ color: "var(--tn-text)" }}>{reply.author_display_name}</span>
                                      <span className="text-xs ml-auto" style={{ color: "var(--tn-text-faint)" }}>{relativeTime(reply.created_at)}</span>
                                    </div>
                                    <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--tn-text)" }}>{reply.content}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
