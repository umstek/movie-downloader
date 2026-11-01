import { afterEach, describe, expect, it, vi } from "vitest";

import type { MovieResult, SearchResultsPage } from "../src/tmdb";

function searchPage(results: SearchResultsPage["results"]): SearchResultsPage {
  return {
    page: 1,
    results,
    total_pages: 1,
    total_results: results.length,
  };
}

// src/tmdb builds its request headers (including the TMDB read access
// token) at module scope, so it must be imported after the environment
// is stubbed.
async function loadTmdb() {
  vi.resetModules();
  return await import("../src/tmdb");
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("search", () => {
  it("queries the right endpoint with the bearer token and tags results with the kind", async () => {
    vi.stubEnv("TMDB_API_READ_ACCESS_TOKEN", "token-123");
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(JSON.stringify(searchPage([{ id: 1, title: "Dune" } as MovieResult])), {
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { search } = await loadTmdb();

    const page = await search({ kind: "movie", query: "dune part two" });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.themoviedb.org/3/search/movie?query=dune%20part%20two");
    expect(init.headers).toMatchObject({
      accept: "application/json",
      Authorization: "Bearer token-123",
    });
    expect(page?.results.every((result) => result.kind === "movie")).toBe(true);
  });

  it("returns undefined when the request fails", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("network down");
      }),
    );
    const { search } = await loadTmdb();

    const page = await search({ kind: "tv", query: "lost" });

    expect(page).toBeUndefined();
    expect(errorSpy).toHaveBeenCalled();
  });
});

describe("getDetails", () => {
  it("fetches the item and forces the requested kind", async () => {
    vi.stubEnv("TMDB_API_READ_ACCESS_TOKEN", "token-123");
    const fetchMock = vi.fn(
      async (_url: string, _init: RequestInit) =>
        new Response(JSON.stringify({ id: 6040, name: "Ben 10" }), {
          headers: { "content-type": "application/json" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { getDetails } = await loadTmdb();

    const details = await getDetails({ kind: "tv", id: 6040 });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://api.themoviedb.org/3/tv/6040");
    expect(init.headers).toMatchObject({ Authorization: "Bearer token-123" });
    expect(details).toMatchObject({ id: 6040, kind: "tv" });
  });
});
