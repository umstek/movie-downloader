import { beforeEach, describe, expect, it, vi } from "vitest";

// download.ts resolves the yt-dlp location via Bun.which at module scope,
// so the Bun global must exist before the module is imported.
vi.stubGlobal("Bun", { which: () => null });

const { findBestMatch } = await import("../src/download");

import type { VideoFormat } from "../src/hls";

function format(overrides: Partial<VideoFormat>): VideoFormat {
  return {
    format_id: "id",
    format_index: null,
    url: "https://example.test/v.mp4",
    manifest_url: "",
    tbr: 0,
    ext: "mp4",
    fps: 30,
    protocol: "https",
    preference: null,
    quality: null,
    has_drm: false,
    vbr: 0,
    abr: 0,
    vcodec: "avc",
    acodec: "aac",
    dynamic_range: "SDR",
    resolution: "1920x1080",
    aspect_ratio: 16 / 9,
    http_headers: {},
    format: "1080p",
    ...overrides,
  };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  vi.stubGlobal("Bun", { which: () => null });
});

describe("findBestMatch", () => {
  it("prefers an exact match at the top of the wanted list", () => {
    const match = findBestMatch(
      ["1080", "720"],
      [
        format({ aspect_ratio: 16 / 9, width: 1920, height: 1080 }),
        format({ aspect_ratio: 16 / 9, width: 640, height: 360 }),
      ],
    );

    expect(match?.width).toBe(1920);
  });

  it("falls back to a lower quality when the preferred one is unavailable", () => {
    const match = findBestMatch(
      ["1080", "720", "480"],
      [
        format({ aspect_ratio: 16 / 9, width: 1280, height: 720 }),
        format({ aspect_ratio: 16 / 9, width: 854, height: 480 }),
      ],
    );

    expect(match?.height).toBe(720);
  });

  it("falls back to a higher quality when nothing lower exists", () => {
    const match = findBestMatch(
      ["480"],
      [format({ aspect_ratio: 16 / 9, width: 3840, height: 2160 })],
    );

    expect(match?.height).toBe(2160);
  });

  it("compares heights for portrait videos instead of widths", () => {
    const match = findBestMatch(
      ["1080"],
      [
        format({ aspect_ratio: 9 / 16, width: 720, height: 1280 }),
        format({ aspect_ratio: 16 / 9, width: 1280, height: 720 }),
      ],
    );

    expect(match?.height).toBe(1280);
  });

  it("derives the missing dimension from the aspect ratio", () => {
    const match = findBestMatch(
      ["1080"],
      [
        format({ aspect_ratio: 16 / 9, width: 1920 }),
        format({ aspect_ratio: 16 / 9, width: 640, height: 360 }),
      ],
    );

    expect(match?.width).toBe(1920);
  });

  it("returns the last available format when none has a usable aspect ratio", () => {
    const match = findBestMatch(
      ["1080"],
      [
        format({ aspect_ratio: null, width: 1920, height: 1080 }),
        format({ aspect_ratio: NaN, width: 1280, height: 720 }),
      ],
    );

    expect(match?.width).toBe(1280);
  });

  it("returns undefined when no formats are available", () => {
    expect(findBestMatch(["1080"], [])).toBeUndefined();
  });
});
