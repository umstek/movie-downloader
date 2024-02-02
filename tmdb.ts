const baseUrl = "https://api.themoviedb.org/3";
const commonOptions = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${process.env.TMDB_API_READ_ACCESS_TOKEN}`,
  },
};

interface MediaItemResult {
  kind: "movie" | "tv";
  adult: boolean;
  backdrop_path: string | null;
  genre_ids: number[];
  id: number;
  original_language: string;
  overview: string;
  popularity: number;
  poster_path: string | null;
  vote_average: number;
  vote_count: number;
}

export interface TVResult extends MediaItemResult {
  kind: "tv";
  origin_country: string[];
  original_name: string;
  first_air_date: string;
  name: string;
}

export interface MovieResult extends MediaItemResult {
  kind: "movie";
  original_title: string;
  release_date: string;
  title: string;
  video: boolean;
}

export interface SearchResultsPage {
  page: number;
  results: MovieResult[] | TVResult[];
  total_pages: number;
  total_results: number;
}

export async function search({
  type,
  query,
}: {
  type: "movie" | "tv";
  query: string;
}) {
  const url = `${baseUrl}/search/${type}?query=${encodeURIComponent(query)}`;

  try {
    const res = await fetch(url, commonOptions);
    const json = (await res.json()) as SearchResultsPage;
    json.results.forEach((result) => {
      result.kind = type;
    });

    return json;
  } catch (err) {
    console.error("error:" + err);
  }
}

interface Genre {
  id: number;
  name: string;
}

interface BelongsToCollection {
  id: number;
  name: string;
  poster_path: string;
  backdrop_path: string;
}

interface ProductionCompany {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

interface ProductionCountry {
  iso_3166_1: string;
  name: string;
}

interface SpokenLanguage {
  english_name: string;
  iso_639_1: string;
  name: string;
}

interface CreatedBy {
  id: number;
  credit_id: string;
  name: string;
  gender: number;
  profile_path: string | null;
}

interface LastEpisodeToAir {
  id: number;
  name: string;
  overview: string;
  vote_average: number;
  vote_count: number;
  air_date: string;
  episode_number: number;
  episode_type: string;
  production_code?: string;
  runtime: number;
  season_number: number;
  show_id: number;
  still_path?: string;
}

interface Network {
  id: number;
  logo_path: string | null;
  name: string;
  origin_country: string;
}

interface Season {
  air_date: string;
  episode_count: number;
  id: number;
  name: string;
  overview?: string;
  poster_path?: string;
  season_number: number;
  vote_average: number;
}

interface MediaItem {
  kind: "movie" | "tv";
  adult: boolean;
  backdrop_path: string;
  genres: Genre[];
  id: number;
  homepage?: string;
  original_language: string;
  overview: string;
  popularity: number;
  poster_path: string;
  production_companies: ProductionCompany[];
  production_countries: ProductionCountry[];
  spoken_languages: SpokenLanguage[];
  status: string;
  vote_average: number;
  vote_count: number;
}

export interface Movie extends MediaItem {
  kind: "movie";
  belongs_to_collection: BelongsToCollection;
  budget: number;
  imdb_id: string;
  original_title: string;
  release_date: string;
  revenue: number;
  runtime: number;
  tagline: string;
  title: string;
  video: boolean;
}

export interface TV extends MediaItem {
  kind: "tv";
  created_by: CreatedBy[];
  episode_run_time: number[];
  first_air_date: string;
  in_production: boolean;
  languages: string[];
  last_air_date: string;
  last_episode_to_air: LastEpisodeToAir;
  name: string;
  next_episode_to_air?: any;
  networks: Network[];
  number_of_episodes: number;
  number_of_seasons: number;
  origin_country: string[];
  original_name: string;
  tagline?: string;
  type: string;
  seasons: Season[];
}

export async function getDetails({
  type,
  id,
}: {
  type: "movie" | "tv";
  id: number;
}) {
  const url = `${baseUrl}/${type}/${id}`;

  try {
    const res = await fetch(url, commonOptions);
    const json = (await res.json()) as Movie | TV;

    return { ...json, kind: type } as Movie | TV;
  } catch (err) {
    console.error("error:" + err);
  }
}
