'use client'

import type { GroupLeague } from '@/lib/actions/systems'

/**
 * Sällskapsligan — topplista över medlemmarnas systemträffar i rättade
 * omgångar. Bästa systemet per medlem och omgång räknas; 👑 markerar vem
 * som vann den senast rättade omgången.
 */
export function LeagueTable({ league }: { league: GroupLeague }) {
  if (league.rows.length === 0) return null

  return (
    <section className="mt-8">
      <h2
        className="text-sm font-semibold uppercase tracking-wide mb-1 tn-eyebrow"
        style={{ color: 'var(--tn-text-dim)' }}
      >
        Sällskapsligan
      </h2>
      {league.last_round_date && (
        <p className="text-xs mb-3" style={{ color: 'var(--tn-text-faint)' }}>
          Bästa systemet per medlem och omgång räknas · senast rättad {league.last_round_date}
        </p>
      )}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: 'var(--tn-bg-card)', border: '1px solid var(--tn-border)' }}
      >
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--tn-border)' }}>
              <th className="text-left px-3 py-2 tn-eyebrow font-normal">#</th>
              <th className="text-left px-3 py-2 tn-eyebrow font-normal">Medlem</th>
              <th className="text-right px-3 py-2 tn-eyebrow font-normal">Omg.</th>
              <th className="text-right px-3 py-2 tn-eyebrow font-normal">Rätt</th>
              <th className="text-right px-3 py-2 tn-eyebrow font-normal">Snitt</th>
              <th className="text-right px-3 py-2 tn-eyebrow font-normal">Bäst</th>
            </tr>
          </thead>
          <tbody>
            {league.rows.map((row, i) => (
              <tr key={row.user_id} style={{ borderTop: i > 0 ? '1px solid var(--tn-border)' : 'none' }}>
                <td
                  className="px-3 py-2 tn-mono text-xs"
                  style={{ color: i === 0 ? 'var(--tn-p1)' : 'var(--tn-text-faint)' }}
                >
                  {i + 1}
                </td>
                <td className="px-3 py-2 font-medium" style={{ color: 'var(--tn-text)' }}>
                  {row.display_name}
                  {row.is_last_round_winner && (
                    <span className="ml-1.5" title="Vann senast rättade omgången" aria-label="Vann senast rättade omgången">
                      👑
                    </span>
                  )}
                </td>
                <td className="px-3 py-2 text-right tn-mono" style={{ color: 'var(--tn-text-dim)' }}>
                  {row.rounds}
                </td>
                <td className="px-3 py-2 text-right tn-mono font-semibold" style={{ color: 'var(--tn-text)' }}>
                  {row.total_score}
                </td>
                <td className="px-3 py-2 text-right tn-mono" style={{ color: 'var(--tn-text-dim)' }}>
                  {row.avg_score.toFixed(1).replace('.', ',')}
                </td>
                <td className="px-3 py-2 text-right tn-mono" style={{ color: 'var(--tn-text-dim)' }}>
                  {row.best_score}/8
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
