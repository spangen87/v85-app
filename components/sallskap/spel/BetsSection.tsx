'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  getGroupBets,
  getGroupBetStats,
  addBet,
  updateBetPayout,
  deleteBet,
  type Bet,
  type BetStats,
} from '@/lib/actions/bets'

interface BetsSectionProps {
  groupId: string
  gameId: string | null
  currentUserId: string
}

function formatKr(value: number): string {
  return value % 1 === 0 ? `${value} kr` : `${value.toFixed(2).replace('.', ',')} kr`
}

export function BetsSection({ groupId, gameId, currentUserId }: BetsSectionProps) {
  const [bets, setBets] = useState<Bet[]>([])
  const [stats, setStats] = useState<BetStats[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showStats, setShowStats] = useState(false)

  // Formulär
  const [betType, setBetType] = useState('')
  const [raceNumber, setRaceNumber] = useState('')
  const [horseName, setHorseName] = useState('')
  const [stake, setStake] = useState('')
  const [saving, setSaving] = useState(false)

  // Utdelning-redigering per bet
  const [payoutDrafts, setPayoutDrafts] = useState<Record<string, string>>({})

  const reload = useCallback(async () => {
    if (!gameId) return
    setLoading(true)
    setError(null)
    try {
      const [betData, statData] = await Promise.all([
        getGroupBets(groupId, gameId),
        getGroupBetStats(groupId),
      ])
      setBets(betData)
      setStats(statData)
    } catch {
      setError('Kunde inte ladda insatser. Försök igen.')
    } finally {
      setLoading(false)
    }
  }, [groupId, gameId])

  useEffect(() => {
    reload()
  }, [reload])

  async function handleAdd() {
    if (!gameId) return
    const stakeNum = parseFloat(stake.replace(',', '.'))
    if (!betType.trim() || isNaN(stakeNum) || stakeNum <= 0) {
      setError('Ange speltyp och en insats större än 0 kr.')
      return
    }
    setSaving(true)
    setError(null)
    const raceNum = parseInt(raceNumber, 10)
    const result = await addBet(
      groupId,
      gameId,
      isNaN(raceNum) ? null : raceNum,
      horseName.trim() || null,
      betType.trim(),
      stakeNum
    )
    setSaving(false)
    if (result.error) {
      setError(result.error)
      return
    }
    setBetType('')
    setRaceNumber('')
    setHorseName('')
    setStake('')
    await reload()
  }

  async function handleSavePayout(bet: Bet) {
    const draft = payoutDrafts[bet.id]
    if (draft == null) return
    const payoutNum = parseFloat(draft.replace(',', '.'))
    if (isNaN(payoutNum) || payoutNum < 0) {
      setError('Utdelningen måste vara 0 kr eller mer.')
      return
    }
    setError(null)
    const result = await updateBetPayout(bet.id, payoutNum)
    if (result.error) {
      setError(result.error)
      return
    }
    setPayoutDrafts(prev => {
      const next = { ...prev }
      delete next[bet.id]
      return next
    })
    await reload()
  }

  async function handleDelete(bet: Bet) {
    setError(null)
    const previous = bets
    setBets(prev => prev.filter(b => b.id !== bet.id))
    const result = await deleteBet(bet.id)
    if (result.error) {
      setBets(previous)
      setError(result.error)
      return
    }
    await reload()
  }

  if (!gameId) return null

  const inputStyle: React.CSSProperties = {
    background: 'var(--tn-bg-chip)',
    border: '1px solid var(--tn-border)',
    color: 'var(--tn-text)',
  }

  return (
    <section className="mt-8">
      <h2 className="text-sm font-semibold uppercase tracking-wide mb-3 tn-eyebrow" style={{ color: 'var(--tn-text-dim)' }}>
        Insatser
      </h2>

      {/* Lägg till insats */}
      <div className="rounded-xl p-3 mb-3" style={{ background: 'var(--tn-bg-card)', border: '1px solid var(--tn-border)' }}>
        <div className="flex flex-wrap gap-2">
          <input
            type="text"
            value={betType}
            onChange={e => setBetType(e.target.value)}
            placeholder="Speltyp (V85, Vinnare …)"
            className="flex-1 min-w-[120px] text-sm px-3 py-2 rounded-lg focus:outline-none"
            style={inputStyle}
          />
          <input
            type="number"
            value={raceNumber}
            onChange={e => setRaceNumber(e.target.value)}
            placeholder="Avd"
            min={1}
            className="w-16 text-sm px-2 py-2 rounded-lg focus:outline-none"
            style={inputStyle}
          />
          <input
            type="text"
            value={horseName}
            onChange={e => setHorseName(e.target.value)}
            placeholder="Häst (valfritt)"
            className="flex-1 min-w-[110px] text-sm px-3 py-2 rounded-lg focus:outline-none"
            style={inputStyle}
          />
          <input
            type="number"
            value={stake}
            onChange={e => setStake(e.target.value)}
            placeholder="Insats kr"
            min={0}
            className="w-24 text-sm px-2 py-2 rounded-lg focus:outline-none"
            style={inputStyle}
          />
          <button
            onClick={handleAdd}
            disabled={saving}
            className="text-sm px-4 py-2 rounded-lg font-semibold transition disabled:opacity-50"
            style={{
              background: 'var(--tn-accent-faint)',
              color: 'var(--tn-accent)',
              border: '1px solid var(--tn-accent-soft)',
              cursor: 'pointer',
            }}
          >
            {saving ? 'Sparar…' : 'Lägg till'}
          </button>
        </div>
      </div>

      {error && (
        <p className="text-xs mb-2" style={{ color: 'var(--tn-value-low)' }}>{error}</p>
      )}

      {/* Insatser för vald omgång */}
      {loading ? (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--tn-text-faint)' }}>Laddar insatser…</p>
      ) : bets.length === 0 ? (
        <p className="text-sm py-4 text-center" style={{ color: 'var(--tn-text-faint)' }}>
          Inga insatser registrerade för denna omgång ännu.
        </p>
      ) : (
        <div className="flex flex-col gap-1 mb-3">
          {bets.map(bet => {
            const isOwner = bet.user_id === currentUserId
            const draft = payoutDrafts[bet.id]
            return (
              <div
                key={bet.id}
                className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm flex-wrap"
                style={{ background: 'var(--tn-bg-card)' }}
              >
                <span className="font-semibold" style={{ color: 'var(--tn-text)' }}>{bet.author_name}</span>
                <span style={{ color: 'var(--tn-text-dim)' }}>
                  {bet.bet_type}
                  {bet.race_number != null && ` · Avd ${bet.race_number}`}
                  {bet.horse_name && ` · ${bet.horse_name}`}
                </span>
                <span className="ml-auto tn-mono" style={{ color: 'var(--tn-text-dim)' }}>{formatKr(bet.stake)}</span>
                {isOwner ? (
                  <span className="flex items-center gap-1">
                    <input
                      type="number"
                      value={draft ?? (bet.payout ?? '')}
                      onChange={e => setPayoutDrafts(prev => ({ ...prev, [bet.id]: e.target.value }))}
                      placeholder="Utdeln."
                      min={0}
                      aria-label="Utdelning i kronor"
                      className="w-20 text-xs px-2 py-1 rounded-md focus:outline-none"
                      style={inputStyle}
                    />
                    {draft != null && (
                      <button
                        onClick={() => handleSavePayout(bet)}
                        className="text-xs px-2 py-1 rounded-md font-semibold"
                        style={{ background: 'var(--tn-accent-faint)', color: 'var(--tn-accent)', border: 'none', cursor: 'pointer' }}
                      >
                        Spara
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(bet)}
                      aria-label="Ta bort insats"
                      title="Ta bort insats"
                      className="text-xs px-2 py-1 rounded-md"
                      style={{ color: 'var(--tn-value-low)', background: 'none', border: 'none', cursor: 'pointer' }}
                    >
                      ×
                    </button>
                  </span>
                ) : (
                  <span className="tn-mono font-semibold" style={{ color: bet.payout != null && bet.payout > bet.stake ? 'var(--tn-value-high)' : 'var(--tn-text-faint)' }}>
                    {bet.payout != null ? `→ ${formatKr(bet.payout)}` : '–'}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ROI per medlem (alla omgångar) */}
      {stats.length > 0 && (
        <div>
          <button
            onClick={() => setShowStats(v => !v)}
            className="text-xs font-semibold mb-2"
            style={{ color: 'var(--tn-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {showStats ? '▾' : '▸'} ROI per medlem (alla omgångar)
          </button>
          {showStats && (
            <div className="rounded-xl overflow-hidden" style={{ background: 'var(--tn-bg-card)', border: '1px solid var(--tn-border)' }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--tn-border)' }}>
                    <th className="text-left px-3 py-2 tn-eyebrow font-normal">Medlem</th>
                    <th className="text-right px-3 py-2 tn-eyebrow font-normal">Spel</th>
                    <th className="text-right px-3 py-2 tn-eyebrow font-normal">Insats</th>
                    <th className="text-right px-3 py-2 tn-eyebrow font-normal">Utdelning</th>
                    <th className="text-right px-3 py-2 tn-eyebrow font-normal">ROI</th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats].sort((a, b) => b.roi - a.roi).map(s => (
                    <tr key={s.user_id} style={{ borderTop: '1px solid var(--tn-border)' }}>
                      <td className="px-3 py-2 font-medium" style={{ color: 'var(--tn-text)' }}>{s.author_name}</td>
                      <td className="px-3 py-2 text-right tn-mono" style={{ color: 'var(--tn-text-dim)' }}>{s.bet_count}</td>
                      <td className="px-3 py-2 text-right tn-mono" style={{ color: 'var(--tn-text-dim)' }}>{formatKr(s.total_stake)}</td>
                      <td className="px-3 py-2 text-right tn-mono" style={{ color: 'var(--tn-text-dim)' }}>{formatKr(s.total_payout)}</td>
                      <td className="px-3 py-2 text-right tn-mono font-semibold" style={{ color: s.roi > 0 ? 'var(--tn-value-high)' : s.roi < 0 ? 'var(--tn-value-low)' : 'var(--tn-text-dim)' }}>
                        {s.roi > 0 ? '+' : ''}{s.roi.toFixed(1).replace('.', ',')} %
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
