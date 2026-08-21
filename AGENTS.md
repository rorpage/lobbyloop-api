# AGENTS.md

This file explains the project and the conventions to follow when
working on it. `CLAUDE.md` points here. Read this before making changes.

## What this project does

Four Vercel serverless functions. Each takes a TMDB movie ID from the
URL path. Three call TMDB's images endpoint and return one image type
each (backdrops, logos, posters) as full URLs. The fourth calls TMDB's
plain movie details endpoint and returns the full movie record. See
`README.md` for the endpoint list, request and response examples, and
setup steps.

## File layout

```
api/
  _lib/
    tmdb.ts        shared request handling logic for all four endpoints
  backdrops/
    [movieId].ts   GET /api/backdrops/{movieId}
  logos/
    [movieId].ts   GET /api/logos/{movieId}
  posters/
    [movieId].ts   GET /api/posters/{movieId}
  movie/
    [movieId].ts   GET /api/movie/{movieId}, full movie details
```

Each endpoint file is a thin wrapper. `backdrops`, `logos`, and
`posters` call `handleImageRequest` from `api/_lib/tmdb.ts` with the
image type each is responsible for. `movie` calls
`handleMovieDetailsRequest`, which hits a different TMDB endpoint
(`/movie/{movieId}`, not `/movie/{movieId}/images`) and returns the
full response TMDB gives back, with `backdrop_path` and `poster_path`
converted to full URLs.

Inside `api/_lib/tmdb.ts`, `fetchFromTmdb` holds the logic shared by
every endpoint: the API token check, movie ID validation, the actual
TMDB fetch, and error handling. It takes the TMDB path to call (an
empty string for movie details, `/images` for the images endpoint) and
either returns the parsed data or sends an error response and returns
`null`. Every handler calls it and stops early if it gets `null` back.
This means the request and error handling logic is written once, not
four times.

## Authentication

Every endpoint requires a `x-api-token` header that matches the
`API_TOKEN` environment variable. This is checked first, inside
`fetchFromTmdb`, before movie ID validation or any TMDB request, so an
unauthorized caller never reaches TMDB. The check lives in
`checkApiToken` in `api/_lib/tmdb.ts`. If `API_TOKEN` is not set on the
server, every request fails with a 500 rather than silently allowing
unauthenticated access.

## Filtering by width

The three image endpoints accept an optional `minWidth` query
parameter. `extractMinWidth` in `api/_lib/tmdb.ts` reads it: `null`
means it was absent (no filtering), a number means filter out images
narrower than that, and `undefined` means it was present but not a
non-negative integer, which `handleImageRequest` turns into a 400
response. Filtering happens against the raw `width` field from TMDB,
before `buildImageUrls` converts the images to full URLs.

## Image sizes

All endpoints return `original` size images. This was a deliberate
choice: TMDB does not offer the same set of sizes for every image type.
`w1280` exists only for backdrops. Posters top out at `w780` before
`original`, and logos top out at `w500`. Using `original` for all of
them avoids picking a smaller size that happens to be invalid for one
of the image types. The size is set with the `IMAGE_SIZE` constant in
`api/_lib/tmdb.ts` if this ever needs to change.

## Adding a new image type

TMDB's images endpoint also returns other fields depending on the media
type (for example, `stills` for TV episodes). To add a new one:

1. Add it to the `ImageType` union in `api/_lib/tmdb.ts`.
2. Add the matching field to the `TmdbImagesResponse` interface in that
   same file.
3. Create a new folder under `api/` with a `[movieId].ts` file that
   calls `handleImageRequest(req, res, "yourNewType")`, following the
   pattern in `api/backdrops/[movieId].ts`.

## Environment variables

- `TMDB_READ_ACCESS_TOKEN`, required. The TMDB API Read Access Token
  (bearer token), not the older API key. Get it from
  https://www.themoviedb.org/settings/api. Set it in the Vercel project
  settings for deployed use, or in a local `.env` file for `vercel dev`.
- `API_TOKEN`, required. A secret value you choose yourself. Callers
  must send it in the `x-api-token` header on every request. Set it in
  the Vercel project settings, or in a local `.env` file for
  `vercel dev`.

## My default rules

These apply to this project and to anything else built for me unless I
say otherwise.

- No em dashes anywhere: not in code, comments, commit messages,
  documentation, or chat responses. Use commas, colons, semicolons, or
  separate sentences instead.
- No idioms, figures of speech, or clever phrasing. Say things plainly
  and literally.
- No Unicode ellipsis character. Use three periods if needed, or
  rewrite the sentence.
- TypeScript serverless functions live in an `api/` directory and
  deploy to Vercel with no separate build step.
- No frontend build step. If a UI is added, use plain HTML, CSS, and
  JavaScript with Web Components where structure is needed. Tailwind
  can be pulled in from a CDN if styling needs a utility framework.
  This applies to full page or React Native projects when I have not
  specified TypeScript serverless functions instead.
- For JavaScript or TypeScript tests, use Node's built-in test runner,
  not a third-party test framework like Jest or Mocha, unless I ask for
  one specifically.
- For Python projects, use the standard library only where reasonably
  possible before reaching for a third-party package.
- Every project gets a `CLAUDE.md` file that just points to
  `AGENTS.md`, and an `AGENTS.md` file that documents the project layout,
  conventions, and anything a future session (or a human) would need to
  pick the project back up without re-explaining context.
