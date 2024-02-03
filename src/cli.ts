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

const { type, query } = await enquirer.prompt<{
  type: "movie" | "tv";
  query: string;
}>([
  {
    type: "select",
    name: "type",
    message: "What do you want to download?",
    choices: ["movie", "tv"],
  },
  {
    type: "input",
    name: "query",
    message: "Enter the search query:",
  },
]);

const searchFilePath = `data/search/${type}/${filenamify(query, {
  maxLength: 100,
  replacement: "-",
})}.json`;
let searchResponse = await viaPersistence<SearchResultsPage | undefined>(
  searchFilePath,
  () => search({ type, query })
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

const detailsFilePath = `data/details/${type}/${choice.id}.json`;
let detailsResponse = await viaPersistence<TV | Movie | undefined>(
  detailsFilePath,
  () => getDetails({ type, id: choice.id })
);
if (!detailsResponse) {
  throw new Error("Unable to get details!");
}

if (detailsResponse.kind === "movie") {
  const movie = detailsResponse as Movie;

  const sourcesFilePath = `data/sources/${type}/${movie.id}.json`;
  const releaseYear = Number.parseInt(movie.release_date.slice(0, 4));
  const sources = await viaPersistence<
    Awaited<ReturnType<typeof findDownloadSources>>
  >(sourcesFilePath, () =>
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
    [key: `episodes-${number}`]: number[];
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
          name: `episodes-${seasonNo}`,
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

  for (const [episodesKey, episodeNos] of Object.entries(episodes)) {
    const seasonNo = Number.parseInt(episodesKey.split("-")[1]);
    for (const episodeNo of episodeNos) {
      const sourcesFilePath = `data/sources/${type}/${tv.id}/s${seasonNo}/e${episodeNo}.json`;
      const releaseYear = Number.parseInt(tv.first_air_date.slice(0, 4));
      const sources = await viaPersistence<
        Awaited<ReturnType<typeof findDownloadSources>>
      >(sourcesFilePath, () =>
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
