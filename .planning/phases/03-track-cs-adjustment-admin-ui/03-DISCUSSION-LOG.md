# Phase 3: Track CS Adjustment & Admin UI - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-05
**Phase:** 03-track-cs-adjustment-admin-ui
**Areas discussed:** Open-stretch-logik, HorseCard-indikator, Admin-navigering, Admin-formulär UX

---

## Open-stretch-logik

| Option | Description | Selected |
|--------|-------------|----------|
| Fast delta +0.12 | Varje konfigurerat yttre spår får +0.12 på statiskt värde. Spår 7: 0.58→0.70, spår 12: 0.30→0.42 | ✓ |
| Halvera straffet | Minska gap till 1.0 med 50%. Spår 7: 0.58→0.79 | |
| Neutralisera helt | Yttre konfigurerade spår går till 1.0 | |

**User's choice:** Fast delta +0.12

| Option | Description | Selected |
|--------|-------------|----------|
| -0.08 delta | Moderate penalty för spår ≥5 vid kort lopp | ✓ |
| -0.12 delta | Samma magnitud som open-stretch boost | |
| Samma delta som open-stretch | Symmetrisk | |

**User's choice:** -0.08 delta för kort-lopp

---

## HorseCard-indikator

| Option | Description | Selected |
|--------|-------------|----------|
| Alltid vid open-stretch/kort-lopp | Boolean-logik, ingen CS-delta-beräkning | |
| Bara om CS ändras med ≥1 poäng | Räkna faktisk CS-delta, visa badge enbart vid meningsfull förändring | ✓ |

**User's choice:** Bara om CS ändras ≥1 poäng

| Option | Description | Selected |
|--------|-------------|----------|
| Inline bredvid CS-badge | "CS 74 ↑" alltid synlig i kompakt vy | ✓ |
| Expanderat detaljläge | Kräver interaktion för att se påverkan | |

**User's choice:** Inline bredvid CS-badge

---

## Admin-navigering

| Option | Description | Selected |
|--------|-------------|----------|
| Villkorlig i båda navbars | TopNav server-side check + BottomNav via isAdmin-prop | ✓ |
| Alltid synlig, sidan redirectar | Enklast, men alla ser admin-länk | |

**User's choice:** Villkorlig i båda navbars

---

## Admin-formulär UX

| Option | Description | Selected |
|--------|-------------|----------|
| Tabell med inline-redigering | En rad per bana, per-rad Spara-knapp, helhetsöversikt | ✓ |
| Accordion per bana | Renare på mobil men kräver fler klick | |

**User's choice:** Tabell med inline-redigering, per-rad Spara-knapp

---

## Claude's Discretion

- Exakt styling/layout av admin-tabellen
- Spinner/loading-state under sparning
- Validering av open_stretch_lanes-input
- Tooltip-formulering för HorseCard-badge

## Deferred Ideas

- Startvinge-faktor — v2
- Per-sällskap bankonfiguration — Out of Scope
- Historisk statistikvalidering (STAT-01/02) — v2
