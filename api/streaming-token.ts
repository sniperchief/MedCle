// Vercel function: POST /api/streaming-token (same logic as the local Express route).
import { toWebResponse } from "../server/api-result.ts";
import { requireEnv } from "../server/config.ts";
import { createTemporaryToken, streamingTokenResult } from "../server/streaming-token.ts";

export async function POST(): Promise<Response> {
  const result = await streamingTokenResult(() =>
    createTemporaryToken(requireEnv("ASSEMBLYAI_API_KEY", "AssemblyAI API key")),
  );
  return toWebResponse(result);
}
