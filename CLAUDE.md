# CLAUDE.md – Projektöversikt för v85-app

## Projektbeskrivning

Next.js 16 + React 19 + TypeScript-app för analys av ATG-travspel (V85 m.fl.).
Databasen är Supabase (PostgreSQL). Styling med Tailwind CSS v4. PWA via Serwist.

---

## Teknikstack

| Del | Val |
|-----|-----|
| Framework | Next.js 16 (App Router) |
| Språk | TypeScript 5 |
| UI | Tailwind CSS v4 |
| Databas | Supabase (PostgreSQL + Row Level Security) |
| Auth | Supabase Auth (e-post/lösenord) |
| PWA | Serwist / @serwist/next |
| Tester | Jest + ts-jest |
| Linter | ESLint (eslint-config-next) |

---

## Kommandon

```bash
npm run dev      # Starta dev-server
npm run build    # Produktionsbygge
npm run lint     # ESLint
npx jest         # Kör tester (lib/__tests__/)
npm run backtest # Kalibrera CS-vikter mot faktiska resultat (kräver Supabase-env)
```

---

## Katalogstruktur

```
app/
  (authenticated)/          # Skyddade sidor (kräver inloggning)
    layout.tsx              # Lägger till BottomNav + InstallPrompt
    page.tsx                # Startsida: omgångslista, hästkort, Top 5
    admin/                  # Adminsida
    evaluation/             # Utvärderingssida (systemets träffsäkerhet)
    manual/                 # Manualsida (renderar MANUAL.md)
    sallskap/               # Sällskapssidor
    system/                 # Spelsystem-sida (bygga/spara system)
  api/
    games/
      available/            # GET ?date=YYYY-MM-DD → tillgängliga ATG-spel
      fetch/                # POST { gameType, gameId } → hämtar omgång från ATG
      upcoming/             # GET → kommande ATG-spel (används av AutoLoadUpcoming)
      [gameId]/             # GET → hämtar sparad omgång
    horses/
      [horseId]/starts/     # GET → hämtar häststarter från ATG
  join/                     # Öppen sida för inbjudningslänk /join/[code]
  login/                    # Inloggning/registrering

components/
  HorseCard.tsx             # Hästkort (inline FS/CS, expanderbar detaljvy)
  AnalysisPanel.tsx         # Analysverktyget (2 delar: matematisk + utökad)
  TopFiveRanking.tsx        # Top 5 widget baserat på CS
  FetchButton.tsx           # Datumväljare + hämtningsknappar
  CollapsibleControls.tsx   # Sortering/filter/sök (kollapsibel på mobil)
  GameSelector.tsx          # Rullgardinsmeny för omgångsval
  BottomNav.tsx             # Mobil-nav: Analys | Utvärdering | Manual
  EvaluationPanel.tsx       # Utvärderingssida-innehåll
  AutoLoadUpcoming.tsx      # Laddar automatiskt kommande omgångar
  BulkResultsButton.tsx     # Hämtar resultat för flera omgångar
  GamePickerBar.tsx         # Spelpickerbar (välj spel i toppnavigering)
  MainPageClient.tsx        # Client-wrapper för startsidan
  NavActiveLink.tsx         # Aktiv länkindikator i navigering
  RaceList.tsx              # Lista med avdelningar och starter
  RaceTabBar.tsx            # Flikar per avdelning
  RaceTabContext.tsx        # Context för aktiv avdelningsflik
  ResultsButton.tsx         # Knapp för att hämta loppresultat
  SaveSystemDialog.tsx      # Dialog för att spara spelsystem
  StartCountdown.tsx        # Nedräkning till start
  SystemDrawer.tsx          # Drawer-panel för systemkonfiguration
  SystemSidebar.tsx         # Sidebar för systembyggaren
  SystemsPageClient.tsx     # Client-wrapper för systemsidan
  ThemeProvider.tsx         # Tema-provider (mörkt/ljust)
  ThemeToggle.tsx           # Mörkt/ljust tema-växlare
  TopNav.tsx                # Övre navigering (desktop)
  InstallPrompt.tsx         # PWA-installationsprompt
  UsefulLinks.tsx           # Hjälplänkar
  admin/                    # Adminkomponenter
  notes/
    HorseNotes.tsx          # Toggle-knapp + anteckningslista per häst
    NoteForm.tsx            # Formulär: text + etikett + sällskapsval
    NoteItem.tsx            # Enskild anteckning med svar
    NoteLabel.tsx           # Etiketter: red|orange|yellow|green|blue|purple
  sallskap/
    TabBar.tsx              # Flikar: Forum | Anteckn. | Spel | Sällskap
    admin/AdminTab.tsx      # Inställningar (namn, ATG-lag, inbjudan, medlemmar)
    forum/ForumTab.tsx      # Omgångsbundet diskussionsforum
    notes/NotesTab.tsx      # Anteckningar per omgång i sällskapet
    spel/SpelTab.tsx        # Sällskapets system (rättade mot resultat) + insatser
    spel/SystemCard.tsx     # Systemkort med score/8 och vinnarmarkeringar
    spel/BetsSection.tsx    # Insatser per omgång + ROI per medlem
  groups/
    GroupList.tsx           # Lista sällskap med kopierbar kod/länk
    CreateGroupForm.tsx     # Skapa nytt sällskap
    JoinGroupForm.tsx       # Gå med via kod
    UserMenu.tsx            # Profilmeny
    ProfileForm.tsx         # Byt visningsnamn

scripts/
  backtest-weights.ts       # Grid-söker CS-vikter mot lopp med facit (npm run backtest)

lib/
  analysis.ts               # Hjälpformler (distanssignal, spårfaktor, tidsparsning)
  formscore.ts              # Composite Score: computeComponents + CS_WEIGHTS
  skrall.ts                 # Skrällkandidat-signal (låg streck + odds/streck-diskrepans + klass)
  atg.ts                    # Typer för ATG-data (AvailableGame m.m.)
  types.ts                  # Delade TS-typer (Group, GroupMember, HorseNote, m.m.)
  supabase/                 # Supabase-klienter (server/browser)
  actions/
    bets.ts                 # Server actions: spelförslag/bets
    games.ts                # Server actions: spel
    groups.ts               # Server actions: skapa/lämna sällskap
    notes.ts                # Server actions: hämta/skapa/ta bort anteckningar
    posts.ts                # Server actions: foruminlägg
    sallskap.ts             # Server actions: sällskapsdata
    systems.ts              # Server actions: spelsystem (game_systems, drafts)
    tracks.ts               # Server actions: bandata/TrackConfig

supabase/
  schema.sql                # Komplett databasschema
  migration_v*.sql          # Migrationer i ordning
```

---

## Datamodell (kortfattad)

**games** – hämtade omgångar (id, game_type, date, track, raw_data)
**races** – avdelningar kopplade till game (race_number, distance, start_method)
**starters** – hästar per avdelning (odds, formscore, finish_position, m.m.)
**horses** – hästar (id = ATG horse_id, name)
**profiles** – användarprofiler (id = auth.uid, display_name)
**groups** – sällskap (name, invite_code, created_by, atg_team_url)
**group_members** – koppling användare↔sällskap
**horse_notes** – anteckningar (horse_id, group_id nullable, label, parent_id)
**group_posts** – foruminlägg (group_id, game_id, parent_id)
**bets** – spelförslag per omgång (game_id, user_id, horse selections)
**game_systems** – sparade spelsystem (name, game_id, selections)
**drafts** – utkast till spelsystem
**track_configs** – banspecifik konfiguration (open_stretch, short_race_threshold)

---

## Nyckelalgorithmer

### Composite Score (CS, 0–100) – `lib/formscore.ts → calculateCompositeScore()`
```
CS = 55% streckning + 20% distansrekord + 10% odds + 10% konsistens + 5% form
```
Vikterna definieras i `CS_WEIGHTS` och delkomponenterna beräknas i
`computeComponents()` (normaliserade 0–1 inom fältet). CS beräknas vid
omgångshämtning och lagras i kolumnen `starters.formscore`. Vikterna kalibreras
mot faktiska resultat med `npm run backtest` (scripts/backtest-weights.ts).
Vinstprocent, tid, spårfaktor, kuskform och galopprisk har för närvarande vikt 0
men beräknas och visas fortfarande i UI.
Häst markeras som "Värde" om CS > 55 och värdeindex > 0.

### Analysverktyget – `components/AnalysisPanel.tsx`
Visar per häst: CS-andel av fältet, spelvärde (CS-andel − streckning%),
distanssignal och spårfaktor (inkl. banspecifik justering från `track_configs`).

### Skrällkandidat – `lib/skrall.ts → computeSkrallSignals()`
Häst flaggas som skrällkandidat när alla tre villkor uppfylls (trösklar i
`SKRALL_THRESHOLDS`): streck < 15 %, odds-implicit sannolikhet minst 5
procentenheter över strecket, samt topp-3 i fältet på intjänat per start.
Beräknas client-side på hela startfältet (RaceList → HorseCard/AnalysisPanel).
Trösklarna kommer från databasanalys 2026-06-12 (155 lopp med facit).

### Distansfaktor
| Situation | Faktor |
|-----------|--------|
| Vunnit, exakt distans+metod | ×1.35 |
| Placerat, exakt | ×1.10 |
| Sprungit utan placering, exakt | ×0.90 |
| Vunnit, annan startmetod | ×1.20 |
| Placerat, annan startmetod | ×1.05 |
| Sprungit, annan startmetod | ×0.85 |
| Aldrig sprungit på distansen | ×0.60 |

---

## Konventioner

- **Server Actions** används för alla databasoperationer (i `lib/actions/`).
- **Route Handlers** (API) används för externa anrop till ATG (`app/api/`).
- Supabase-klienten skiljer på `createClient` (browser) och `createServerClient` (server/actions).
- All text i UI är på **svenska**.
- Teman: mörkt/ljust via `ThemeProvider` + `ThemeToggle` (localStorage).
- Mobil-navigation via `BottomNav` (fast, döljs på md+).
- Kontroller (sortering/filter) är kollapsibla på mobil via `CollapsibleControls`.

---

## Git-branch-konvention

Arbeta alltid på branch `claude/<beskrivning>-<session-id>`.
Pusha med `git push -u origin <branch>`.

---

## Filer att känna till vid ändringar

| Ändring | Relevanta filer |
|---------|----------------|
| Ny speltyp (utöver V85) | `app/api/games/fetch/route.ts`, `lib/atg.ts` |
| Ändra analysformler | `lib/analysis.ts`, `lib/formscore.ts` |
| Nytt fält på hästkort | `components/HorseCard.tsx`, `supabase/schema.sql` + migration |
| Ny sida | `app/(authenticated)/[sida]/page.tsx`, `components/BottomNav.tsx` |
| Nytt sällskapsfunktion | `lib/actions/sallskap.ts`, `components/sallskap/` |
| Databasändring | Lägg till migration i `supabase/migration_v<N>_<namn>.sql` |
| Uppdatera manualen | `MANUAL.md` |
| Ny systemfunktion | `lib/actions/systems.ts`, `components/SystemSidebar.tsx`, `SystemDrawer.tsx` |
| Banspecifik konfiguration | `lib/actions/tracks.ts`, `supabase/migration_v9_track_configs.sql` |
