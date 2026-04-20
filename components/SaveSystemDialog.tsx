'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Group, SystemSelection } from '@/lib/types'
import { createSystem, publishDraft } from '@/lib/actions/systems'
import { formatRowCost } from '@/lib/atg'

interface SaveSystemDialogProps {
  open: boolean
  onClose: () => void
  onSaved: () => void
  gameId: string | null
  gameType: string | null
  selections: SystemSelection[]
  totalRows: number
  userGroups: Group[]
  defaultGroupId?: string | null
  existingDraftId?: string | null
}

export function SaveSystemDialog({
  open,
  onClose,
  onSaved,
  gameId,
  gameType,
  selections,
  totalRows,
  userGroups,
  defaultGroupId = null,
  existingDraftId = null,
}: SaveSystemDialogProps) {
  const router = useRouter()
  const [name, setName] = useState('Mitt system')
  const [groupId, setGroupId] = useState<string | null>(defaultGroupId)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [savedName, setSavedName] = useState<string | null>(null)

  if (!open) return null

  function handleSave() {
    if (!name.trim()) { setError('Systemet måste ha ett namn.'); return }
    if (!gameId) { setError('Inget spel valt.'); return }
    setError(null)
    startTransition(async () => {
      try {
        if (existingDraftId) {
          await publishDraft(existingDraftId, name.trim(), groupId)
        } else {
          await createSystem(groupId, gameId, name.trim(), selections, totalRows)
        }
        setSavedName(name.trim())
      } catch (err) {
        setError('Kunde inte spara systemet. Försök igen.')
        console.error(err)
      }
    })
  }

  function handleGoToSystem() {
    onSaved()
    router.push(`/system?game=${gameId}`)
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--tn-bg-chip)",
    border: "1px solid var(--tn-border)",
    color: "var(--tn-text)",
    borderRadius: 8,
    padding: "8px 12px",
    fontSize: 14,
    width: "100%",
    outline: "none",
  }

  if (savedName !== null) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
        <div
          className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(1.5rem+4rem)] sm:pb-6 shadow-xl"
          style={{ background: "var(--tn-bg-raised)", border: "1px solid var(--tn-border)" }}
        >
          <div className="text-center mb-5">
            <p className="tn-eyebrow mb-2">Klart</p>
            <h2 className="text-lg font-bold mb-1" style={{ color: "var(--tn-text)" }}>System sparat!</h2>
            <p className="text-sm" style={{ color: "var(--tn-text-faint)" }}>
              &ldquo;{savedName}&rdquo; &mdash; {totalRows} {totalRows === 1 ? 'rad' : 'rader'} &middot; {formatRowCost(totalRows, gameType ?? '')}
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onSaved}
              className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors"
              style={{ background: "var(--tn-bg-chip)", color: "var(--tn-text-dim)", border: "1px solid var(--tn-border)" }}
            >
              Stäng
            </button>
            <button
              onClick={handleGoToSystem}
              className="flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-colors"
              style={{ background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }}
            >
              Se systemet →
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div
        className="w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-6 pb-[calc(1.5rem+4rem)] sm:pb-6 shadow-xl"
        style={{ background: "var(--tn-bg-raised)", border: "1px solid var(--tn-border)" }}
      >
        <h2 className="text-lg font-bold mb-4" style={{ color: "var(--tn-text)" }}>Spara system</h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--tn-text-dim)" }}>Systemnamn</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={100}
            style={inputStyle}
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1" style={{ color: "var(--tn-text-dim)" }}>Sällskap</label>
          {userGroups.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--tn-text-faint)" }}>
              Privat system (du är inte med i något sällskap ännu)
            </p>
          ) : (
            <select
              value={groupId ?? ''}
              onChange={e => setGroupId(e.target.value || null)}
              style={inputStyle}
            >
              <option value="">Privat — inget sällskap</option>
              {userGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="mb-4 text-sm" style={{ color: "var(--tn-text-faint)" }}>
          {totalRows} {totalRows === 1 ? 'rad' : 'rader'} &middot; {formatRowCost(totalRows, gameType ?? '')}
        </div>

        {!gameId && (
          <p className="mb-3 text-sm" style={{ color: "var(--tn-warn)" }}>Inget spel valt.</p>
        )}
        {error && (
          <p className="mb-3 text-sm" style={{ color: "var(--tn-value-low)" }}>{error}</p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={isPending}
            className="flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
            style={{ background: "var(--tn-bg-chip)", color: "var(--tn-text-dim)", border: "1px solid var(--tn-border)", cursor: "pointer" }}
          >
            Avbryt
          </button>
          <button
            onClick={handleSave}
            disabled={isPending || selections.length === 0 || !gameId}
            className="flex-1 px-4 py-2 text-sm font-bold rounded-lg transition-colors disabled:opacity-50"
            style={{ background: "var(--tn-accent)", color: "#fff", border: "none", cursor: "pointer" }}
          >
            {isPending ? 'Sparar...' : 'Spara system'}
          </button>
        </div>
      </div>
    </div>
  )
}
