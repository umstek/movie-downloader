import filenamify from "filenamify";

/**
 * Generates a file path for storing search results for the given media kind and search query.
 * The query is filenamified to create a safe filename.
 *
 * @param kind The media kind
 * @param query The search query
 */
export function generateSearchFilePath(kind: string, query: string): string {
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
export function generateDetailsFilePath(kind: string, id: number): string {
  return `data/details/${kind}/${id}.json`;
}

/**
 * Generates the file path for the movie source based on the kind and movie ID.
 *
 * @param kind The kind of source (e.g. 'local', 'remote').
 * @param movieId The ID of the movie.
 * @return The file path for the movie source.
 */
export function generateMovieSourceFilePath(
  kind: string,
  movieId: number
): string {
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
export function generateTvEpisodeSourceFilePath(
  kind: string,
  tvId: number,
  seasonNo: number,
  episodeNo: number
): string {
  return `data/sources/${kind}/${tvId}/s${seasonNo}/e${episodeNo}.json`;
}

export function getConfigPath() {
  return "./data/config.json";
}

export function getJobsPath() {
  return "./data/jobs";
}
