import type { RequestHandler } from "express";
import { AssemblyAI } from "assemblyai";
import { sendResult, type ApiResult } from "./api-result.ts";

// How long the browser has to open the WebSocket with the token (1–600 s).
const TOKEN_EXPIRES_IN_SECONDS = 60;
// Hard cap on a single recording session, so a forgotten recording can't run for hours.
const MAX_SESSION_DURATION_SECONDS = 600;

/**
 * Mints a single-use AssemblyAI Streaming v3 token so the browser can connect
 * to the streaming WebSocket without ever seeing the permanent API key.
 */
export function createTemporaryToken(apiKey: string): Promise<string> {
  return new AssemblyAI({ apiKey }).streaming.createTemporaryToken({
    expires_in_seconds: TOKEN_EXPIRES_IN_SECONDS,
    max_session_duration_seconds: MAX_SESSION_DURATION_SECONDS,
  });
}

/** POST /api/streaming-token → `{ token }`. Failures are logged, never shown raw. */
export async function streamingTokenResult(createToken: () => Promise<string>): Promise<ApiResult> {
  const headers = { "Cache-Control": "no-store" };
  try {
    return { status: 200, body: { token: await createToken() }, headers };
  } catch (error) {
    console.error(
      "[streaming-token] AssemblyAI token request failed:",
      error instanceof Error ? error.message : error,
    );
    return { status: 502, body: { error: "Could not create a transcription token." }, headers };
  }
}

export function createStreamingTokenHandler(apiKey: string): RequestHandler {
  return async (_req, res) => {
    sendResult(res, await streamingTokenResult(() => createTemporaryToken(apiKey)));
  };
}
