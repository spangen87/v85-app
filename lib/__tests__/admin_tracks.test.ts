import { getAllTrackConfigs, upsertTrackConfig } from "../actions/tracks";

describe("tracks server actions — export check", () => {
  it("getAllTrackConfigs är exporterad som en async funktion", () => {
    expect(typeof getAllTrackConfigs).toBe("function");
  });

  it("upsertTrackConfig är exporterad som en async funktion", () => {
    expect(typeof upsertTrackConfig).toBe("function");
  });
});
