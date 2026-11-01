import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { load, save, viaPersistence } from "../src/persistence";

type FileMap = Map<string, string>;

function stubBunFileSystem(files: FileMap = new Map()) {
  vi.stubGlobal("Bun", {
    file: (path: string) => ({
      exists: async () => files.has(path),
      json: async () => JSON.parse(files.get(path) as string),
    }),
    write: async (path: string, data: string) => {
      files.set(path, data);
      return data.length;
    },
  });
  return files;
}

beforeEach(() => {
  stubBunFileSystem();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("viaPersistence", () => {
  it("returns the persisted value without invoking the function", async () => {
    const files = stubBunFileSystem(new Map([["data/config.json", '{"download":false}']]));
    const func = vi.fn(async () => ({ download: true }));

    const result = await viaPersistence("data/config.json", func);

    expect(result).toEqual({ download: false });
    expect(func).not.toHaveBeenCalled();
    expect(files.size).toBe(1);
  });

  it("computes, persists and returns the value when no file exists", async () => {
    const files = stubBunFileSystem();
    const func = vi.fn(async () => ({ download: true, resolution: "1080" }));

    const result = await viaPersistence("data/config.json", func);

    expect(result).toEqual({ download: true, resolution: "1080" });
    expect(func).toHaveBeenCalledOnce();
    expect(files.get("data/config.json")).toBe(
      JSON.stringify({ download: true, resolution: "1080" }, null, 2),
    );
  });
});

describe("load", () => {
  it("returns parsed JSON for an existing file", async () => {
    stubBunFileSystem(new Map([["data/jobs/job.json", '{"name":"Dune"}']]));

    expect(await load<{ name: string }>("data/jobs/job.json")).toEqual({ name: "Dune" });
  });

  it("returns undefined for a missing file", async () => {
    expect(await load("data/jobs/missing.json")).toBeUndefined();
  });
});

describe("save", () => {
  it("pretty-prints JSON to the given path", async () => {
    const files = stubBunFileSystem();

    await save("data/jobs/job.json", { name: "Dune", tmdbId: 438631 });

    expect(files.get("data/jobs/job.json")).toBe(
      JSON.stringify({ name: "Dune", tmdbId: 438631 }, null, 2),
    );
  });
});
