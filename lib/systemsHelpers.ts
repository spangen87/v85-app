export function isWinningHorse(
  winners: Record<number, string> | undefined,
  raceNumber: number,
  horseId: string
): boolean {
  if (!winners) return false
  return winners[raceNumber] === horseId
}
