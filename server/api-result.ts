// Route logic returns an ApiResult so the same code serves both the local
// Express server and the Vercel functions in api/.

import type { Response as ExpressResponse } from "express";

export interface ApiResult {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
}

/** Sends a result through Express. */
export function sendResult(res: ExpressResponse, { status, body, headers = {} }: ApiResult): void {
  res.status(status).set(headers).json(body);
}

/** Converts a result into a Web Response (Vercel functions). */
export function toWebResponse({ status, body, headers }: ApiResult): Response {
  return Response.json(body, { status, headers });
}
