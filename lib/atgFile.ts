import type { SystemSelection } from '@/lib/types'

/**
 * ATG-fil för filinlämning på atg.se/spel/reducerat. Uppladdningen spelar
 * alltid privat — lagspel på ATG Tillsammans går via ATG:s reduceringsverktyg,
 * som inte tar emot filer. Formatet följer atg_filebetting.xsd (ver 1.8):
 * en kupong är ett helt system med en 0/1-sträng per avdelning, så ett vanligt
 * system blir en enda kupong.
 *
 * ATG:s uppladdning läser speltypen ur elementnamnet (v85Coupon → V85), hittar
 * omgången via datum (+ trackcode om den finns) och jämför de fyra tecknen
 * före ".xml" med CRC-16/ARC av filtexten i gemen hex.
 */

interface CouponSpec {
  element: string
  legs: number
  /** Antal positioner i marks-strängen (startnummer 1–N) */
  positions: number
  /** Schemat kräver trackcode för speltypen */
  trackcode: boolean
}

// V85 ersatte V75 (samma upplägg, en omgång per dag) och skrivs som V75: utan trackcode
const COUPONS: Record<string, CouponSpec> = {
  V85: { element: 'v85Coupon', legs: 8, positions: 15, trackcode: false },
  V86: { element: 'v86Coupon', legs: 8, positions: 15, trackcode: true },
  V75: { element: 'v75Coupon', legs: 7, positions: 15, trackcode: false },
  GS75: { element: 'gs75Coupon', legs: 7, positions: 15, trackcode: false },
  V65: { element: 'v65Coupon', legs: 6, positions: 15, trackcode: false },
  V64: { element: 'v64Coupon', legs: 6, positions: 15, trackcode: false },
  V5: { element: 'v5Coupon', legs: 5, positions: 15, trackcode: true },
  V4: { element: 'v4Coupon', legs: 4, positions: 20, trackcode: true },
}

export function supportsAtgFile(gameType: string | null | undefined): boolean {
  return gameType != null && gameType.toUpperCase() in COUPONS
}

/** ATG:s spel-id, t.ex. "V85_2026-10-11_5_1": speltyp, datum, bankod, loppnummer */
export function parseAtgGameId(gameId: string): { gameType: string; date: string; trackCode: number } | null {
  const m = /^([A-Za-z0-9]+)_(\d{4}-\d{2}-\d{2})_(\d+)_\d+$/.exec(gameId)
  return m ? { gameType: m[1].toUpperCase(), date: m[2], trackCode: Number(m[3]) } : null
}

/** CRC-16/ARC (poly 0x8005, reflekterad, init 0) — samma som ATG:s uppladdning */
export function crc16Arc(text: string): number {
  const bytes = new TextEncoder().encode(text)
  let crc = 0
  for (const b of bytes) {
    crc ^= b
    for (let i = 0; i < 8; i++) crc = crc & 1 ? (crc >>> 1) ^ 0xa001 : crc >>> 1
  }
  return crc
}

const pad = (n: number) => String(n).padStart(2, '0')

export function buildAtgFile(
  gameId: string,
  selections: SystemSelection[],
  now: Date = new Date(),
): { filename: string; xml: string } | { error: string } {
  const game = parseAtgGameId(gameId)
  if (!game) return { error: 'Omgången saknar ett giltigt ATG-id.' }
  const spec = COUPONS[game.gameType]
  if (!spec) return { error: `${game.gameType} går inte att lämna in som fil.` }

  const legs: string[] = []
  for (let legno = 1; legno <= spec.legs; legno++) {
    const horses = selections.find((s) => s.race_number === legno)?.horses ?? []
    if (horses.length === 0) return { error: `Välj minst en häst i varje avdelning (avd ${legno} saknas).` }
    const marks = Array<string>(spec.positions).fill('0')
    for (const h of horses) {
      if (!Number.isInteger(h.start_number) || h.start_number < 1 || h.start_number > spec.positions) {
        return { error: `Startnummer ${h.start_number} i avd ${legno} går inte att lämna in som fil.` }
      }
      marks[h.start_number - 1] = '1'
    }
    legs.push(`      <leg legno="${legno}" marks="${marks.join('')}"/>`)
  }

  const createdDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const createdTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`
  const track = spec.trackcode ? ` trackcode="${game.trackCode}"` : ''

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<issuer xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"' +
      ' xsi:noNamespaceSchemaLocation="https://www.atg.se/services/schemas/filebet/1.8.4/atg_filebetting.xsd"' +
      ` company="Travappen" product="Travappen" version="1.0" createddate="${createdDate}" createdtime="${createdTime}"` +
      ' schemaversion="ATG File Betting XSD ver 1.8">',
    '  <betcoupons>',
    `    <${spec.element} couponid="1" date="${game.date}"${track} betmultiplier="1">`,
    ...legs,
    `    </${spec.element}>`,
    '  </betcoupons>',
    '</issuer>',
    '',
  ].join('\n')

  const crc = crc16Arc(xml).toString(16).padStart(4, '0')
  return { filename: `${game.gameType.toLowerCase()}_${game.date}_${crc}.xml`, xml }
}

/** Laddar ner filen i webbläsaren */
export function downloadAtgFile(file: { filename: string; xml: string }): void {
  const url = URL.createObjectURL(new Blob([file.xml], { type: 'application/xml' }))
  const a = document.createElement('a')
  a.href = url
  a.download = file.filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
