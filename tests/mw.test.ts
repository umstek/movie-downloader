import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  runAll: vi.fn(async () => ({ stream: { type: "file", qualities: {} } })),
}));

vi.mock("@movie-web/providers", () => ({
  makeStandardFetcher: vi.fn(() => ({})),
  makeProviders: vi.fn(() => ({ runAll: mocks.runAll })),
  targets: { ANY: "any" },
}));

import { findDownloadSources } from "../src/mw";

describe("findDownloadSources", () => {
  it("delegates to providers.runAll with the given media", async () => {
    const media = {
      type: "movie",
      releaseYear: 2021,
      title: "Dune",
      tmdbId: "438631",
    } as const;

    const output = await findDownloadSources(media);

    expect(mocks.runAll).toHaveBeenCalledWith({ media });
    expect(output).toEqual({ stream: { type: "file", qualities: {} } });
  });
});
