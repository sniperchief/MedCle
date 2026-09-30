import type { TranscriptionError } from "../transcription/errors";
import { TranscriptionSession } from "../transcription/transcription-session";

/** How long to wait for the customer to start answering before giving up. */
export const NO_REPLY_TIMEOUT_MS = 8_000;

/**
 * Records one spoken reply with a new transcription session, which stops by
 * itself when the customer finishes their turn. Call it only once MEDCLE has
 * stopped speaking, so its own voice is never taken as the customer's.
 *
 * Resolves with what was said, or "" if nothing was said within
 * NO_REPLY_TIMEOUT_MS. `onHeard` receives the reply as it is transcribed.
 * Rejects with the transcription error if the session fails, or with an
 * AbortError when `signal` aborts (the session is stopped and its text dropped).
 */
export function listenForReply(
  signal: AbortSignal,
  onHeard: (text: string) => void = () => {},
): Promise<string> {
  return new Promise((resolve, reject) => {
    const turns = new Map<number, string>();
    let failure: TranscriptionError | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const text = () =>
      [...turns]
        .sort(([a], [b]) => a - b)
        .map(([, turn]) => turn)
        .filter(Boolean)
        .join(" ");

    const session = new TranscriptionSession({
      onStatusChange: (status) => {
        if (status === "listening") timer = setTimeout(() => session.stop(), NO_REPLY_TIMEOUT_MS);
      },
      onTurn: (turn) => {
        turns.set(turn.turn_order, turn.transcript.trim());
        const heard = text();
        // The customer has started answering: let them finish.
        if (heard) clearTimeout(timer);
        onHeard(heard);
      },
      onError: (error) => {
        failure = error;
      },
    });

    const abort = () => session.stop();
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });

    void session.run().then(() => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      if (signal.aborted) reject(new DOMException("Stopped listening", "AbortError"));
      else if (failure) reject(failure);
      else resolve(text());
    });
  });
}
