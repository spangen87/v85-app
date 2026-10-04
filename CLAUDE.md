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
npm run backtest # Kalibrera CS-vikter mot faktiska resultat (train/test, log-loss; kräver Supabase-env)
npm run recompute-formscore  # Räkna om lagrad CS och Grundchans för alla omgångar med aktuella vikter/modell (kräver Supabase-env)
                             # (kan även köras från /admin → "Räkna om alla CS-poäng")
npm run backfill-history     # Fyll i hästhistorik + resultat (km-tid) i efterhand för alla omgångar (kräver Supabase-env)
                             # --dry = torrkörning, --game <id> = en omgång. Kör recompute-formscore efteråt.
npm run fit-fundamental      # Tränar Grundchans på ett års ATG-data (cache i .cache/atg/). --write skriver lib/data/fundamental-model.json
npm run fit-calibrated       # Skattar vikterna för kalibrerad chans (streck/odds/Grundchans) på cachen, kronologiskt. --write skriver lib/data/calibrated-model.json
npm run backtest-optimizer   # Backtest av systemoptimeraren på cachen (träff, utdelning, kalibrering, märken). --out fil.md, --row-price V65=1
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
      [gameId]/results/     # POST → hämtar resultat (lib/results.ts)
    cron/
      results/              # GET (Vercel Cron, vercel.json) → nattlig resultathämtning, kräver CRON_SECRET
    horses/
      [horseId]/starts/     # GET → hämtar häststarter från ATG
  join/                     # Öppen sida för inbjudningslänk /join/[code]
  login/                    # Inloggning/registrering

components/
  ui/                       # Grundkomponenter från designsystemet (Button, Badge, StartNumber, Term, Sheet,
                            # PageHeader, GameSelect, EmptyState …)
  ManualContent.tsx         # Renderar MANUAL.md på /manual
  HorseDetail.tsx           # Hästens detaljvy (bedömning, signaler, starter, statistik); ?hast=<avd>-<nr>
  RaceTable.tsx             # Tabellvyn (f.d. analysverktyget)
  RaceToolbar.tsx           # Lista/Tabell, Sortera, Filter
  FetchButton.tsx           # Datumväljare + hämtningsknappar
  GameSelector.tsx          # Rullgardinsmeny för omgångsval
  BottomNav.tsx             # Mobil-nav: Lopp | System | Utvärdering | Sällskap (+ Admin)
  EvaluationPanel.tsx       # Utvärderingssida-innehåll
  AutoLoadUpcoming.tsx      # Laddar automatiskt kommande omgångar
  BulkResultsButton.tsx     # Hämtar resultat för flera omgångar
  GamePickerBar.tsx         # Spelpickerbar (välj spel i toppnavigering)
  MainPageClient.tsx        # Client-wrapper för startsidan
  NavActiveLink.tsx         # Aktiv länkindikator i navigering
  RaceList.tsx              # Lista med avdelningar och starter
  RaceTabContext.tsx        # Context för aktiv avdelningsflik
  ResultsButton.tsx         # Knapp för att hämta loppresultat
  SaveSystemDialog.tsx      # Dialog för att spara spelsystem
  StartCountdown.tsx        # Nedräkning till start
  SystemOutcomeBanner.tsx   # "Resultaten är rättade"-banner på startsidan (systemutfall)
  SystemDrawer.tsx          # Drawer-panel för systemkonfiguration
  SystemSidebar.tsx         # Sidebar för systembyggaren
  OptimizerPanel.tsx        # Träffchans/värde och "Föreslå system" (bara admin, under utvärdering)
  SystemsPageClient.tsx     # Client-wrapper för systemsidan
  ThemeProvider.tsx         # Tema-provider (mörkt/ljust)
  ThemeToggle.tsx           # Mörkt/ljust tema-växlare
  TopNav.tsx                # Övre navigering (desktop)
  InstallPrompt.tsx         # PWA-installationsprompt
  NotificationToggle.tsx    # Slå på/av web push-notiser (på sällskapsöversikten)
  UsefulLinks.tsx           # Hjälplänkar
  admin/                    # Adminkomponenter
  notes/
    HorseNotes.tsx          # Toggle-knapp + anteckningslista per häst
    NoteForm.tsx            # Formulär: text + etikett + sällskapsval
    NoteItem.tsx            # Enskild anteckning med svar
    NoteLabel.tsx           # Etiketter: red|orange|yellow|green|blue|purple
  sallskap/
    TabBar.tsx              # Flikar: Forum | Anteckningar | Spel | Sällskapet (gemensam omgångsväljare)
    admin/AdminTab.tsx      # Inställningar (namn, ATG-lag, inbjudan, medlemmar)
    forum/ForumTab.tsx      # Omgångsbundet diskussionsforum
    notes/NotesTab.tsx      # Anteckningar per omgång i sällskapet
    spel/SpelTab.tsx        # Sällskapets system (rättade mot resultat) + liga + insatser
    spel/SystemCard.tsx     # Systemkort med score/8 och vinnarmarkeringar
    spel/LeagueTable.tsx    # Sällskapsligan: topplista över systemträffar per medlem
    spel/BetsSection.tsx    # Insatser per omgång + ROI per medlem
  groups/
    SallskapOverview.tsx    # /sallskap-sidans innehåll (sällskapslista, skapa/gå med, profil, logga ut)
    GroupActivitySection.tsx # "Nytt i dina sällskap" på startsidan (osedda händelser)
    GroupList.tsx           # Lista sällskap med länk in + kopierbar kod/länk
    CreateGroupForm.tsx     # Skapa nytt sällskap
    JoinGroupForm.tsx       # Gå med via kod
    UserMenu.tsx            # Profilmeny
    ProfileForm.tsx         # Byt visningsnamn

scripts/
  backtest-weights.ts       # Grid-söker CS-vikter mot lopp med facit, train/test + log-loss (npm run backtest)
  backfill-history.ts       # Efterkonstruerar historik + resultat för sparade omgångar (npm run backfill-history)
  fit-fundamental.ts        # Tränar Grundchans-modellen (npm run fit-fundamental)
  fit-calibrated.ts         # Skattar vikterna för kalibrerad chans (npm run fit-calibrated)
  backtest-optimizer.ts     # Validerar systemoptimeraren (npm run backtest-optimizer)
  shared/atgCache.ts        # Inläsning av .cache/atg + framåtrullande Grundchans (delas av skripten)
  shared/calibration.ts     # Kronologisk uppdelning och skattning av kalibrerad chans
  recompute-formscore.ts    # Räknar om lagrad CS med aktuella vikter (npm run recompute-formscore)

lib/
  format.ts                 # Formatering: 24,1 %, +4,2, 1.12,4, 41 200 kr
  glossary.ts               # Ordlistan — enda källan för förklaringar (Term, manualen)
  theme.ts                  # Temaval (ljust/mörkt/system) + skript mot blink
  nav.ts                    # Huvudmenyns flikar
  raceView.ts               # Rader, sortering, filter och ?hast= för loppvyn
  raceTypes.ts              # Starter/Race-typer för loppvyn
  horseDetail.ts            # Texter i detaljvyn (rang, varför, spår)
  prefs.ts / usePref.ts     # Sparade val per enhet (vy, sortering) med minne som reserv
  optimizerView.ts          # Texter för optimeraren ("1 på 89", spikens avvägning, standardbudget)
  draftAutosave.ts          # Autosparning av kupongen som utkast (ordning, generation, flush när sidan lämnas)
  relativeTime.ts           # "12 min sedan" för forum och anteckningar
  analysis.ts               # Hjälpformler (distanssignal, spårfaktor, tidsparsning)
  formscore.ts              # Composite Score: computeComponents + CS_WEIGHTS
  skrall.ts                 # Skrällkandidat-signal (låg streck + odds/streck-diskrepans + klass)
  edge.ts                   # Tysta signaler/kantpoäng (barfota-byte, toppkusk, formtrend, uppehåll)
  probability.ts            # Kalibrerad vinstsannolikhet (50% streck + 50% odds, BLEND_ALPHA) — Chans i loppvyn
  calibrated.ts             # Kalibrerad chans för optimeraren: softmax(a·log streck + b·log oddsP + c·log grund), läge per lopp
  optimizer.ts              # Systemoptimerare: systemMetrics, optimizeSystem, proposeSystems (rena funktioner)
  oddsSnapshots.ts          # Ögonblicksbilder av odds/streck vid hämtning (fel stoppar aldrig hämtningen)
  push.ts                   # Web push-utskick (sendPushToUsers, no-op utan VAPID-env)
  systems.ts                # gradeSystemsForGame (rättar system, returnerar notifierbara sällskap)
  results.ts                # fetchAndStoreResults (resultat → starters, rättning, notis) — knapp + cron
  evaluation.ts             # computeEvaluation: utvärderingsmått (CS + Grundchans)
  fundamental/              # Grundchans (odds-fri conditional logit)
    features.ts             # 33 faktorer, hastighetssiffra (banpar)
    model.ts                # standardisering, softmax, förklaringar (topReasons), Oense
    fit.ts                  # skattning (L-BFGS), mått, banpar-skattning
    atgAdapter.ts           # ATG-JSON → indata (träning)
    dbAdapter.ts            # DB-rader → indata, strukna hästar, computeFundamentalForRows
    recompute.ts            # vilka rader behöver nytt fundamental_p
  data/fundamental-model.json  # tränad modell (genereras av fit-fundamental)
  data/calibrated-model.json   # vikter för kalibrerad chans per läge (genereras av fit-calibrated)
  atg.ts                    # Typer för ATG-data (AvailableGame m.m.)
  types.ts                  # Delade TS-typer (Group, GroupMember, HorseNote, m.m.)
  supabase/                 # Supabase-klienter (server/browser)
  actions/
    activity.ts             # Aktivitetssignaler: getGroupActivity (React-cachad) + markGroupSeen
    outcome.ts              # Senaste rättade omgångens systemutfall (resultatbannern)
    push.ts                 # Server actions: spara/ta bort web push-prenumeration
    bets.ts                 # Server actions: insatser/ROI + addBetFromSystem (logga sparat system som spel)
    games.ts                # Server actions: spel
    groups.ts               # Server actions: skapa/lämna sällskap
    notes.ts                # Server actions: anteckningar + getNoteCountsForHorses (pratbubbla i loppvyn)
    posts.ts                # Server actions: foruminlägg + getGamePostSummary (forumlänk i loppvyn)
    sallskap.ts             # Server actions: sällskapsdata
    systems.ts              # Server actions: spelsystem (game_systems, drafts)
    tracks.ts               # Server actions: bandata/TrackConfig

supabase/
  schema.sql                # Komplett databasschema
  migration_v*.sql          # Migrationer i ordning
```

---

## Datamodell (kortfattad)

**games** – hämtade omgångar (id, game_type, date, track)
**races** – avdelningar kopplade till game (race_number, distance, start_method, first_prize, breed)
**starters** – hästar per avdelning (odds, formscore, fundamental_p, start_distance, start_points, finish_position, m.m.)
**horses** – hästar (id = ATG horse_id, name)
**profiles** – användarprofiler (id = auth.uid, display_name)
**groups** – sällskap (name, invite_code, created_by, atg_team_url)
**group_members** – koppling användare↔sällskap
**horse_notes** – anteckningar (horse_id, group_id nullable, label, parent_id)
**group_posts** – foruminlägg (group_id, game_id, parent_id)
**bets** – insatser per omgång (game_id, user_id, stake, payout, system_id nullable → koppling till spelat system)
**game_systems** – sparade spelsystem (name, game_id, selections)
**drafts** – utkast till spelsystem
**track_configs** – banspecifik konfiguration (open_stretch, short_race_threshold)
**group_last_seen** – när användare senast besökte ett sällskap (aktivitetsbadges)
**push_subscriptions** – web push-prenumerationer per enhet (endpoint, p256dh, auth)
**odds_snapshots** – odds och streck per start vid varje hämtning (game_id, race_id, race_number, start_number, horse_id, odds, bet_distribution, captured_at); ingen FK mot races

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
Häst markeras som "Värde" om CS > 55 och kalibrerad chans > streckning.
CS rankar fältet; den kalibrerade sannolikheten (se nedan) är värdemåttet.

### Grundchans (odds-fri) – `lib/fundamental/`
Conditional logit (Bolton & Chapman 1986, Benter 1994) på 33 faktorer som
z-poängsätts inom fältet: `p_i = softmax(Σ β_k·z_ik)`. Använder **aldrig**
odds/streck (bara för att känna igen strukna hästar). Hastighetssiffra =
−(km-tid − banpar[ras, bana, startmetod, distans] − underlag). Vikter och banpar i
`lib/data/fundamental-model.json`, tränas med `npm run fit-fundamental` (vägrar
skriva om test-pseudo-R² < 0,19). Loppvyn räknar live; `starters.fundamental_p`
sparas vid hämtning/omräkning för utvärderingssidan. Bakgrund: issue #93.

### Kalibrerad vinstsannolikhet – `lib/probability.ts → computeWinProbabilities()`
Blandning `p = α·streck_norm + (1−α)·odds_norm` med `BLEND_ALPHA = 0.5`,
normaliserad så fältet summerar till 1. Backtest mot 221 lopp (2026-06-13) gav
lägst log-loss vid α≈0.5 (1.58 mot 1.62 för rent streck/odds). Faller tillbaka
på enbart streck (innan pool öppnat: enbart odds). Beräknas i `lib/raceView.ts` (strukna hästar
exkluderas) och visas som Chans; Värde = chans − streck.

### Kalibrerad chans (optimeraren) – `lib/calibrated.ts → computeCalibratedChance()`
Benters tvåsteg: `p_i = softmax(a·log streck_i + b·log oddsP_i + c·log grund_i)`, där varje
signal normaliseras inom fältet och golvas (0,001). Läget väljs per lopp efter vilka data som
finns (`full`, `noOdds` före vinnarpoolen, `grundOnly` före V-poolen m.fl.), med egna vikter
per läge i `lib/data/calibrated-model.json` (full ≈ 0,18/0,85/0,09). Skattas med
`npm run fit-calibrated` (kronologiskt, framåtrullande Grundchans). `calibratedForRace(race)`
räknar strukna hästar och Grundchans som loppvyn. Påverkar inte Chans i loppvyn.

### Systemoptimerare – `lib/optimizer.ts`
`systemMetrics` ger P(alla rätt) (`p8`), P(alla utom en) (`p7`), värdeindex
Π medel(chans/streck), täckning per avdelning, chansen att alla spikar håller och avvägningen
per spik. `optimizeSystem` ordnar hästarna efter `p·r^λ`, prövar prefix topp 1–8 och söker
exakt (dynamisk programmering över rader och spikar) maximum av `log P + λ·log värdeindex`
inom budget och spikvillkor (spik kräver `MIN_SPIKE_CHANCE` = 35 %, låst spik undantagen).
Stöder lås (in/ut/spik) och egna bedömningar. `proposeSystems` ger Max chans / Balans / Värde
(λ = 0 / 0,3 / 0,6). Backtest: `docs/superpowers/reports/2026-10-04-backtest-optimerare.md`.

### Tabellvyn – `components/RaceTable.tsx`
Loppvyn växlar mellan Lista (hästrader) och Tabell. Tabellen visar Häst, Chans, Streck,
Odds, Värde, Grund och Märke (från md även Senaste 5); "Visa alla kolumner" lägger till
CS, Distans, Spår och Resultat. Rader, sortering och filter kommer från `lib/raceView.ts`
(samma för lista, tabell och detaljvy). Kolumnrubrikerna är `<Term>` från ordlistan.

### Skrällkandidat – `lib/skrall.ts → computeSkrallSignals()`
Häst flaggas som skrällkandidat när alla tre villkor uppfylls (trösklar i
`SKRALL_THRESHOLDS`): streck < 15 %, odds-implicit sannolikhet minst 5
procentenheter över strecket, samt topp-3 i fältet på intjänat per start.
Beräknas client-side på hela startfältet (`lib/raceView.ts` → lista, tabell, detaljvy).
Trösklarna kommer från databasanalys 2026-06-12 (155 lopp med facit).

### Tysta signaler / kantpoäng – `lib/edge.ts → computeEdgeSignals()`
Signaler som inte syns i odds/streck: barfota-byte (+2 runt om, +1 fram/bak,
−1 skor på), toppkusk (topp-2 i fältet på vinstprocent, minst 15 %, +1),
formtrend från last_5 (senaste 2 vs äldre, ±1) och uppehåll > 60 dagar (−1).
Trösklar i `EDGE_THRESHOLDS`. Kantpoäng = summan; ≥ +2 flaggas (`isEdge`).
Beräknas client-side på hela fältet (`lib/raceView.ts` → lista, tabell, detaljvy) och
påverkar inte CS eller kalibrerad sannolikhet — ett kvalitativt lager ovanpå.

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
- **MANUAL.md uppdateras ALLTID** när funktionalitet som syns för användaren
  ändras (nya funktioner, ändrade formler/vikter, flyttade knappar, borttagna
  vyer). Manualsidan (`/manual`) renderar filen direkt, så inaktuell text syns
  omedelbart för användarna. Stäm av berörda avsnitt mot komponenterna innan
  arbetet avslutas.
- Supabase-klienten skiljer på `createClient` (browser) och `createServerClient` (server/actions).
- All text i UI är på **svenska**.
- Teman: följer systemet; eget val (ljust/mörkt) sparas i localStorage via `ThemeToggle` under Sällskap → Utseende och i TopNav.
- **Designsystem:** tokens och komponenter kommer från designsystemet i Claude Design (https://claude.ai/artifact/5KsW2p1tV4vxod4bNTg1Mz).
  Ritytor: nyckelvyer https://claude.ai/artifact/UVCKQANpMwDrUqfWhFFFXn, övriga vyer (Utvärdering, Sällskap, Mina system) https://claude.ai/artifact/UsTtteTSw4VWXyWjo2W53i.
  Sidor byggs av `PageHeader`, `ta-page`, `ta-section`, `ta-card` och `EmptyState`; inga emojis och inga trafikljusfärger. Nya komponenter använder tokens som `--ink`, `--surface`, `--accent` — aldrig `--tn-*` (alias för gamla sidor).
- **Förklaringar:** alla mått förklaras med `<Term term="…">` från `lib/glossary.ts`. Ändra texten där och under "Ordlista" i MANUAL.md samtidigt. Inga `title=`-tooltips.
- Mobil-navigation via `BottomNav` (fast, döljs på md+).
- Sortering och filter ligger i blad (`Sheet`) bakom knapparna Sortera och Filter (`RaceToolbar`).
- **Web push** kräver tre miljövariabler (genereras med `npx web-push generate-vapid-keys`):
  `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (mailto:/URL).
  Saknas de är push helt avstängt — `NotificationToggle` döljs och `sendPushToUsers`
  blir en no-op. Resultatnotisen skickas från `lib/results.ts` (resultatknappen och cron-jobbet).
- **Nattlig resultathämtning**: Vercel Cron (`vercel.json`) anropar `/api/cron/results` kl. 22 UTC.
  Kräver miljövariabeln `CRON_SECRET` (Vercel skickar den som Bearer-token); `/api/cron` är
  undantaget från inloggningskravet i `proxy.ts`.
- **ATG-historik** hämtas per avdelning via `/races/{atg_race_id}/extended` (`fetchRaceHistories`).
  Vårt lopp-id går inte att översätta till ATG:s (V86 går på två banor) — använd `resolveAtgRaceId`.

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
| Nytt fält i detaljvyn | `components/HorseDetail.tsx`, `lib/raceView.ts`, `supabase/schema.sql` + migration |
| Ny sida | `app/(authenticated)/[sida]/page.tsx`, `components/BottomNav.tsx` |
| Nytt sällskapsfunktion | `lib/actions/sallskap.ts`, `components/sallskap/` |
| Databasändring | Lägg till migration i `supabase/migration_v<N>_<namn>.sql` |
| Uppdatera manualen | `MANUAL.md` |
| Ny systemfunktion | `lib/actions/systems.ts`, `components/SystemSidebar.tsx`, `SystemDrawer.tsx` |
| Banspecifik konfiguration | `lib/actions/tracks.ts`, `supabase/migration_v9_track_configs.sql` |
