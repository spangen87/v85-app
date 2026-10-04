/**
 * Ordlistan — enda källan för förklaringar i appen. Samma texter står under
 * "## 10. Ordlista" i MANUAL.md; ändra båda samtidigt. `anchor` är rubrikens id.
 */
export type TermId = "chans" | "streck" | "odds" | "varde" | "grund" | "cs" | "skrall" | "signal" | "oense" | "form" | "spar";

export interface GlossaryEntry {
  title: string;
  what: string;
  how?: string;
  note?: string;
  anchor: string;
}

const NB = " ";

export const GLOSSARY: Record<TermId, GlossaryEntry> = {
  chans: {
    title: "Chans",
    what: `Hästens vinstchans enligt spelmarknaden. Alla hästar i loppet blir tillsammans 100${NB}%.`,
    how: "Hälften streck och hälften vinnarodds, omräknat till procent. Testat mot 221 lopp med facit: träffar bättre än streck eller odds var för sig.",
    anchor: "chans",
  },
  streck: {
    title: "Streck",
    what: `Hur stor del av V85-spelarnas insatser i avdelningen som ligger på hästen. 30${NB}% betyder att nästan var tredje krona är på den.`,
    anchor: "streck",
  },
  odds: {
    title: "Odds",
    what: "Vinnarodds från ATG:s vinnarspel. Odds 4,2 betyder att 1 kr blir 4,20 kr om hästen vinner. Lägre odds betyder större favorit.",
    anchor: "odds",
  },
  varde: {
    title: "Värde",
    what: "Chans minus streck, i procentenheter. Plus betyder att hästen vinner oftare än strecket säger, så en rätt rad delar potten med färre.",
    how: "Grön markering när värdet är plus och CS är över 55.",
    note: "Minus är inget fel, bara en häst som många andra också har spelat.",
    anchor: "värde",
  },
  grund: {
    title: "Grund",
    what: "Vinstchans räknad bara på hästens egna meriter: km-tider, form, spår, distans, skor, kusk och tränare. Odds och streck används inte.",
    how: "Statistisk modell tränad på ett år av svenska V-lopp, 33 faktorer.",
    note: "En andra åsikt, ingen spelsignal. När Grund och streck är oense har strecket oftast haft rätt.",
    anchor: "grund",
  },
  cs: {
    title: "CS",
    what: "Rankning av fältet från 0 till 100. Högst CS står överst när du sorterar på CS.",
    how: `Streck 55${NB}%, distansrekord 20${NB}%, odds 10${NB}%, jämnhet 10${NB}% och form 5${NB}%.`,
    anchor: "cs",
  },
  skrall: {
    title: "Skräll",
    what: "Lågt streckad häst där vinnaroddsen tror mer på hästen än V85-spelarna gör, och som har hög klass.",
    how: `Streck under 15${NB}%, oddschansen minst 5 procentenheter över strecket och topp 3 i loppet på pengar per start.`,
    note: `På ett års lopp har skrällkandidaterna vunnit 16${NB}% av gångerna, mot 9${NB}% som strecket sa.`,
    anchor: "skräll",
  },
  signal: {
    title: "Signal",
    what: "Tecken som inte syns i odds och streck: barfota-byte, toppkusk och stigande form ger plus. Skor på, sjunkande form och uppehåll över 60 dagar ger minus.",
    how: "Märket visas när summan är +2 eller mer.",
    anchor: "signal",
  },
  oense: {
    title: "Oense",
    what: "Grund och streck skiljer sig kraftigt åt för hästen.",
    note: "Historiskt har strecket oftast haft rätt i de fallen. Se det som en anledning att titta närmare, inte som ett tips.",
    anchor: "oense",
  },
  form: {
    title: "Senaste 5",
    what: "Placeringarna i hästens fem senaste starter, nyast till vänster.",
    how: "0 = oplacerad, g = galopp, d = diskvalificerad. Guld, silver och brons är 1:a, 2:a och 3:e plats.",
    anchor: "senaste-5",
  },
  spar: {
    title: "Spår",
    what: "Hästens startspår. På vissa banor ger vissa spår en fördel eller nackdel, och det räknas in i bedömningen.",
    anchor: "spår",
  },
};

export function isTermId(v: string): v is TermId {
  return Object.prototype.hasOwnProperty.call(GLOSSARY, v);
}

export function manualHref(id: TermId): string {
  return `/manual#${GLOSSARY[id].anchor}`;
}
