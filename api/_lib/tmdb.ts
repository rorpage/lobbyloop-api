import type { VercelRequest, VercelResponse } from "@vercel/node";

export const TMDB_API_BASE = "https://api.themoviedb.org/3";
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export type ImageType = "backdrops" | "logos" | "posters";

// All endpoints return original size images. TMDB does not offer the
// same set of smaller sizes for every image type (w1280 exists only for
// backdrops, for example), so original avoids picking a size that is
// invalid for one of the types.
const IMAGE_SIZE = "original";

interface TmdbImage {
  aspect_ratio: number;
  file_path: string;
  height: number;
  iso_639_1: string | null;
  vote_average: number;
  vote_count: number;
  width: number;
}

interface TmdbImagesResponse {
  id: number;
  backdrops: TmdbImage[];
  logos: TmdbImage[];
  posters: TmdbImage[];
}

// TMDB's movie details response has a large number of fields (title,
// overview, release_date, budget, revenue, genres, and so on). Rather
// than list every one here, this is left as a loose record so the full
// response passes through unchanged, other than the two image path
// fields, which get converted to full URLs.
interface TmdbMovieDetails {
  id: number;
  backdrop_path: string | null;
  poster_path: string | null;
  [key: string]: unknown;
}

function checkApiToken(req: VercelRequest, res: VercelResponse): boolean {
  const expectedToken = process.env.API_TOKEN;
  if (!expectedToken) {
    res.status(500).json({
      error: "API_TOKEN is not set on the server.",
    });
    return false;
  }

  const providedToken = req.headers["x-api-token"];

  if (!providedToken || providedToken !== expectedToken) {
    res.status(401).json({
      error: "Missing or invalid x-api-token header.",
    });
    return false;
  }

  return true;
}

function extractMovieId(req: VercelRequest): string | null {
  const movieIdParam = req.query.movieId;
  const movieId = Array.isArray(movieIdParam) ? movieIdParam[0] : movieIdParam;

  if (!movieId || !/^\d+$/.test(movieId)) {
    return null;
  }
  return movieId;
}

function buildImageUrl(filePath: string): string {
  return `${TMDB_IMAGE_BASE}/${IMAGE_SIZE}${filePath}`;
}

function buildImageUrls(images: TmdbImage[]): string[] {
  return images.map((image) => buildImageUrl(image.file_path));
}

// Validates the request and calls the given TMDB movie endpoint, where
// tmdbPath is appended after /movie/{movieId}. Pass an empty string for
// movie details, or "/images" for the images endpoint. Returns the
// parsed JSON, or null if it already sent an error response. Callers
// should stop as soon as they get null back.
async function fetchFromTmdb<T>(
  req: VercelRequest,
  res: VercelResponse,
  tmdbPath: string
): Promise<T | null> {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Only GET requests are allowed." });
    return null;
  }

  if (!checkApiToken(req, res)) {
    return null;
  }

  const readAccessToken = process.env.TMDB_READ_ACCESS_TOKEN;
  if (!readAccessToken) {
    res.status(500).json({
      error: "TMDB_READ_ACCESS_TOKEN is not set on the server.",
    });
    return null;
  }

  const movieId = extractMovieId(req);
  if (!movieId) {
    res.status(400).json({
      error: "movieId must be a positive integer in the URL path, for example /api/movie/550.",
    });
    return null;
  }

  try {
    const tmdbResponse = await fetch(
      `${TMDB_API_BASE}/movie/${movieId}${tmdbPath}`,
      {
        headers: {
          Authorization: `Bearer ${readAccessToken}`,
          Accept: "application/json",
        },
      }
    );

    if (tmdbResponse.status === 404) {
      res.status(404).json({ error: `No movie found for ID ${movieId}.` });
      return null;
    }

    if (!tmdbResponse.ok) {
      const errorBody = await tmdbResponse.text();
      res.status(tmdbResponse.status).json({
        error: "TMDB returned an error.",
        details: errorBody,
      });
      return null;
    }

    return (await tmdbResponse.json()) as T;
  } catch (error) {
    res.status(500).json({
      error: "Request to TMDB failed.",
      details: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// Used by /api/backdrops/{movieId}, /api/logos/{movieId}, and
// /api/posters/{movieId}. Returns just one image type.
export async function handleImageRequest(
  req: VercelRequest,
  res: VercelResponse,
  imageType: ImageType
): Promise<void> {
  const data = await fetchFromTmdb<TmdbImagesResponse>(req, res, "/images");
  if (!data) {
    return;
  }

  const images = buildImageUrls(data[imageType]);

  res.status(200).json({
    movieId: data.id,
    size: IMAGE_SIZE,
    count: images.length,
    [imageType]: images,
  });
}

// Used by /api/movie/{movieId}. Calls TMDB's plain movie details
// endpoint (not the images endpoint) and returns the full response,
// with backdrop_path and poster_path converted to full URLs.
export async function handleMovieDetailsRequest(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  const data = await fetchFromTmdb<TmdbMovieDetails>(
    req,
    res,
    "?append_to_response=credits"
  );
  if (!data) {
    return;
  }

  res.status(200).json({
    ...data,
    backdrop_path: data.backdrop_path ? buildImageUrl(data.backdrop_path) : null,
    poster_path: data.poster_path ? buildImageUrl(data.poster_path) : null,
  });
}
