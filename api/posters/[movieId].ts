import type { VercelRequest, VercelResponse } from "@vercel/node";
import { handleImageRequest } from "../_lib/tmdb";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  await handleImageRequest(req, res, "posters");
}
