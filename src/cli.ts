import prompts from "prompts";
import filenamify from "filenamify";
import { readdir } from "node:fs/promises";

import {
  search,
  getDetails,
  type SearchResultsPage,
  type TV,
  type Movie,
} from "./tmdb";
import { save, viaPersistence } from "./persistence";
import { configPrompt } from "./prompts/configPrompt";
import type { MovieJob, TVJob } from "./jobs";
import {
  generateDetailsFilePath,
  generateSearchFilePath,
  getConfigPath,
  getJobsPath,
} from "./paths";
import { download } from "./download";

const config = await viaPersistence(getConfigPath(), configPrompt);

try {
  const jobFileNames = await readdir(getJobsPath());
  const { jobFileName } = await prompts({
    type: "select",
    name: "jobFileName",
    message: "Select a job to continue, Ctrl+C to create new one.",
    choices: jobFileNames.map((jobFileName) => {
      return {
        title: jobFileName,
        value: jobFileName,
      };
    }),
  });

  if (jobFileName) {
    const job: MovieJob | TVJob = await Bun.file(
      `data/jobs/${jobFileName}`
    ).json();
    await download(job);
    process.exit(0);
  }
} catch (error) {
  if (error instanceof Error) {
    console.error(error.message);
  }
}

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
}
