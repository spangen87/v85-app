# Design: Systembyggar-sidebar & kupongöversikt

**Datum:** 2026-03-26
**Branch:** 35-uppdatera-ui-så-det-är-mer-enhetligt-och-cleant

---

## Bakgrund

När systemläget aktiveras visas idag en sticky banner med `bottom-16` på **alla** skärmstorlekar. Det gör att den flyter upp från kanten på desktop (där BottomNav saknas). Dessutom saknas en bra överblick över valda hästar — man behöver scrolla igenom alla hästkort för att se vad man valt.

---

## Lösning

### Desktop (≥ md)

En **fast sidopanel** (320px) visas till höger om löplistan när systemläget är aktivt. Den ersätter den fasta bottenbannern på desktop.

- Visar varje avdelning med **alla** hästar som klickbara cirklar (26px, same style som hästkorten: emerald + ring = vald, grå = ej vald)
- Klick i panelen är identiskt med klick i hästkortet — delar samma `onToggleHorse`-callback
- Footer visar rad-antal, kostnad, Spara-knapp och "Avbryt systemläge"-länk
- Scroll inuti panelen om alla raser + hästar inte ryms

### Mobil (< md)

- En **sticky banner** längst ner mot kanten (`bottom-16`, ovanför BottomNav) med sammanfattning (avd klara · rader · kostnad)
- Klick på bannern öppnar en **slide-up drawer** (halvskärm) med samma häst-cirklar som sidopanelen
- Drawern stängs med ✕-knapp eller klick på bakgrunden (backdrop)

### Banner-fix

Den befintliga `SystemStatusBar` (`fixed bottom-16`) byts till `bottom-16 md:hidden` — dold på desktop, kvar på mobil. Sidopanelen hanterar desktop.

---

## Komponenter

### Ny: `components/SystemSidebar.tsx`

```ts
// Race-typen = ComponentProps<typeof RaceList>['races'][number]
interface SystemSidebarProps {
  races: ComponentProps<typeof RaceList>['races']  // alla avdelningar med starters
  selections: SystemSelection[]
  onToggleHorse: (raceNumber: number, horse: SystemHorse) => void
  onSave: () => void
  onCancel: () => void
  totalRows: number
  gameType: string | null
}
```

Renderar (desktop, `hidden md:flex`):
- Scrollbar races-lista med cirklar per avdelning
- Footer: rader, kostnad (`formatRowCost`), Spara-knapp, Avbryt-länk

### Ny: `components/SystemDrawer.tsx`

```ts
interface SystemDrawerProps {
  open: boolean
  onClose: () => void
  races: ComponentProps<typeof RaceList>['races']
  selections: SystemSelection[]
  onToggleHorse: (raceNumber: number, horse: SystemHorse) => void
  onSave: () => void
  onCancel: () => void
  totalRows: number
  gameType: string | null
}
```

Renderar (mobil, `md:hidden`):
- Backdrop (`fixed inset-0 bg-black/50 z-40`) — klick stänger
- Panel (`fixed bottom-0 left-0 right-0 max-h-[70vh] z-50 bg-gray-900 rounded-t-xl`)
- Drag-handle längst upp
- Samma races + cirklar som sidopanelen
- Footer med Spara + Avbryt

### Ändrad: `components/MainPageClient.tsx`

- Wrappa innehållet i `<div className="flex gap-0 items-start">` när `systemMode` är aktivt
- Rendera `<SystemSidebar>` som ett `md:flex hidden` element
- Sticky-bannern (`SystemStatusBar`) byts till `md:hidden` + klick öppnar `SystemDrawer`
- `showDrawer` state tillkommer för att styra drawerns open/closed-läge
- Ta bort "Systemläge aktivt"-bannern i toppen (sidopanelen/drawern ger tillräcklig feedback)

### Befintlig `components/RaceList.tsx` — oförändrad

Ingen ändring behövs: `onToggleHorse` fungerar som vanligt och `isSelected` styrs av `systemSelections` som redan skickas ner.

---

## Dataflöde

```
MainPageClient (state: systemSelections, systemMode, showDrawer)
  ├── RaceList → HorseCard (isSelected, onToggleHorse)        [befintligt]
  ├── SystemSidebar (races, selections, onToggleHorse)         [nytt, md+]
  └── SystemDrawer (open=showDrawer, races, selections, ...)   [nytt, mobil]
```

`races` används redan i `MainPageClient` (skickas till `RaceList`). Sidopanelen och drawern kan använda samma prop utan extra datahämtning.

---

## Cirkelstil (häst-nummer)

Identisk med befintlig `HorseCard`-knapp i systemläge:

```
Vald:    bg-emerald-500 text-white ring-2 ring-emerald-300     (w-[26px] h-[26px])
Ej vald: bg-gray-800 text-gray-400 hover:bg-emerald-900 hover:text-emerald-400
```

---

## Layout

```
<div class="flex items-start gap-0">
  <div class="flex-1 min-w-0">          ← race-lista (befintlig)
    <RaceList ... />
  </div>
  <SystemSidebar class="hidden md:flex w-[320px] flex-shrink-0 sticky top-0 self-start max-h-screen overflow-y-auto" />
</div>

<!-- Mobil-only -->
<SystemBanner onClick={openDrawer} class="md:hidden fixed bottom-16 ..." />
<SystemDrawer open={showDrawer} ... />
```

Sidopanelen är `sticky top-[topNavHeight]` och `h-[calc(100vh-topNavHeight)]` så den följer med vid scroll utan att överlappa nav.

---

## Verifiering

```bash
npm run dev   # visuell inspektion
npm run lint
npm run build
```

Checklist:
- [ ] Desktop: sidopanel syns direkt när systemläget aktiveras
- [ ] Desktop: klick i sidopanel togglar häst — hästkortets cirkel uppdateras omedelbart
- [ ] Desktop: klick i hästkort uppdaterar sidopanelens cirkel omedelbart
- [ ] Desktop: ingen sticky banner vid botten (ersätts av sidopanel)
- [ ] Mobil: banner sitter mot kanten (`bottom-16`, ovanför BottomNav)
- [ ] Mobil: klick på banner öppnar drawer
- [ ] Mobil: drawer stängs med ✕ och backdrop-klick
- [ ] Spara-dialogen fungerar från båda yt
