"use client";

import { useEffect, useState } from "react";
import { getGroupNotesForGame, type RaceWithNotes } from "@/lib/actions/notes";
import { NoteLabelTag } from "@/components/notes/NoteLabel";
import { EmptyState } from "@/components/ui";
import { fmtClock } from "@/lib/format";
import { relativeTime } from "@/lib/relativeTime";

interface NotesTabProps {
  groupId: string;
  gameId: string;
  /** Anteckningar som redan är hämtade (sidans standardomgång); null = hämta */
  initialNotes: RaceWithNotes[] | null;
}

export function NotesTab({ groupId, gameId, initialNotes }: NotesTabProps) {
  const [races, setRaces] = useState<RaceWithNotes[] | null>(initialNotes);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (races !== null) return;
    let cancelled = false;
    getGroupNotesForGame(groupId, gameId)
      .then((data) => { if (!cancelled) setRaces(data); })
      .catch(() => { if (!cancelled) { setRaces([]); setError("Kunde inte hämta anteckningarna. Försök igen."); } });
    return () => { cancelled = true; };
  }, [groupId, gameId, races]);

  if (races === null) return <p className="ta-text" role="status">Laddar anteckningar …</p>;
  if (error) return <p className="ta-error" style={{ margin: 0 }}>{error}</p>;
  if (races.length === 0) {
    return (
      <EmptyState
        title="Inga anteckningar för omgången"
        text="Skriv anteckningar i hästens detaljvy i loppvyn. De samlas här och följer hästen till nästa start."
      />
    );
  }

  const totalNotes = races.reduce((sum, r) => sum + r.horses.reduce((s, h) => s + h.notes.length, 0), 0);
  const totalHorses = races.reduce((s, r) => s + r.horses.length, 0);

  return (
    <div className="flex flex-col gap-6">
      <p className="ta-text">{`${totalNotes} ${totalNotes === 1 ? "anteckning" : "anteckningar"} om ${totalHorses} ${totalHorses === 1 ? "häst" : "hästar"}`}</p>
      {races.map((race) => (
        <section key={race.race_number} className="ta-section">
          <h2 className="ta-section-title">
            {`Avdelning ${race.race_number}`}
            {race.start_time && <span className="ta-text-sm" style={{ marginLeft: 8 }}>{`Start ${fmtClock(race.start_time)}`}</span>}
          </h2>
          {race.horses.map((horse) => (
            <div key={horse.horse_id} className="flex flex-col gap-2">
              <p className="flex items-center gap-2" style={{ margin: 0, font: "600 15px/20px var(--font-sans)", color: "var(--ink)" }}>
                <span className="ta-sn">{horse.start_number}</span>{horse.horse_name}
              </p>
              {horse.notes.map((note) => (
                <article key={note.id} className="ta-card ta-card-pad flex flex-col gap-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span style={{ font: "500 14px/20px var(--font-sans)", color: "var(--ink)" }}>{note.author_display_name}</span>
                    <NoteLabelTag label={note.label} />
                    <span className="ta-text-sm" style={{ marginLeft: "auto", fontSize: 12 }}>{relativeTime(note.created_at)}</span>
                  </div>
                  <p style={{ margin: 0, font: "400 15px/22px var(--font-sans)", color: "var(--ink)", whiteSpace: "pre-wrap" }}>{note.content}</p>
                  {note.replies.map((reply) => (
                    <div key={reply.id} className="flex flex-col gap-1" style={{ marginLeft: 16, paddingLeft: 12, borderLeft: "2px solid var(--line)" }}>
                      <div className="flex items-center gap-2">
                        <span style={{ font: "500 14px/20px var(--font-sans)", color: "var(--ink)" }}>{reply.author_display_name}</span>
                        <span className="ta-text-sm" style={{ marginLeft: "auto", fontSize: 12 }}>{relativeTime(reply.created_at)}</span>
                      </div>
                      <p style={{ margin: 0, font: "400 15px/22px var(--font-sans)", color: "var(--ink)", whiteSpace: "pre-wrap" }}>{reply.content}</p>
                    </div>
                  ))}
                </article>
              ))}
            </div>
          ))}
        </section>
      ))}
    </div>
  );
}
