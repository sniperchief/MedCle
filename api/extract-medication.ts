// Vercel function: POST /api/extract-medication (same logic as the local Express route).
import Anthropic from "@anthropic-ai/sdk";
import { toWebResponse } from "../server/api-result.ts";
import { requireEnv } from "../server/config.ts";
import { extractMedicationRequest, extractionResult } from "../server/medication-extraction.ts";

export async function POST(request: Request): Promise<Response> {
  const body: unknown = await request.json().catch(() => null);
  const result = await extractionResult(body, (transcript) =>
    extractMedicationRequest(
      new Anthropic({ apiKey: requireEnv("ANTHROPIC_API_KEY", "Anthropic API key") }),
      transcript,
    ),
  );
  return toWebResponse(result);
}
