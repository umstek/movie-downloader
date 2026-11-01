import { describe, expect, it } from "vitest";

import {
  generateDetailsFilePath,
  generateMovieSourceFilePath,
  generateSearchFilePath,
  generateTvEpisodeSourceFilePath,
  getConfigPath,
  getJobsPath,
} from "../src/paths";

describe("generateSearchFilePath", () => {
  it("places the filenamified query under the kind directory", () => {
    expect(generateSearchFilePath("movie", "Dune")).toBe("data/search/movie/Dune.json");
  });

  it("replaces filename-hostile characters with the replacement char", () => {
    expect(generateSearchFilePath("tv", 'What/If: "Part 2"?')).toBe(
      "data/search/tv/What-If- -Part 2-.json",
    );
  });

  it("truncates long queries to 100 characters", () => {
    const path = generateSearchFilePath("movie", "a".repeat(150));
    const fileName = path.split("/").at(-1);
    expect(fileName).toBe(`${"a".repeat(100)}.json`);
  });
});

describe("generateDetailsFilePath", () => {
  it("uses the item id as the file name", () => {
    expect(generateDetailsFilePath("movie", 42)).toBe("data/details/movie/42.json");
    expect(generateDetailsFilePath("tv", 6040)).toBe("data/details/tv/6040.json");
  });
});

describe("generateMovieSourceFilePath", () => {
  it("uses the movie id as the file name", () => {
    expect(generateMovieSourceFilePath("movie", 42)).toBe("data/sources/movie/42.json");
  });
});

describe("generateTvEpisodeSourceFilePath", () => {
  it("nests season and episode directories", () => {
    expect(generateTvEpisodeSourceFilePath("tv", 6040, 1, 12)).toBe(
      "data/sources/tv/6040/s1/e12.json",
    );
  });
});

describe("config and jobs paths", () => {
  it("points into the data directory", () => {
    expect(getConfigPath()).toBe("./data/config.json");
    expect(getJobsPath()).toBe("./data/jobs");
  });
});
