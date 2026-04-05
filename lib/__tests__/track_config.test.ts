jest.mock("@/lib/supabase/server", () => ({
  createServiceClient: jest.fn(),
}));

import { getTrackConfig } from "../actions/tracks";
import { createServiceClient } from "@/lib/supabase/server";

const makeMockDb = (data: unknown, error: unknown) => ({
  from: () => ({
    select: () => ({
      eq: () => ({
        single: async () => ({ data, error }),
      }),
    }),
  }),
});

describe("getTrackConfig", () => {
  it("returnerar TrackConfig för känd bana", async () => {
    const row = {
      track_name: "Solvalla",
      open_stretch: true,
      open_stretch_lanes: [7, 8, 9, 10, 11, 12],
      short_race_threshold: 1640,
      active: true,
      updated_at: "2026-04-05T00:00:00Z",
    };
    (createServiceClient as jest.Mock).mockReturnValue(makeMockDb(row, null));
    const result = await getTrackConfig("Solvalla");
    expect(result).not.toBeNull();
    expect(result?.track_name).toBe("Solvalla");
    expect(result?.open_stretch).toBe(true);
  });

  it("returnerar null för okänd bana", async () => {
    (createServiceClient as jest.Mock).mockReturnValue(
      makeMockDb(null, { message: "No rows" })
    );
    const result = await getTrackConfig("Okänd");
    expect(result).toBeNull();
  });

  it("open_stretch_lanes är number[]", async () => {
    const row = {
      track_name: "Solvalla",
      open_stretch: true,
      open_stretch_lanes: [7, 8, 9, 10, 11, 12],
      short_race_threshold: 1640,
      active: true,
      updated_at: "2026-04-05T00:00:00Z",
    };
    (createServiceClient as jest.Mock).mockReturnValue(makeMockDb(row, null));
    const result = await getTrackConfig("Solvalla");
    expect(Array.isArray(result?.open_stretch_lanes)).toBe(true);
  });
});
