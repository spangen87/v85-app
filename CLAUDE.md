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
```

---

## Katalogstruktur

```
app/
  (authenticated)/          # Skyddade sidor (kräver inloggning)
    layout.tsx              # Lägger till BottomNav + InstallPrompt
    page.tsx                # Startsida: omgångslista, hästkort, Top 5
    evaluation/             # Utvärderingssida (systemets träffsäkerhet)
    manual/                 # Manualsida (renderar MANUAL.md)
    sallskap/               # Sällskapssidor
    groups.ts               # (äldre, ev. under avveckling)
  api/
    games/
      available/            # GET ?date=YYYY-MM-DD → tillgängliga ATG-spel
      fetch/                # POST { gameType, gameId } → hämtar omgång från ATG
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
  ResultsButton.tsx         # Knapp för att hämta loppresultat
  ThemeToggle.tsx           # Mörkt/ljust tema
  InstallPrompt.tsx         # PWA-installationsprompt
  notes/
    HorseNotes.tsx          # Toggle-knapp + anteckningslista per häst
    NoteForm.tsx            # Formulär: text + etikett + sällskapsval
    NoteItem.tsx            # Enskild anteckning med svar
    NoteLabel.tsx           # Etiketter: red|orange|yellow|green|blue|purple
  sallskap/
    TabBar.tsx              # Flikar: Forum | Anteckningar | Sällskap
    admin/AdminTab.tsx      # Inställningar (namn, ATG-lag, inbjudan, medlemmar)
    forum/ForumTab.tsx      # Omgångsbundet diskussionsforum
    notes/NotesTab.tsx      # Anteckningar per omgång i sällskapet
  groups/
    GroupList.tsx           # Lista sällskap med kopierbar kod/länk
    CreateGroupForm.tsx     # Skapa nytt sällskap
    JoinGroupForm.tsx       # Gå med via kod
    UserMenu.tsx            # Profilmeny
    ProfileForm.tsx         # Byt visningsnamn

lib/
  analysis.ts               # Analysformler (FS, CS, distansfaktor, värdeindex)
  formscore.ts              # Beräkning av Formscore
  atg.ts                    # Typer för ATG-data (AvailableGame m.m.)
  types.ts                  # Delade TS-typer (Group, GroupMember, HorseNote, m.m.)
  supabase/                 # Supabase-klienter (server/browser)
  actions/
    groups.ts               # Server actions: skapa/lämna sällskap
    notes.ts                # Server actions: hämta/skapa/ta bort anteckningar
    posts.ts                # Server actions: foruminlägg
    sallskap.ts             # Server actions: sällskapsdata

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

---

## Nyckelalgorithmer

### Formscore (FS, 0–100) – `lib/formscore.ts`
- 40% senaste form (last_5_results)
- 20% vinstprocent innevarande år (föregående år kompletterar vid <5 starter)
- 20% odds-index relativt fältet
- 20% bästa tid relativt fältet

### Matematisk analys – `lib/analysis.ts → analyzeRace()`
```
baspoäng = 40% karriärvinst-% + 40% senaste form-% + 20% odds-implicit
slutpoäng = baspoäng × distansfaktor (×0.6–×1.35)
spelvärde = beräknad chans − streckning%
```

### Utökad analys / Composite Score (CS) – `lib/analysis.ts → analyzeRaceEnhanced()`
```
CS = 35% form + 25% värdeindex + 25% konsistens + 10% tidsjustering + 5% spårfaktor
```
Häst markeras som "Värde" om CS > 55 och värdeindex > 0.

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
