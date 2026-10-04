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
import { ConfirmDialog } from '@/components/ConfirmDialog'
import { Button } from '@/components/ui'
import { fmtDelta, fmtKr } from '@/lib/format'

interface BetsSectionProps {
  groupId: string
  gameId: string | null
  currentUserId: string
  /** Bumpas av SpelTab när en insats registrerats från ett systemkort — triggar omladdning */
  refreshSignal?: number
}

// Insatser kan sluta på 50 öre (radpris 0,50 kr)
const formatKr = (value: number) =>
  value % 1 === 0 ? fmtKr(value) : `${value.toFixed(2).replace('.', ',')}\u00a0kr`

export function BetsSection({ groupId, gameId, currentUserId, refreshSignal = 0 }: BetsSectionProps) {
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
  const [confirmDelete, setConfirmDelete] = useState<Bet | null>(null)
  const [deleting, setDeleting] = useState(false)

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
    // refreshSignal bumpas när en insats registrerats från ett systemkort
  }, [reload, refreshSignal])

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
    setDeleting(true)
    const previous = bets
    setBets(prev => prev.filter(b => b.id !== bet.id))
    const result = await deleteBet(bet.id)
    setDeleting(false)
    setConfirmDelete(null)
    if (result.error) {
      setBets(previous)
      setError(result.error)
      return
    }
    await reload()
  }

  if (!gameId) return null

  const field = (label: string, input: React.ReactNode, span = false) => (
    <label className="ta-stack" style={{ gap: 6, gridColumn: span ? '1 / -1' : undefined }}>
      <span className="ta-field-label">{label}</span>
      {input}
    </label>
  )

  return (
    <section className="ta-section">
      <div>
        <h2 className="ta-section-title">Insatser</h2>
        <p className="ta-text-sm" style={{ marginTop: 2 }}>
          Tryck på Jag spelade detta på ett system så fylls insatsen i. Fyll i utdelningen när omgången är avgjord.
        </p>
      </div>

      <form
        className="ta-card ta-card-pad"
        style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 80px', gap: 12 }}
        onSubmit={(e) => { e.preventDefault(); void handleAdd() }}
      >
        {field('Spel', <input type="text" className="ta-field" style={{ height: 44 }} value={betType} onChange={e => setBetType(e.target.value)} placeholder="V85, Vinnare …" />)}
        {field('Avd', <input type="number" inputMode="numeric" className="ta-field" style={{ height: 44 }} value={raceNumber} onChange={e => setRaceNumber(e.target.value)} min={1} />)}
        {field('Häst (valfritt)', <input type="text" className="ta-field" style={{ height: 44 }} value={horseName} onChange={e => setHorseName(e.target.value)} />)}
        {field('Insats', <input type="number" inputMode="decimal" className="ta-field" style={{ height: 44 }} value={stake} onChange={e => setStake(e.target.value)} min={0} placeholder="kr" />)}
        <div style={{ gridColumn: '1 / -1' }}>
          <Button type="submit" disabled={saving}>{saving ? 'Sparar …' : 'Lägg till insats'}</Button>
        </div>
      </form>

      {error && <p className="ta-error" style={{ margin: 0 }}>{error}</p>}

      {loading ? (
        <p className="ta-text" role="status">Laddar insatser …</p>
      ) : bets.length === 0 ? (
        <p className="ta-text">Inga insatser för omgången ännu.</p>
      ) : (
        <ul className="ta-card ta-divided" style={{ listStyle: 'none', margin: 0, padding: 0, overflow: 'hidden' }}>
          {bets.map(bet => {
            const isOwner = bet.user_id === currentUserId
            const draft = payoutDrafts[bet.id]
            const what = bet.system_name
              ? `${bet.system_name} (system${bet.system_score != null ? `, ${bet.system_score} rätt` : ''})`
              : [bet.bet_type, bet.race_number != null ? `Avd ${bet.race_number}` : null, bet.horse_name].filter(Boolean).join(' · ')
            return (
              <li key={bet.id} className="flex items-start gap-3 flex-wrap" style={{ padding: 'var(--space-3) var(--space-4)' }}>
                <div className="flex-1 min-w-0">
                  <div style={{ font: '500 15px/20px var(--font-sans)', color: 'var(--ink)' }}>{bet.author_name}</div>
                  <div className="ta-text-sm">{what}</div>
                </div>
                <div className="flex flex-col items-end gap-1" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <span style={{ font: '500 14px/20px var(--font-sans)', color: 'var(--ink)' }}>{formatKr(bet.stake)}</span>
                  {isOwner ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        inputMode="decimal"
                        value={draft ?? (bet.payout ?? '')}
                        onChange={e => setPayoutDrafts(prev => ({ ...prev, [bet.id]: e.target.value }))}
                        placeholder="Utdelning"
                        min={0}
                        aria-label={`Utdelning i kronor för ${what}`}
                        className="ta-field"
                        style={{ width: 104, height: 36 }}
                      />
                      {draft != null && <Button size="sm" onClick={() => handleSavePayout(bet)}>Spara</Button>}
                      <Button size="sm" variant="quiet" onClick={() => setConfirmDelete(bet)} aria-label={`Ta bort insatsen ${what}`}>Ta bort</Button>
                    </span>
                  ) : (
                    <span className="ta-text-sm">{bet.payout != null ? `Utdelning ${formatKr(bet.payout)}` : 'Ingen utdelning ifylld'}</span>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {stats.length > 0 && (
        <div className="ta-stack">
          <div>
            <Button size="sm" variant="quiet" aria-expanded={showStats} onClick={() => setShowStats(v => !v)}>
              {showStats ? 'Dölj avkastning per medlem' : 'Visa avkastning per medlem'}
            </Button>
          </div>
          {showStats && (
            <div className="ta-card overflow-x-auto">
              <table className="ta-table">
                <thead>
                  <tr>
                    <th className="ta-left">Medlem</th>
                    <th>Spel</th>
                    <th>Insats</th>
                    <th>Utdelning</th>
                    <th>Avkastning</th>
                  </tr>
                </thead>
                <tbody>
                  {[...stats].sort((a, b) => b.roi - a.roi).map(st => (
                    <tr key={st.user_id}>
                      <td className="ta-left">{st.author_name}</td>
                      <td className="ta-muted">{st.bet_count}</td>
                      <td className="ta-muted">{formatKr(st.total_stake)}</td>
                      <td className="ta-muted">{formatKr(st.total_payout)}</td>
                      <td className="ta-strong">{fmtDelta(st.roi)}{'\u00a0%'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="ta-text-sm" style={{ padding: 'var(--space-3) var(--space-4)', borderTop: '1px solid var(--line)' }}>
                Avkastning = (utdelning − insats) / insats, över alla omgångar.
              </p>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Ta bort insatsen?"
        description={
          confirmDelete
            ? `${confirmDelete.system_name ?? confirmDelete.bet_type} på ${formatKr(confirmDelete.stake)} tas bort och räknas inte längre i avkastningen.`
            : undefined
        }
        confirmLabel="Ta bort"
        danger
        busy={deleting}
        onConfirm={() => { if (confirmDelete) handleDelete(confirmDelete) }}
        onCancel={() => setConfirmDelete(null)}
      />
    </section>
  )
}
