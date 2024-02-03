import {
  makeProviders,
  makeStandardFetcher,
  targets,
  type RunnerOptions,
  type RunOutput,
} from "@movie-web/providers";

const fetcher = makeStandardFetcher(fetch);

const providers = makeProviders({
  fetcher,
  target: targets.ANY,
});

// const output = await providers.runAll({
//   media: {
//     type: "show",
//     title: "Ben 10: Alien Force",
//     tmdbId: "6040",
//     season: { number: 1, tmdbId: "x" },
//     episode: { number: 12, tmdbId: "x" },
//     releaseYear: 2008,
//   },
// });

// console.log(JSON.stringify(output, null, 2));

export async function findDownloadSources(media: RunnerOptions["media"]) {
  return providers.runAll({
    media,
  });
}
