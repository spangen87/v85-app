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
  try {
    return new Date(isoStr).toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
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

  useEffect(() => {
    setRaces(initialNotes);
  }, [initialNotes]);

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
      {/* Omgångsväljare */}
      {games.length > 0 && (
        <select
          value={selectedGameId ?? ""}
          onChange={(e) => handleGameChange(e.target.value)}
          className="w-full bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
        >
          {games.map((g) => (
            <option key={g.id} value={g.id}>
              {g.date}{g.track ? ` – ${g.track}` : ""}
            </option>
          ))}
        </select>
      )}

      {games.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic">
          Ingen omgång inladdad ännu. Hämta en V85-omgång på startsidan först.
        </p>
      )}

      {loading && (
        <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Laddar…</p>
      )}

      {!loading && selectedGameId && races.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 italic text-center py-6">
          Inga sällskapsanteckningar finns för denna omgång.
        </p>
      )}

      {!loading && races.length > 0 && (
        <>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {totalNotes} anteckning{totalNotes !== 1 ? "ar" : ""} på {races.reduce((s, r) => s + r.horses.length, 0)} hästar
          </p>
          <div className="space-y-4">
            {races.map((race) => (
              <div key={race.race_number} className="space-y-2">
                {/* Loppheader */}
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    Avd {race.race_number}
                    {race.race_name ? ` – ${race.race_name}` : ""}
                    {race.start_time ? ` · ${formatTime(race.start_time)}` : ""}
                  </span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800" />
                </div>

                {/* Hästar med anteckningar */}
                {race.horses.map((horse) => (
                  <div key={horse.horse_id} className="space-y-2">
                    <p className="text-xs font-medium text-gray-700 dark:text-gray-300 pl-1">
                      {horse.start_number}. {horse.horse_name}
                    </p>
                    <div className="space-y-2 pl-1">
                      {horse.notes.map((note) => (
                        <div key={note.id} className="bg-gray-100 dark:bg-gray-800 rounded-lg p-3 space-y-1.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <NoteLabelDot label={note.label} />
                            <span className="text-xs font-medium text-gray-900 dark:text-white">{note.author_display_name}</span>
                            <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{relativeTime(note.created_at)}</span>
                          </div>
                          <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{note.content}</p>
                          {note.replies.length > 0 && (
                            <div className="mt-2 space-y-2">
                              {note.replies.map((reply) => (
                                <div key={reply.id} className="ml-4 pl-3 border-l-2 border-gray-300 dark:border-gray-700">
                                  <div className="bg-gray-50 dark:bg-[rgb(40,44,52)] rounded-lg p-2.5 space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-medium text-gray-900 dark:text-white">{reply.author_display_name}</span>
                                      <span className="text-xs text-gray-400 dark:text-gray-500 ml-auto">{relativeTime(reply.created_at)}</span>
                                    </div>
                                    <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{reply.content}</p>
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
