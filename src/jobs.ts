export interface Job {
  name: string;
  kind: "movie" | "tv";
  query: string;
  tmdbId: number;
}

export interface MovieJob extends Job {
  kind: "movie";
}

export interface TVJob extends Job {
  kind: "tv";
  episodes: {
    [key: `season-${number}`]: number[];
  };
}
