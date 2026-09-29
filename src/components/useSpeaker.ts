import {
  useMedicationExtraction,
  type MedicationExtraction,
} from "../extraction/useMedicationExtraction";
import { useTranscription, type Transcription } from "../transcription/useTranscription";

export interface Speaker {
  transcription: Transcription;
  extraction: MedicationExtraction;
  retryExtraction(): void;
}

/** One speaker's transcription and the extraction of their completed transcript. */
export function useSpeaker(): Speaker {
  const transcription = useTranscription();
  const { status, finalTranscript } = transcription;
  // Extract only once the recording has finished and its transcript is final.
  const { extraction, retry } = useMedicationExtraction(
    status === "completed" && finalTranscript ? finalTranscript : null,
  );
  return { transcription, extraction, retryExtraction: retry };
}
