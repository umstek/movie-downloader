# movie-downloader

An interactive CLI movie downloader using [@movie-web](https://github.com/movie-web) providers.

> [!NOTE]
> This project was created using `bun init` in bun v1.0.25.
> [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
> This project currently needs linux to run; Windows support will be added when
> `bun` is ready.

To install dependencies:

```bash
pnpm install
```

To run:

```bash
pnpm dev
```

You also need to have `yt-dlp` and `ffmpeg` downloaded and added to path.
This can currently download tv series found as files or as HLS streams.

Development tasks:

```bash
pnpm lint         # oxlint
pnpm format       # oxfmt (write)
pnpm typecheck    # TypeScript 7 (tsgo native compiler)
pnpm test         # vitest (offline, mocked)
pnpm bundle       # compile a standalone binary into build/
```

Demo:

[Screencast from 2024-03-10 11-09-11.webm](https://github.com/umstek/movie-downloader/assets/7861481/b84aa136-6f4b-4d23-a6c9-720123596137)
