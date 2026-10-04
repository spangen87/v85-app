/** "just nu", "12 min sedan", "3 tim sedan", "2 dagar sedan", annars datum. */
export function relativeTime(dateStr: string, now = Date.now()): string {
  const minutes = Math.floor((now - new Date(dateStr).getTime()) / 60_000);
  if (minutes < 1) return "just nu";
  if (minutes < 60) return `${minutes} min sedan`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} tim sedan`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} ${days === 1 ? "dag" : "dagar"} sedan`;
  return new Date(dateStr).toLocaleDateString("sv-SE");
}
