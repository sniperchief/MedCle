// MEDCLE's voice output, using the browser's built-in speech synthesis.

let current: SpeechSynthesisUtterance | null = null;

export function isSpeechSupported(): boolean {
  return typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
}

/**
 * Speaks `text`, replacing anything MEDCLE is already saying. `onEnd` runs
 * once MEDCLE has finished speaking, or could not speak at all (so a caller
 * waiting to listen is never stuck), but not when the speech was stopped or
 * replaced. Without speech support, `onEnd` runs right away.
 */
export function speak(text: string, onEnd?: () => void): void {
  if (!isSpeechSupported()) {
    if (onEnd) queueMicrotask(onEnd);
    return;
  }
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en";
  const finish = (finished: boolean) => {
    if (current !== utterance) return; // Stopped or replaced: not an end of speech.
    current = null;
    if (finished) onEnd?.();
  };
  utterance.onend = () => finish(true);
  utterance.onerror = (event) => {
    const stopped = event?.error === "interrupted" || event?.error === "canceled";
    finish(!stopped);
  };
  current = utterance;
  speechSynthesis.speak(utterance);
}

/** Stops MEDCLE's speech, if any is playing or queued. */
export function stopSpeaking(): void {
  if (!current || !isSpeechSupported()) return;
  current = null;
  speechSynthesis.cancel();
}
