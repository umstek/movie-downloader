# movie-downloader

An interactive CLI movie downloader using [@movie-web](https://github.com/movie-web) providers

> [!NOTE]
> This project was created using `bun init` in bun v1.0.25.
> [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
> This project currently needs linux to run; Windows support will be added when
> `bun` is ready.

To install dependencies:

```bash
bun install
```

To run:

```bash
bun run ./src/cli.ts
```

[Screencast from 2024-02-02 20-47-31.webm](https://github.com/umstek/movie-downloader/assets/7861481/f73818e7-f115-45dc-8724-6780f9c3925b)

This doesn't download anything automatically yet, but helps you find the
movies/tv series and download links. Find them in `data/sources` and use your
favorite download manager, maybe a player, or a tool like `yt-dlp` to download
them.
