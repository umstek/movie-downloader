import prompts from "prompts";
import filenamify from "filenamify";

import {
  search,
  getDetails,
  type SearchResultsPage,
  type TV,
  type Movie,
} from "./tmdb";
import { findDownloadSources } from "./mw";
import { save, viaPersistence } from "./persistence";
import { configPrompt } from "./prompts/configPrompt";
import type { MovieJob, TVJob } from "./jobs";

const config = await viaPersistence("./data/config.json", configPrompt);

const { kind, query }: { kind: "movie" | "tv"; query: string } = await prompts([
  {
    type: "select",
    name: "kind",
    message: "What do you want to download?",
    choices: [
      { title: "a movie", value: "movie" },
      { title: "a tv show / seasons / episodes", value: "tv" },
    ],
  },
  {
    type: "text",
    name: "query",
    message: "Enter the search query:",
  },
]);

let searchResponse = await viaPersistence<SearchResultsPage | undefined>(
  generateSearchFilePath(kind, query),
  () => search({ kind, query })
);

const movieOrTvChoices = searchResponse?.results.map((result) => {
  return {
    title:
      result.kind === "tv"
        ? `${result.name}${
            result.name === result.original_name
              ? ""
              : ` = ${result.original_name}`
          } (${result.first_air_date})`
        : `${result.title}${
            result.title === result.original_title
              ? ""
              : ` = ${result.original_title}`
          } (${result.release_date})`,
    description: result.overview,
    value: result,
  };
});

const { choice }: { choice: SearchResultsPage["results"][number] } =
  await prompts({
    type: "autocomplete",
    name: "choice",
    message: `Which item would you like to download?`,
    choices: movieOrTvChoices,
  });

let detailsResponse = await viaPersistence<TV | Movie | undefined>(
  generateDetailsFilePath(kind, choice.id),
  () => getDetails({ kind, id: choice.id })
);
if (!detailsResponse) {
  throw new Error("Unable to get details!");
}

if (detailsResponse.kind === "movie") {
  const movie = detailsResponse as Movie;

  const jobName = `${movie.title} at ${new Date().toISOString()}`;
  const movieJob: MovieJob = {
    name: jobName,
    kind: "movie",
    query,
    tmdbId: movie.id,
  };
  await save(
    `./data/jobs/${filenamify(jobName, {
      maxLength: 100,
      replacement: "-",
    })}.json`,
    movieJob
  );

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
    console.log(`Located movie`);
  } else {
    console.log(`Unable to locate movie`);
  }
}

if (detailsResponse.kind === "tv") {
  const tv = detailsResponse as TV;

  const { seasons }: { seasons: TV["seasons"] } = await prompts({
    type: "multiselect",
    name: "seasons",
    message: `Which seasons would you like to download?`,
    choices: tv.seasons.map((season) => {
      return {
        title: `${season.season_number}: ${season.name} (${season.air_date})`,
        description: season.overview,
        value: season,
      };
    }),
  });

  const episodes = await prompts(
    seasons.map((season) => {
      return {
        type: "multiselect",
        name: `season-${season.season_number}`,
        message: `Which episodes would you like to download for ${season.name} (${season.season_number})?`,
        choices: Array.from(
          { length: season.episode_count },
          (_, i) => i + 1
        ).map((episodeNo) => {
          return {
            title: `Episode ${episodeNo}`,
            value: episodeNo,
          };
        }),
      };
    })
  );

  const jobName = `${tv.name} at ${new Date().toISOString()}`;
  const tvJob: TVJob = {
    name: jobName,
    kind: "tv",
    query,
    tmdbId: tv.id,
    episodes,
  };
  await save(
    `./data/jobs/${filenamify(jobName, {
      maxLength: 100,
      replacement: "-",
    })}.json`,
    tvJob
  );

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

      console.log(`Located S${seasonNo}E${episodeNo}`);
    }
  }
}

/**
 * Generates a file path for storing search results for the given media kind and search query.
 * The query is filenamified to create a safe filename.
 *
 * @param kind The media kind
 * @param query The search query
 */
function generateSearchFilePath(kind: string, query: string): string {
  return `data/search/${kind}/${filenamify(query, {
    maxLength: 100,
    replacement: "-",
  })}.json`;
}

/**
 * Generates the file path for the details of a specific item based on its kind and ID.
 *
 * @param kind the kind of the item
 * @param id the ID of the item
 * @return the file path for the details of the specified item
 */
function generateDetailsFilePath(kind: string, id: number): string {
  return `data/details/${kind}/${id}.json`;
}

/**
 * Generates the file path for the movie source based on the kind and movie ID.
 *
 * @param kind The kind of source (e.g. 'local', 'remote').
 * @param movieId The ID of the movie.
 * @return The file path for the movie source.
 */
function generateMovieSourceFilePath(kind: string, movieId: number): string {
  return `data/sources/${kind}/${movieId}.json`;
}

/**
 * Generates the file path for the source of a TV episode based on the kind, TV ID, season number, and episode number.
 *
 * @param kind the kind of TV episode source
 * @param tvId the ID of the TV show
 * @param seasonNo the season number of the TV show
 * @param episodeNo the episode number of the TV show
 * @return the file path for the TV episode source
 */
function generateTvEpisodeSourceFilePath(
  kind: string,
  tvId: number,
  seasonNo: number,
  episodeNo: number
): string {
  return `data/sources/${kind}/${tvId}/s${seasonNo}/e${episodeNo}.json`;
}
