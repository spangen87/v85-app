# Design: System-UX – Hitta och visa sparade system

**Datum:** 2026-03-16
**Branch:** 31-spara-siitt-system

---

## Bakgrund och problem

Efter att en användare sparat ett system försvinner det tyst — dialogen stänger och systemläget återställs utan någon indikation om var systemet hamnade. Dessutom:

- Privata system (sparade utan sällskap) saknar helt en vy i UI:t. `getUserSystemsForGame()` finns i actions men anropas aldrig.
- Sällskapssystem finns i Spel-fliken under respektive sällskap, men det är inte uppenbart att man ska leta där.
- Det finns inget samlat ställe att se alla sina system — privata och sällskapssystem — på samma gång.

---

## Godkänd design

### 1. Ny "System"-flik i bottennavet

Bottennavet utökas från 3 till 4 flikar:

```
Analys | Utvärdering | System | Manual
```

**Ny sida:** `app/(authenticated)/system/page.tsx`
**Route:** `/system` (bekräftat — matchar inte befintliga routes)

Sidan visar alla system kopplade till inloggad användare för valt spel:
- Egna privata system (`group_id IS NULL`)
- System sparade i alla sällskap användaren tillhör (dvs. även andras)

Sortering: egna system först, sedan andras sorterade per sällskap (`group_name` A–Ö), sedan kronologiskt (`created_at` desc) inom samma sällskap.

**Empty state:** Om `games` är tom visas: "Ingen omgång inladdad ännu. Gå till Analys-fliken för att hämta ett spel."

### 2. Omgångsväljare på System-sidan

En `<select>` längst upp på sidan med alla tillgängliga spel (samma lista som `GameSelector` på startsidan). Byter man spel laddas systemen om via Server Action `getSystemsForUser(gameId)`.

### 3. SystemCard — privat/sällskap-bricka

Varje SystemCard visar en bricka uppe till höger:

| Typ | Bricka |
|-----|--------|
| Privat system | `🔒 Privat` (grå, `bg-gray-100 text-gray-700`) |
| Sällskapssystem | `👥 [Sällskapsnamn]` (blå, `bg-blue-100 text-blue-700`) |

Sällskapsnamnet hämtas via Supabase embedded select: `.select('*, groups(name)')`, se dataflöde nedan.

### 4. SystemCard — resultatvy med gröna cirklar

När ett systems spel har resultat (`is_graded = true`) visas varje häst i kvittoformatet som en cirkel:

- **Grön cirkel** (`border: 2.5px solid #16a34a`, bakgrund `#f0fdf4`): hästen vann avdelningen
- **Grå siffra** (ingen cirkel, dämpad färg): hästen åkte ut
- **Svart siffra** (neutral): avdelningen är inte avgjord ännu

Poängbadgen (`3/8`) visas i grönt uppe till höger på kortet.

`SystemCard` tar emot en optional prop `winnersByRace: Map<number, string>` (race_number → horse_id). Jämförelse: `horse.horse_id === winnersByRace.get(sel.race_number)`. Om `winnersByRace` är undefined (inget resultat laddat) renderas alla siffror i neutralt svart.

### 5. Success-toast efter sparning

När användaren sparar ett system i `SaveSystemDialog` visas en inline-bekräftelse i dialogens body (istället för att stänga direkt). `gameId` är garanterat icke-null när detta visas — spara-knappen är disabled om `gameId` är null.

```
✅ System sparat!
"Mitt system" — 6 rader · 60 kr
[Gå till System →]   [Stäng]
```

"Gå till System →" navigerar till `/system?game=<gameId>` med `router.push()`.
"Stäng" återgår till startsidan med systemläget avaktiverat.

---

## Dataflöde

### Befintlig action `getUserSystemsForGame` — behålls oförändrad

`getUserSystemsForGame(gameId)` i `lib/actions/systems.ts` (rad 74) hämtar endast den inloggade användarens egna system. Den används **inte** på den nya System-sidan, men behålls för eventuell framtida användning.

### Ny Server Action: `getSystemsForUser(gameId)`

Hämtar alla system (privata + alla sällskap) för inloggad användare för ett givet spel:

```ts
// lib/actions/systems.ts
export async function getSystemsForUser(gameId: string): Promise<GameSystem[]>
```

Implementationslogik:
1. Hämta `user_id` via `supabase.auth.getUser()`
2. Hämta alla `group_id` användaren är med i via `group_members`
3. Kör en Supabase-query med embedded select:
   ```ts
   supabase
     .from('game_systems')
     .select('*, groups(name)')
     .eq('game_id', gameId)
     .or(`user_id.eq.${userId},group_id.in.(${groupIds.join(',')})`)
   ```
4. Reshapa svaret: `row.groups?.name ?? null` → `group_name`
5. Hämta `author_display_name` via befintlig `fetchDisplayNames()`-hjälpfunktion

Intermediärtyp för TypeScript-säkerhet (mönstret finns redan i `getGroupSystems`):
```ts
type RawSystemWithGroup = Omit<GameSystem, 'author_display_name' | 'group_name'> & {
  groups: { name: string } | null
}
```

### Ny Server Action: `getWinnersForGame(gameId)`

Hämtar vinnarhästar per avdelning för ett givet spel:

```ts
// lib/actions/systems.ts
export async function getWinnersForGame(gameId: string): Promise<Map<number, string>>
```

Hämtar `starters.horse_id, starters.finish_position, races.race_number` JOIN `races.game_id = gameId` där `finish_position = 1`. Returnerar `Map<race_number, horse_id>`.

På System-sidan (Server Component): om det finns system med `is_graded = true` för valt spel, anropas `getWinnersForGame(gameId)` och `winnersByRace`-mappen skickas som prop till `SystemsPageClient`.

### Utökat `GameSystem`-typ

```ts
export interface GameSystem {
  // …befintliga fält…
  group_name: string | null  // null = privat system
}
```

---

## Komponentstrategi: SystemCard

Befintlig `components/sallskap/spel/SystemCard.tsx` utökas med:
- Prop `group_name: string | null` (för privat/sällskap-bricka)
- Prop `winnersByRace?: Map<number, string>` (för gröna cirklar)

**Ingen ny SystemCard-fil skapas.** Den befintliga komponenten används av både `SpelTab` och den nya `SystemsPageClient`. `SpelTab` skickar `group_name` från det sällskap den redan känner till.

---

## Berörda filer

| Fil | Förändring |
|-----|-----------|
| `components/BottomNav.tsx` | Lägg till System-flik med href `/system` |
| `app/(authenticated)/system/page.tsx` | Ny sida (Server Component) — hämtar spel, system, vinnare |
| `components/SystemsPageClient.tsx` | Ny klientkomponent med omgångsväljare + lista |
| `components/sallskap/spel/SystemCard.tsx` | Lägg till `group_name`-prop (bricka) + `winnersByRace`-prop (gröna cirklar) |
| `components/sallskap/spel/SpelTab.tsx` | Skicka `group_name` (sällskapets namn) till `SystemCard` |
| `lib/actions/systems.ts → getGroupSystems` | Uppdatera till embedded select `*, groups(name)` så `group_name` kan skickas vidare |
| `components/SaveSystemDialog.tsx` | Success-state med toast + "Gå till System"-länk |
| `lib/actions/systems.ts` | Ny `getSystemsForUser()` + `getWinnersForGame()` |
| `lib/types.ts` | `group_name: string | null` på `GameSystem` |

---

## Ej i scope

- Graderingslogiken (sätta `is_graded`, `score`) ändras inte — det hanteras av befintlig results-route.
- `SpelTab` i sällskapet behålls (group-specific view lever kvar), men uppdateras att skicka `group_name` till `SystemCard`.
- Ingen pagination — systemlistan förväntas vara kort per omgång.
- `score`-constraints i DB-schemat är hårdkodat för V85 (0–8). Andra speltyper (V64 etc.) hanteras inte inom ramen för denna spec.
