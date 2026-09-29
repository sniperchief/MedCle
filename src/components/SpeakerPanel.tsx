import type { TranscriptionStatus } from "../transcription/transcription-session";
import { AlertIcon, MicIcon, StopIcon } from "./icons";
import { MedicationRequestView } from "./MedicationRequestView";
import { ReadbackCard } from "./ReadbackCard";
import { StatusIndicator } from "./StatusIndicator";
import type { Speaker } from "./useSpeaker";

interface SpeakerPanelProps {
  title: string;
  /** Small-caps line above the title describing this speaker's part. */
  eyebrow: string;
  speaker: Speaker;
  /** Read the extracted request back aloud for confirmation (the customer's side). */
  readback?: boolean;
  /** Shows a Hide button for an optional panel. */
  onHide?(): void;
}

const LIVE_PLACEHOLDERS: Partial<Record<TranscriptionStatus, string>> = {
  connecting: "Connecting to the transcription service…",
  listening: "Listening… recording stops by itself after a short pause.",
  stopping: "Finishing the transcript…",
};

/** Recording controls, transcripts and extracted request for one speaker. */
export function SpeakerPanel({
  title,
  eyebrow,
  speaker,
  readback = false,
  onHide,
}: SpeakerPanelProps) {
  const { status, liveTranscript, finalTranscript, errorMessage, start, stop } =
    speaker.transcription;
  const isActive = status === "connecting" || status === "listening" || status === "stopping";
  const headingId = `${title.toLowerCase()}-heading`;

  return (
    <section className={`panel panel--${status}`} aria-labelledby={headingId}>
      <header className="panel__header">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2 id={headingId} className="panel__title">
            {title}
          </h2>
        </div>
        <div className="panel__header-actions">
          <StatusIndicator status={status} />
          {onHide && (
            <button type="button" className="button button--ghost button--small" onClick={onHide}>
              Hide
            </button>
          )}
        </div>
      </header>

      <div className="panel__controls">
        <button type="button" className="button button--primary" onClick={start} disabled={isActive}>
          <MicIcon />
          Start Recording
        </button>
        <button
          type="button"
          className="button button--outline"
          onClick={stop}
          disabled={status !== "connecting" && status !== "listening"}
        >
          <StopIcon />
          Stop Recording
        </button>
      </div>

      {errorMessage && (
        <p className="notice panel__error" role="alert">
          <AlertIcon />
          <span>{errorMessage}</span>
        </p>
      )}

      <div className="block">
        <h3 className="label">Live transcript</h3>
        <p className="transcript transcript--live" aria-live="polite">
          {liveTranscript || (
            <span className="placeholder">
              {LIVE_PLACEHOLDERS[status] ?? "Appears here while recording."}
            </span>
          )}
        </p>
      </div>

      <div className="block">
        <h3 className="label">What was said</h3>
        <p className="transcript transcript--final">
          {finalTranscript || <span className="placeholder">No transcript yet.</span>}
        </p>
      </div>

      <MedicationRequestView
        title={title}
        extraction={speaker.extraction}
        onRetry={speaker.retryExtraction}
      />

      {readback && speaker.extraction.status === "success" && (
        <ReadbackCard request={speaker.extraction.request} onSayAgain={start} />
      )}
    </section>
  );
}
