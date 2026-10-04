import { chansNote, distanceCategory, grundNote, placementLine, rankNote, trackNote } from "../horseDetail";
import type { TrackConfig } from "../types";

const cfg: TrackConfig = { track_name: "Solvalla", open_stretch: true, open_stretch_lanes: [1, 2], short_race_threshold: 1640, active: true, updated_at: "" };

describe("horseDetail", () => {
  it("chans och rang", () => {
    expect(chansNote(1)).toBe("Störst chans i loppet.");
    expect(chansNote(2)).toBe("2:a störst chans i loppet.");
    expect(chansNote(null)).toBeNull();
    expect(rankNote(3, "i fältet")).toBe("3:e i fältet.");
  });
  it("grund med oense", () => {
    expect(grundNote(["+ km-tid", "+ kusk"], false)).toBe("Varför: + km-tid · + kusk.");
    expect(grundNote([], true)).toBe("Grund och streck är oense. Då har strecket oftast haft rätt.");
    expect(grundNote(["+ km-tid"], true)).toBe("Varför: + km-tid. Grund och streck är oense. Då har strecket oftast haft rätt.");
    expect(grundNote([], false)).toBeNull();
  });
  it("spår med banjustering", () => {
    expect(trackNote(2, cfg, 2140)).toBe("Open stretch på Solvalla: spåret räknas som bättre.");
    expect(trackNote(6, cfg, 1640)).toBe("Kort lopp: ytterspår räknas som sämre.");
    expect(trackNote(4, cfg, 2140)).toBeNull();
    expect(trackNote(2, null, 2140)).toBeNull();
  });
  it("placeringsrad och distans", () => {
    expect(placementLine(32, 9, 6, 4)).toBe("32 starter · 9-6-4");
    expect(placementLine(0, 0, 0, 0)).toBe("–");
    expect([1640, 2140, 2640].map(distanceCategory)).toEqual(["short", "medium", "long"]);
  });
});
