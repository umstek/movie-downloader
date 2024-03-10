import type {
  FileBasedStream,
  HlsBasedStream,
  Qualities,
  RunOutput,
  Stream,
} from "@movie-web/providers";
import type { MovieJob, TVJob } from "./jobs";
import { findDownloadSources } from "./mw";
import {
  generateDetailsFilePath,
  generateMovieSourceFilePath,
  generateTvEpisodeSourceFilePath,
  getConfigPath,
} from "./paths";
import { load, viaPersistence } from "./persistence";
import { configPrompt, type Config } from "./prompts/configPrompt";
import type { Movie, TV } from "./tmdb";
import type { VideoFormat, VideoInfo } from "./hls";
import filenamify from "filenamify";
import { kebabCase } from "change-case";

const qualitiesOrder: Qualities[] = [
  "4k",
  "1080",
  "720",
  "480",
  "360",
  "unknown",
];
const qualityToHeight: Record<Qualities, number> = {
  "4k": 2160,
  "1080": 1080,
  "720": 720,
  "480": 480,
  "360": 360,
  unknown: 1080,
};
const qualityToWidth: Record<Qualities, number> = {
  "4k": 3840,
  "1080": 1920,
  "720": 1280,
  "480": 854,
  "360": 640,
  unknown: 1920,
};
const downloadsFolder = "./downloads";

const bun = Bun.which("bun");
let ytdlp =
  process.env.YT_DLP_PATH ||
  Bun.which("yt-dlp") ||
  `./bin/yt-dlp${process.platform === "win32" ? ".exe" : ""}`;

export async function download(job: TVJob | MovieJob) {
  if (job.kind === "movie") {
    await downloadMovie(job);
  } else if (job.kind === "tv") {
    await downloadTV(job);
  }
}

async function downloadMovie(job: MovieJob) {
  const config = await viaPersistence(getConfigPath(), configPrompt);

  const { kind, query, tmdbId } = job;
  const movie: Movie | undefined = await load(
    generateDetailsFilePath(kind, tmdbId)
  );

  if (!movie) {
    throw new Error("Movie not found.");
  }

  const releaseYear = Number.parseInt(movie.release_date.slice(0, 4));
  const sources = await viaPersistence<
    Awaited<ReturnType<typeof findDownloadSources>>
  >(generateMovieSourceFilePath(kind, movie.id), () =>
    findDownloadSources({
      type: "movie",
      releaseYear: Number.isFinite(releaseYear) ? releaseYear : 0,
      title: movie.title,
      tmdbId: movie.id.toString(),
    })
  );

  if (sources) {
    console.log(`Located movie.`);
  } else {
    throw new Error("No sources found.");
  }

  if (!config.download) {
    if (sources.stream.type === "file") {
      for (const [quality, { type, url }] of Object.entries(
        sources.stream.qualities
      )) {
        console.log(`${quality} - ${type} - ${url}`);
      }
    }
  }
}

async function downloadTV(job: TVJob) {
  const config = await viaPersistence(getConfigPath(), configPrompt);

  const { kind, query, tmdbId, episodes } = job;
  const tv: TV | undefined = await load(generateDetailsFilePath(kind, tmdbId));

  if (!tv) {
    throw new Error("TV not found.");
  }

  for (const [seasonStr, episodeNos] of Object.entries(episodes)) {
    const seasonNo = Number.parseInt(seasonStr.split("-")[1]);
    for (const episodeNo of episodeNos) {
      const releaseYear = Number.parseInt(tv.first_air_date.slice(0, 4));
      const sources = await viaPersistence<
        Awaited<ReturnType<typeof findDownloadSources>>
      >(generateTvEpisodeSourceFilePath(kind, tv.id, seasonNo, episodeNo), () =>
        findDownloadSources({
          type: "show",
          releaseYear: Number.isFinite(releaseYear) ? releaseYear : 0,
          title: tv.name,
          tmdbId: tv.id.toString(),
          season: {
            number: seasonNo,
            tmdbId:
              tv.seasons
                .find((season) => season.season_number === seasonNo)
                ?.id.toString() || "",
          },
          episode: {
            number: episodeNo,
            tmdbId: "", // XXX Hopefully, this won't matter
          },
        })
      );

      if (sources) {
        console.log(`Located S${seasonNo}E${episodeNo}.`);
      } else {
        console.error(`No sources found for S${seasonNo}E${episodeNo}.`);
        continue;
      }

      await downloadStream(
        sources.stream,
        {
          kind: "tv",
          item: tv,
          season: seasonNo,
          episode: episodeNo,
          sources,
        },
        config
      );
    }
  }
}

type DownloadMeta =
  | {
      kind: "tv";
      item: TV;
      season: number;
      episode: number;
      sources: RunOutput;
    }
  | {
      kind: "movie";
      item: Movie;
      sources: RunOutput;
    };

async function downloadStream(
  stream: Stream,
  meta: DownloadMeta,
  config: Config
) {
  if (stream.type === "hls") {
    await downloadHlsStream(stream, meta, config);
  } else if (stream.type === "file") {
    await downloadFileStream(stream, meta, config);
  }
}

async function downloadFileStream(
  stream: FileBasedStream,
  meta: DownloadMeta,
  config: Config
) {
  if (!config.download) {
    logFileStreamUrls(stream);
    return;
  }

  const expectedQuality = config.resolution as Qualities;
  const betterQualities = qualitiesOrder
    .slice(0, qualitiesOrder.indexOf(expectedQuality))
    .reverse();
  const worseQualities = qualitiesOrder.slice(
    qualitiesOrder.indexOf(expectedQuality) + 1
  );
  const matchingQuality =
    [expectedQuality, ...betterQualities, ...worseQualities].filter(
      (q) => stream.qualities[q]
    )[0] || "unknown";
  console.log("Quality matched:", matchingQuality);

  const url = stream.qualities[matchingQuality]?.url;
  if (!url) {
    console.error(
      `No matching download URLs found for ${config.resolution} or below.`
    );
    logFileStreamUrls(stream);
    return;
  }

  const proc = Bun.spawn({
    cmd: [
      ytdlp,
      "--print",
      "filename",
      "-P",
      downloadsFolder,
      url,
      "-o",
      `${
        meta.kind === "movie"
          ? kebabCase(
              filenamify(meta.item.title, { replacement: " ", maxLength: 240 })
            )
          : `${kebabCase(
              filenamify(meta.item.name, { replacement: " ", maxLength: 230 })
            )}-S${meta.season.toFixed().padStart(2, "0")}-E${meta.episode
              .toFixed()
              .padStart(2, "0")}`
      }.%(ext)s`,
      "--restrict-filenames",
      // "--write-info-json",
      "--no-simulate",
    ],
  });
  const text = await new Response(proc.stdout).text();
  await proc.exited;
  // filenameWithExt includes directory path
  const filenameWithExt = text.trim();
  const filename = filenameWithExt.slice(0, filenameWithExt.lastIndexOf("."));

  const languages = ["en"];
  const matchingCaptions = stream.captions.filter(
    (c) => c.language && languages.includes(c.language)
  );
  for (const caption of matchingCaptions) {
    const captionsFilename = `${filename}.${caption.language}.${caption.type}`;
    const captionsResponse = await fetch(caption.url);
    await Bun.write(`${captionsFilename}`, captionsResponse);
  }
}

async function logFileStreamUrls(stream: FileBasedStream) {
  for (const [quality, { type, url }] of Object.entries(stream.qualities)) {
    console.log(`${quality} - ${type} - ${url}`);
  }
}

async function downloadHlsStream(
  stream: HlsBasedStream,
  meta: DownloadMeta,
  config: Config
) {
  if (!config.download) {
    logHlsStreamUrls(stream);
    return;
  }

  const expectedQuality = config.resolution as Qualities;
  const betterQualities = qualitiesOrder
    .slice(0, qualitiesOrder.indexOf(expectedQuality))
    .reverse();
  const worseQualities = qualitiesOrder.slice(
    qualitiesOrder.indexOf(expectedQuality) + 1
  );
  const preferredQualitiesOrder = [
    expectedQuality,
    ...betterQualities,
    ...worseQualities,
  ];

  const playlistUrl = stream.playlist;
  // yt-dlp -J url dumps the json into standard output, implies simulate
  const proc = Bun.spawn({
    cmd: [ytdlp, "-J", playlistUrl],
  });
  const obj = (await new Response(proc.stdout).json()) as VideoInfo;
  await proc.exited;
  const match = findBestMatch(preferredQualitiesOrder, obj.formats);

  const url = match.url;
  if (!url) {
    console.error(
      `No matching download URLs found for ${config.resolution}. Using yt-dlp preferred quality.`
    );
    logHlsStreamUrls(stream);
    // TODO download best quality
    return;
  }

  const proc2 = Bun.spawn({
    cmd: [
      ytdlp,
      "--print",
      "filename",
      "-P",
      downloadsFolder,
      url,
      "-o",
      `${
        meta.kind === "movie"
          ? kebabCase(
              filenamify(meta.item.title, { replacement: " ", maxLength: 240 })
            )
          : `${kebabCase(
              filenamify(meta.item.name, { replacement: " ", maxLength: 230 })
            )}-S${meta.season.toFixed().padStart(2, "0")}-E${meta.episode
              .toFixed()
              .padStart(2, "0")}`
      }.%(ext)s`,
      "--restrict-filenames",
      "--no-simulate",
    ],
  });
  const text = await new Response(proc2.stdout).text();
  await proc2.exited;
  const filename = text.trim();
  console.log(`Downloaded ${filename}.`);
}

function findBestMatch(wanted: Qualities[], available: VideoFormat[]) {
  const candidates = available
    .filter((v): v is VideoFormat & { aspect_ratio: number } =>
      Number.isFinite(v.aspect_ratio)
    )
    .flatMap((v) =>
      wanted.map((q, i) => [q, v, distance(q, v) * (1 + (i + 1) / 10)] as const)
    );

  candidates.sort((a, b) => a[2] - b[2]);
  return candidates[0]?.[1] || available.at(-1);
}

const DEFAULT_ASPECT_RATIO = 16 / 9;

function distance(
  quality: Qualities,
  video: VideoFormat & { aspect_ratio: number }
) {
  const aspectRatio = video.aspect_ratio;
  const expectedHeight = qualityToHeight[quality];
  const expectedWidth = qualityToWidth[quality];

  if (aspectRatio >= DEFAULT_ASPECT_RATIO) {
    // Compare width
    return (
      Math.abs(
        video.width || (video.height || 0) * aspectRatio - expectedWidth
      ) / expectedWidth
    );
  }

  // Else, compare height
  return (
    Math.abs(
      video.height || (video.width || 0) / aspectRatio - expectedHeight
    ) / expectedHeight
  );
}

async function logHlsStreamUrls(stream: HlsBasedStream) {
  console.log(`${stream.playlist}`);
}
