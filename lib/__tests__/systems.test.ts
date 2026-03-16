import { isWinningHorse } from '../systemsHelpers'

describe('isWinningHorse', () => {
  it('returnerar true när horse_id matchar vinnaren för avdelningen', () => {
    const winners: Record<number, string> = { 1: 'horse-abc', 2: 'horse-xyz' }
    expect(isWinningHorse(winners, 1, 'horse-abc')).toBe(true)
  })

  it('returnerar false när horse_id inte matchar vinnaren', () => {
    const winners: Record<number, string> = { 1: 'horse-abc' }
    expect(isWinningHorse(winners, 1, 'horse-other')).toBe(false)
  })

  it('returnerar false när avdelningen saknas i winners', () => {
    const winners: Record<number, string> = {}
    expect(isWinningHorse(winners, 3, 'horse-abc')).toBe(false)
  })

  it('returnerar false när winners är undefined', () => {
    expect(isWinningHorse(undefined, 1, 'horse-abc')).toBe(false)
  })
})
