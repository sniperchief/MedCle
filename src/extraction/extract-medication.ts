import type { MedicationRequest } from "../../shared/medication-request";

const EXTRACTION_ENDPOINT = "/api/extract-medication";

/** Asks the server to extract the medication request from a completed transcript. */
export async function fetchMedicationRequest(
  transcript: string,
  signal: AbortSignal,
): Promise<MedicationRequest> {
  const response = await fetch(EXTRACTION_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ transcript }),
    signal,
  });
  if (!response.ok) {
    throw new Error(`Extraction endpoint responded with HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  if (!isMedicationRequest(body)) {
    throw new Error("Extraction endpoint returned an invalid response body");
  }
  return body;
}

function isMedicationRequest(value: unknown): value is MedicationRequest {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (["medication", "strength", "quantity", "form"] as const).every(
    (field) => record[field] === null || typeof record[field] === "string",
  );
}
