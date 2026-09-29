import { TranscriptionError } from "./errors";

const TOKEN_ENDPOINT = "/api/streaming-token";

/** Requests a short-lived, single-use AssemblyAI streaming token from our server. */
export async function fetchStreamingToken(signal: AbortSignal): Promise<string> {
  let response: Response;
  try {
    response = await fetch(TOKEN_ENDPOINT, { method: "POST", signal });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new TranscriptionError("token", { cause: error });
  }

  if (!response.ok) {
    throw new TranscriptionError("token", {
      cause: new Error(`Token endpoint responded with HTTP ${response.status}`),
    });
  }

  const body: unknown = await response.json().catch(() => null);
  const token = (body as { token?: unknown } | null)?.token;
  if (typeof token !== "string" || token.length === 0) {
    throw new TranscriptionError("token", {
      cause: new Error("Token endpoint returned an invalid response body"),
    });
  }
  return token;
}
