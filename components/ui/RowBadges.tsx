import type { RowBadge } from "@/lib/raceView";
import { Badge } from "./Badge";

/** Hästens märken i fast ordning. Varningarna (Överspelad, Skor på) har egen ton. */
export function RowBadges({ badges, signalScore = 0 }: { badges: RowBadge[]; signalScore?: number }) {
  return (
    <>
      {badges.map((b) =>
        b === "skrall" ? <Badge key={b} tone="skrall">Skräll</Badge>
          : b === "overplayed" ? <Badge key={b} tone="warn">Överspelad</Badge>
          : b === "shoes" ? <Badge key={b} tone="warn">Skor på</Badge>
          : b === "signal" ? <Badge key={b} tone="signal">{`Signal +${signalScore}`}</Badge>
          : <Badge key={b}>Struken</Badge>)}
    </>
  );
}
