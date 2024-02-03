import type { MovieJob, TVJob } from "./jobs";
import { findDownloadSources } from "./mw";
import {
  generateDetailsFilePath,
  generateMovieSourceFilePath,
  generateTvEpisodeSourceFilePath,
  getConfigPath,
} from "./paths";
import { load, viaPersistence } from "./persistence";
import { configPrompt } from "./prompts/configPrompt";
import type { Movie, TV } from "./tmdb";

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
  }
}
