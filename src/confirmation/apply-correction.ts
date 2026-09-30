import type { MedicationRequest } from "../../shared/medication-request";
import type { MedicationField } from "../comparison/compare-medication-requests";

const FIELDS = ["medication", "strength", "quantity", "form"] as const satisfies readonly MedicationField[];

export interface CorrectedRequest {
  request: MedicationRequest;
  /** The fields whose value the correction changed. */
  changed: MedicationField[];
}

/**
 * Applies what the customer said in a correction ("No, I said 20 tablets") to
 * the request MEDCLE read back. `correction` is extracted from the correction
 * alone, so a field changes only if the customer restated it; everything else
 * stays as confirmed so far. Returns null when the correction stated nothing.
 */
export function applyCorrection(
  current: MedicationRequest,
  correction: MedicationRequest,
): CorrectedRequest | null {
  const stated = FIELDS.filter((field) => correction[field] !== null);
  if (stated.length === 0) return null;

  const request = { ...current };
  for (const field of stated) request[field] = correction[field];
  return { request, changed: stated.filter((field) => request[field] !== current[field]) };
}
