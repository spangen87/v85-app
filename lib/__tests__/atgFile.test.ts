import { buildAtgFile, crc16Arc, parseAtgGameId, supportsAtgFile } from "../atgFile";
import type { SystemSelection } from "../types";

const sel = (race_number: number, ...nums: number[]): SystemSelection => ({
  race_number,
  horses: nums.map((n) => ({ horse_id: `h${race_number}-${n}`, start_number: n, horse_name: `Häst ${n}` })),
});

const NOW = new Date(2026, 9, 10, 9, 5, 7); // lokal tid 2026-10-10 09:05:07

describe("crc16Arc", () => {
  it("ger standardvärdet för CRC-16/ARC", () => {
    expect(crc16Arc("123456789")).toBe(0xbb3d);
    expect(crc16Arc("")).toBe(0);
  });
});

describe("parseAtgGameId", () => {
  it("läser speltyp, datum och bankod", () => {
    expect(parseAtgGameId("V85_2026-10-11_5_1")).toEqual({ gameType: "V85", date: "2026-10-11", trackCode: 5 });
    expect(parseAtgGameId("V86_2026-09-16_40_1")).toEqual({ gameType: "V86", date: "2026-09-16", trackCode: 40 });
  });
  it("ogiltigt id ger null", () => {
    expect(parseAtgGameId("trams")).toBeNull();
  });
});

describe("supportsAtgFile", () => {
  it("bara flerloppsspel med avdelningsrader", () => {
    expect(supportsAtgFile("V85")).toBe(true);
    expect(supportsAtgFile("v86")).toBe(true);
    expect(supportsAtgFile("DD")).toBe(false);
    expect(supportsAtgFile("V3")).toBe(false);
  });
});

describe("buildAtgFile", () => {
  const v85 = [sel(1, 1, 4), sel(2, 5), sel(3, 2, 3, 11), sel(4, 7), sel(5, 1), sel(6, 15), sel(7, 6, 8), sel(8, 9)];

  it("bygger en V85-kupong med en avdelning per lopp", () => {
    const res = buildAtgFile("V85_2026-10-11_5_1", v85, NOW);
    if ("error" in res) throw new Error(res.error);
    expect(res.xml).toContain('<v85Coupon couponid="1" date="2026-10-11" betmultiplier="1">');
    expect(res.xml).not.toContain("trackcode");
    expect(res.xml).toContain('<leg legno="1" marks="100100000000000"/>');
    expect(res.xml).toContain('<leg legno="3" marks="011000000010000"/>');
    expect(res.xml).toContain('<leg legno="6" marks="000000000000001"/>');
    expect(res.xml.match(/<leg /g)).toHaveLength(8);
    expect(res.xml).toContain('createddate="2026-10-10" createdtime="09:05:07"');
    expect(res.xml).toContain('schemaversion="ATG File Betting XSD ver 1.8"');
  });

  it("filnamnet slutar med checksumman i gemen hex före .xml", () => {
    const res = buildAtgFile("V85_2026-10-11_5_1", v85, NOW);
    if ("error" in res) throw new Error(res.error);
    const crc = crc16Arc(res.xml).toString(16).padStart(4, "0");
    expect(res.filename).toBe(`v85_2026-10-11_${crc}.xml`);
    // ATG läser de fyra tecknen före ".xml"
    expect(res.filename.slice(-8, -4)).toBe(crc);
  });

  it("filen är ren ASCII så checksumman blir densamma hos ATG", () => {
    const res = buildAtgFile("V85_2026-10-11_5_1", v85, NOW);
    if ("error" in res) throw new Error(res.error);
    expect(/^[\x00-\x7f]*$/.test(res.xml)).toBe(true);
  });

  it("V86 får bankod från spel-id:t", () => {
    const res = buildAtgFile("V86_2026-09-16_40_1", v85, NOW);
    if ("error" in res) throw new Error(res.error);
    expect(res.xml).toContain('<v86Coupon couponid="1" date="2026-09-16" trackcode="40" betmultiplier="1">');
  });

  it("V4 har 20 positioner per avdelning", () => {
    const res = buildAtgFile("V4_2026-10-08_7_5", [sel(1, 18), sel(2, 1), sel(3, 2), sel(4, 3)], NOW);
    if ("error" in res) throw new Error(res.error);
    expect(res.xml).toContain('<leg legno="1" marks="00000000000000000100"/>');
  });

  it("varje avdelning måste ha minst en häst", () => {
    const res = buildAtgFile("V85_2026-10-11_5_1", v85.slice(0, 7), NOW);
    expect(res).toEqual({ error: "Välj minst en häst i varje avdelning (avd 8 saknas)." });
  });

  it("startnummer över 15 går inte att lämna in", () => {
    const res = buildAtgFile("V85_2026-10-11_5_1", [...v85.slice(0, 7), sel(8, 16)], NOW);
    expect("error" in res && res.error).toMatch(/16/);
  });

  it("speltyp som inte stöds ger fel", () => {
    expect(buildAtgFile("DD_2026-10-11_5_3", [sel(1, 1), sel(2, 2)], NOW)).toEqual({ error: "DD går inte att lämna in som fil." });
  });
});
