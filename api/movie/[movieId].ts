import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleMovieDetailsRequest } from "../_lib/tmdb";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  await handleMovieDetailsRequest(req, res);
}
