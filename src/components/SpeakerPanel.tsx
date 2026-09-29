import { MedicationRequestView } from "./MedicationRequestView";
import { StatusIndicator } from "./StatusIndicator";
import type { Speaker } from "./useSpeaker";

interface SpeakerPanelProps {
  title: string;
  speaker: Speaker;
}

/** Recording controls, transcripts and extracted request for one speaker. */
export function SpeakerPanel({ title, speaker }: SpeakerPanelProps) {
  const { status, liveTranscript, finalTranscript, errorMessage, start, stop } =
    speaker.transcription;
  const isActive = status === "connecting" || status === "listening" || status === "stopping";
  const headingId = `${title.toLowerCase()}-heading`;

  return (
    <section
      className={`panel${status === "listening" ? " panel--listening" : ""}`}
      aria-labelledby={headingId}
    >
      <header className="panel__header">
        <h2 id={headingId}>{title}</h2>
        <StatusIndicator status={status} />
      </header>

      <div className="panel__controls">
        <button type="button" className="button button--start" onClick={start} disabled={isActive}>
          Start Recording
        </button>
        <button
          type="button"
          className="button button--stop"
          onClick={stop}
          disabled={status !== "connecting" && status !== "listening"}
        >
          Stop Recording
        </button>
      </div>

      {errorMessage && (
        <p className="panel__error" role="alert">
          {errorMessage}
        </p>
      )}

      <h3 className="transcript__label">Live transcript</h3>
      <p className="transcript transcript--live" aria-live="polite">
        {liveTranscript ||
          (status === "listening" ? (
            <span className="transcript__placeholder">Listening for speech…</span>
          ) : (
            <span className="transcript__placeholder">—</span>
          ))}
      </p>

      <h3 className="transcript__label">Final transcript · what was said</h3>
      <p className="transcript transcript--final">
        {finalTranscript || <span className="transcript__placeholder">No transcript yet.</span>}
      </p>

      <MedicationRequestView
        title={title}
        extraction={speaker.extraction}
        onRetry={speaker.retryExtraction}
      />
    </section>
  );
}
