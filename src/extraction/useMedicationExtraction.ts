import { useCallback, useEffect, useState } from "react";
import type { MedicationRequest } from "../../shared/medication-request";
import { fetchMedicationRequest } from "./extract-medication";

export type MedicationExtraction =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; request: MedicationRequest }
  | { status: "error" };

/** The finished outcome of one extraction attempt, tagged with what it was for. */
interface Outcome {
  transcript: string;
  attempt: number;
  request: MedicationRequest | null;
}

/**
 * Extracts a medication request from a completed transcript. Pass null while
 * there is no completed transcript (e.g. while the person is still speaking).
 */
export function useMedicationExtraction(transcript: string | null): {
  extraction: MedicationExtraction;
  retry(): void;
} {
  const [attempt, setAttempt] = useState(0);
  const [outcome, setOutcome] = useState<Outcome | null>(null);

  useEffect(() => {
    if (!transcript) return;
    const controller = new AbortController();
    fetchMedicationRequest(transcript, controller.signal).then(
      (request) => setOutcome({ transcript, attempt, request }),
      (error: unknown) => {
        if (controller.signal.aborted) return;
        console.error("[MEDCLE] Medication extraction failed:", error);
        setOutcome({ transcript, attempt, request: null });
      },
    );
    return () => controller.abort();
  }, [transcript, attempt]);

  const retry = useCallback(() => setAttempt((current) => current + 1), []);

  let extraction: MedicationExtraction;
  if (!transcript) {
    extraction = { status: "idle" };
  } else if (outcome?.transcript !== transcript || outcome.attempt !== attempt) {
    extraction = { status: "loading" };
  } else if (outcome.request) {
    extraction = { status: "success", request: outcome.request };
  } else {
    extraction = { status: "error" };
  }
  return { extraction, retry };
}
