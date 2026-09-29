// MEDCLE's voice output, using the browser's built-in speech synthesis.

let current: SpeechSynthesisUtterance | null = null;

export function isSpeechSupported(): boolean {
  return typeof speechSynthesis !== "undefined" && typeof SpeechSynthesisUtterance !== "undefined";
}

/** Speaks `text`, replacing anything MEDCLE is already saying. Does nothing without speech support. */
export function speak(text: string): void {
  if (!isSpeechSupported()) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = "en";
  utterance.onend = utterance.onerror = () => {
    if (current === utterance) current = null;
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
