import enquirer from "enquirer";
import filenamify from "filenamify";

import {
  search,
  type TVResult,
  getDetails,
  type SearchResultsPage,
  type TV,
  type Movie,
} from "../src/tmdb";
import { findDownloadSources } from "../src/mw";
import { viaPersistence } from "./persistence";
import { configPrompt } from "./prompts/configPrompt";

const config = await viaPersistence("./data/config.json", configPrompt);

console.log(config);

const { kind, query } = await enquirer.prompt<{
  kind: "movie" | "tv";
  query: string;
}>([
  {
    type: "select",
    name: "kind",
    message: "What do you want to download?",
    choices: ["movie", "tv"],
  },
  {
    type: "input",
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
    name: result.kind === "tv" ? result.name : result.title,
    message:
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
    hint: result.overview,
    value: result, // [enquirer bug 1], so shows [object Object]
  };
});

const { choice } = await enquirer.prompt<{ choice: TVResult }>({
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

  console.log(`Located movie`);
}

if (detailsResponse.kind === "tv") {
  const tv = detailsResponse as TV;

  const { seasonNos } = await enquirer.prompt<{
    seasonNos: number[];
  }>({
    type: "multiselect",
    name: "seasonNos",
    message: `Which seasons would you like to download?`,
    choices: tv.seasons.map((season) => {
      return {
        name: season.season_number.toFixed(0),
        message: `${season.season_number}: ${season.name} (${season.air_date})`,
        hint: season.overview,
        value: season.season_number,
        // XXX [enquirer bug 2], ignores value altogether and uses name
      };
    }),
  });

  const episodes = await enquirer.prompt<{
    [key: `season-${number}`]: number[];
  }>(
    seasonNos
      .map((seasonNo) => {
        const season = (tv as TV).seasons.find(
          // XXX handle [enquirer bug 2]
          (season) => season.season_number == seasonNo
        );
        if (!season) {
          return undefined;
        }

        return {
          type: "multiselect",
          name: `season-${seasonNo}`,
          message: `Which episodes would you like to download for ${season.name} (${season.season_number})?`,
          choices: Array.from(
            { length: season.episode_count },
            (_, i) => i + 1
          ).map((episodeNo) => {
            return {
              name: episodeNo.toString(),
              message: `Episode ${episodeNo}`,
              value: episodeNo,
            };
          }),
        };
      })
      .filter(Boolean)
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
