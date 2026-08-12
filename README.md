# TMDB Movie Images API

Three small Vercel serverless functions. Give each one a TMDB movie ID in
the URL path, and it returns full, ready-to-use image URLs (backdrops,
logos, or posters) for that movie.

## Endpoints

- `GET /api/backdrops/{movieId}`
- `GET /api/logos/{movieId}`
- `GET /api/posters/{movieId}`
- `GET /api/movie/{movieId}`, full movie details

Example request:

```
GET /api/backdrops/550
```

Example response:

```json
{
  "movieId": 550,
  "size": "original",
  "count": 5,
  "backdrops": [
    "https://image.tmdb.org/t/p/original/fCayJrkfRaCRCTh8GqN30f8oyQF.jpg",
    "https://image.tmdb.org/t/p/original/hZkgoQYus5vegHoetLkCJzb17zJ.jpg"
  ]
}
```

The response key matches the endpoint name. `/api/logos/550` returns a
`logos` array, and `/api/posters/550` returns a `posters` array.

`/api/movie/550` calls TMDB's plain movie details endpoint instead of
the images endpoint, so it returns the full movie record: title,
overview, release date, runtime, genres, budget, revenue, and so on.
The two image fields in that response, `backdrop_path` and
`poster_path`, are converted to full URLs the same way the other three
endpoints are. Everything else is passed through from TMDB unchanged.

All endpoints return `original` size images.

## Authentication

Every endpoint requires a header:

```
x-api-token: your_own_secret_token_here
```

Set your own value for this in the `API_TOKEN` environment variable.
This is a token you make up yourself, not something from TMDB. Requests
without a matching header are rejected before any TMDB request is made.

## Setup

1. Get a TMDB API Read Access Token from
   https://www.themoviedb.org/settings/api. This is the long bearer
   token, not the older API key.
2. In your Vercel project settings, add an environment variable named
   `TMDB_READ_ACCESS_TOKEN` set to that token.
3. Add a second environment variable named `API_TOKEN`, set to a secret
   value of your choosing. This is the value callers must send in the
   `x-api-token` header.
4. Deploy. The four endpoints listed above will be live immediately,
   no build step required.

## Local development

```
npm install
cp .env.example .env
```

Fill in your tokens in `.env`, then run:

```
vercel dev
```

Then request, for example with curl:

```
curl -H "x-api-token: your_own_secret_token_here" http://localhost:3000/api/backdrops/550
```

## Errors

- `400`: `movieId` is missing or not a positive integer.
- `401`: the `x-api-token` header is missing or does not match `API_TOKEN`.
- `404`: no movie exists for that ID.
- `405`: request method other than GET.
- `500`: `TMDB_READ_ACCESS_TOKEN` or `API_TOKEN` is not set on the
  server, or the request to TMDB failed for some other reason. The
  response body includes details.

## Project layout and conventions

See `AGENTS.md`.
