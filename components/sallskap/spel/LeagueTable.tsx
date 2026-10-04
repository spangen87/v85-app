'use client'

import { Badge } from '@/components/ui'
import { fmtGameShort } from '@/lib/format'
import type { GroupLeague } from '@/lib/actions/systems'

/**
 * Sällskapsligan: medlemmarnas systemträffar i rättade omgångar. Bästa
 * systemet per medlem och omgång räknas. Topp tre har placeringsfärg.
 */
export function LeagueTable({ league }: { league: GroupLeague }) {
  if (league.rows.length === 0) return null

  return (
    <section className="ta-section">
      <div>
        <h2 className="ta-section-title">Sällskapsligan</h2>
        <p className="ta-text-sm" style={{ marginTop: 2 }}>
          Bästa systemet per medlem och omgång räknas
          {league.last_round_date ? ` · senast rättad ${fmtGameShort(league.last_round_date)}` : ''}
        </p>
      </div>
      <div className="ta-card overflow-x-auto">
        <table className="ta-table">
          <thead>
            <tr>
              <th className="ta-left">Plats</th>
              <th className="ta-left">Medlem</th>
              <th>Omgångar</th>
              <th>Rätt</th>
              <th>Snitt</th>
              <th>Bäst</th>
            </tr>
          </thead>
          <tbody>
            {league.rows.map((row, i) => (
              <tr key={row.user_id}>
                <td className="ta-left"><span className={`ta-sn${i < 3 ? ` ta-sn-p${i + 1}` : ''}`}>{i + 1}</span></td>
                <td className="ta-left">
                  <span className="inline-flex items-center gap-2">
                    {row.display_name}
                    {row.is_last_round_winner && <Badge>Vann senast</Badge>}
                  </span>
                </td>
                <td className="ta-muted">{row.rounds}</td>
                <td className="ta-strong">{row.total_score}</td>
                <td className="ta-muted">{row.avg_score.toFixed(1).replace('.', ',')}</td>
                <td className="ta-muted">{row.best_score}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
