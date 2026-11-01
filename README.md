# movie-downloader

An interactive CLI movie downloader using [@movie-web](https://github.com/movie-web) providers.

> [!NOTE]
> This project was created using `bun init` in bun v1.0.25.
> [Bun](https://bun.sh) is a fast all-in-one JavaScript runtime.
> This project currently needs linux to run; Windows support will be added when
> `bun` is ready.

## Prerequisites

- Node.js >= 22.13 (required by pnpm 11 and the typechecker)
- pnpm 11.18.0 via corepack (pinned in `packageManager`)
- [Bun](https://bun.sh) — runtime for `pnpm dev` and `pnpm bundle`
- `yt-dlp` and `ffmpeg` downloaded and added to your PATH

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
pnpm typecheck    # TypeScript 7 native compiler (tsc)
pnpm test         # vitest (offline, mocked)
pnpm bundle       # compile a standalone binary into build/
```

Demo:

[Screencast from 2024-03-10 11-09-11.webm](https://github.com/umstek/movie-downloader/assets/7861481/b84aa136-6f4b-4d23-a6c9-720123596137)
