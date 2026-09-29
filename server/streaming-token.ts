import type { RequestHandler } from "express";
import { AssemblyAI } from "assemblyai";

// How long the browser has to open the WebSocket with the token (1–600 s).
const TOKEN_EXPIRES_IN_SECONDS = 60;
// Hard cap on a single recording session, so a forgotten recording can't run for hours.
const MAX_SESSION_DURATION_SECONDS = 600;

/**
 * Mints a single-use AssemblyAI Streaming v3 token so the browser can connect
 * to the streaming WebSocket without ever seeing the permanent API key.
 */
export function createStreamingTokenHandler(apiKey: string): RequestHandler {
  const client = new AssemblyAI({ apiKey });

  return async (_req, res) => {
    res.set("Cache-Control", "no-store");
    try {
      const token = await client.streaming.createTemporaryToken({
        expires_in_seconds: TOKEN_EXPIRES_IN_SECONDS,
        max_session_duration_seconds: MAX_SESSION_DURATION_SECONDS,
      });
      res.json({ token });
    } catch (error) {
      console.error(
        "[streaming-token] AssemblyAI token request failed:",
        error instanceof Error ? error.message : error,
      );
      res.status(502).json({ error: "Could not create a transcription token." });
    }
  };
}
