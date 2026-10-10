"use client";

import { useState } from "react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { buildAtgFile, downloadAtgFile, parseAtgGameId, supportsAtgFile } from "@/lib/atgFile";
import type { SystemSelection } from "@/lib/types";

/**
 * Laddar ner systemet som ATG-fil (.xml) för filinlämning på atg.se/spel/reducerat
 * — så hästarna inte behöver klickas i en gång till. ATG Tillsammans saknar
 * filuppladdning för lag (lagspel läggs i ATG:s reduceringsverktyg).
 * Visas inte för speltyper som saknar filformat.
 */
export function AtgFileButton({ gameId, selections, size, disabled, style }: {
  gameId: string | null | undefined;
  selections: SystemSelection[];
} & Pick<ButtonProps, "size" | "disabled" | "style">) {
  const [status, setStatus] = useState<{ error?: string; done?: boolean }>({});
  const game = gameId ? parseAtgGameId(gameId) : null;
  if (!gameId || !game || !supportsAtgFile(game.gameType)) return null;

  function handleClick() {
    const file = buildAtgFile(gameId!, selections);
    if ("error" in file) {
      setStatus({ error: file.error });
      return;
    }
    downloadAtgFile(file);
    setStatus({ done: true });
    setTimeout(() => setStatus({}), 2000);
  }

  return (
    <>
      <Button size={size} disabled={disabled} style={style} onClick={handleClick}
        title="Ladda upp filen på atg.se/spel/reducerat (filinlämning, inloggad)">
        {status.done ? "Nedladdad" : "Ladda ner ATG-fil"}
      </Button>
      {status.error && <p className="ta-error" role="alert" style={{ margin: 0, flexBasis: "100%" }}>{status.error}</p>}
    </>
  );
}
