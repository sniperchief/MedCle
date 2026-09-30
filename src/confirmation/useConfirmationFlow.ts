import { useEffect, useMemo, useSyncExternalStore } from "react";
import type { MedicationRequest } from "../../shared/medication-request";
import { fetchMedicationRequest } from "../extraction/extract-medication";
import { pharmacyRequests } from "../requests/usePharmacyRequests";
import { speak, stopSpeaking } from "../voice/speech";
import { ConfirmationFlow, type ConfirmationDeps, type ConfirmationState } from "./confirmation-flow";
import { listenForReply } from "./listen-for-reply";

export interface Confirmation {
  state: ConfirmationState;
  /** Confirms the request currently read back (the fallback button). */
  confirm(): void;
  /** Reads the request back again and listens for the answer. */
  replay(): void;
}

const browserDeps: ConfirmationDeps = {
  speak(text, onEnd) {
    speak(text, onEnd);
    return stopSpeaking;
  },
  listen: listenForReply,
  extract: fetchMedicationRequest,
  store: pharmacyRequests,
  now: () => new Date(),
  newId: () => crypto.randomUUID(),
};

const noFlow = () => () => {};
const noState = () => null;

/**
 * The voice confirmation of an extracted request. Each new extraction (a new
 * recording, or a retry) starts a new conversation and drops the previous
 * one, so an earlier confirmation can never carry over. Null while there is
 * no extracted request.
 */
export function useConfirmationFlow(
  request: MedicationRequest | null,
  transcript: string,
  deps: ConfirmationDeps = browserDeps,
): Confirmation | null {
  const flow = useMemo(
    () => (request ? new ConfirmationFlow(request, transcript, deps) : null),
    [request, transcript, deps],
  );
  useEffect(() => flow?.attach(), [flow]);
  const state = useSyncExternalStore(flow?.subscribe ?? noFlow, flow?.getState ?? noState);
  return flow && state ? { state, confirm: flow.confirm, replay: flow.replay } : null;
}
