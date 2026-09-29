import { useCallback, useEffect } from "react";
import { isSpeechSupported, speak, stopSpeaking } from "./speech";

/**
 * Speaks `warning` once when it appears or changes (not on every render) and
 * stops speaking when the warning goes away or the component unmounts.
 */
export function useVoiceWarning(warning: string | null): {
  supported: boolean;
  replay(): void;
  stop(): void;
} {
  useEffect(() => {
    if (!warning) return;
    speak(warning);
    return stopSpeaking;
  }, [warning]);

  const replay = useCallback(() => {
    if (warning) speak(warning);
  }, [warning]);

  return { supported: isSpeechSupported(), replay, stop: stopSpeaking };
}
